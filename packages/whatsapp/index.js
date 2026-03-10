const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const EventEmitter = require('events');
const path = require('path');
const fs = require('fs');

class WhatsAppManager extends EventEmitter {
    constructor() {
        super();
        this.sessions = new Map(); // userId -> Client instance
    }

    /**
     * Create a new WhatsApp session for a user
     * @param {string} userId 
     * @param {string} sessionId 
     * @returns {Promise<void>}
     */
    async createSession(userId, sessionId) {
        if (this.sessions.has(sessionId)) {
            console.log(`[WhatsApp] Session ${sessionId} already exists`);
            return;
        }

        const sessionPath = path.resolve(process.cwd(), 'whatsapp-sessions');
        if (!fs.existsSync(sessionPath)) {
            fs.mkdirSync(sessionPath, { recursive: true });
        }

        const client = new Client({
            authStrategy: new LocalAuth({
                clientId: sessionId,
                dataPath: sessionPath,
            }),
            puppeteer: {
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu',
                ],
            },
        });

        // QR Code event
        client.on('qr', async (qr) => {
            console.log(`[WhatsApp] QR received for session ${sessionId}`);
            try {
                const qrDataUrl = await qrcode.toDataURL(qr);
                this.emit('qr', { userId, sessionId, qr: qrDataUrl });
            } catch (err) {
                console.error(`[WhatsApp] Error generating QR:`, err);
            }
        });

        // Ready event
        client.on('ready', () => {
            console.log(`[WhatsApp] Session ${sessionId} is ready!`);
            const info = client.info;
            this.emit('ready', {
                userId,
                sessionId,
                phone: info?.wid?.user || null,
            });
        });

        // Authentication success
        client.on('authenticated', () => {
            console.log(`[WhatsApp] Session ${sessionId} authenticated`);
            this.emit('authenticated', { userId, sessionId });
        });

        // Authentication failure
        client.on('auth_failure', (msg) => {
            console.error(`[WhatsApp] Auth failure for session ${sessionId}:`, msg);
            this.emit('auth_failure', { userId, sessionId, error: msg });
        });

        // Disconnected
        client.on('disconnected', (reason) => {
            console.log(`[WhatsApp] Session ${sessionId} disconnected:`, reason);
            this.sessions.delete(sessionId);
            this.emit('disconnected', { userId, sessionId, reason });
        });

        // Incoming message
        client.on('message', (message) => {
            // Filter out status broadcasts, group messages, and system messages
            if (
                message.from === 'status@broadcast' ||
                message.from.endsWith('@g.us') ||
                message.from.endsWith('@broadcast') ||
                message.type === 'revoked' ||
                !message.body
            ) {
                return; // Ignore non-chat messages
            }

            console.log(`[WhatsApp] Message received in session ${sessionId} from ${message.from}`);
            this.emit('message', {
                userId,
                sessionId,
                from: message.from,
                to: message.to,
                body: message.body,
                timestamp: message.timestamp,
                hasMedia: message.hasMedia,
                type: message.type,
                raw: message,
            });
        });

        // Message acknowledgement (sent/delivered/read)
        client.on('message_ack', (message, ack) => {
            this.emit('message_ack', {
                userId,
                sessionId,
                messageId: message.id._serialized,
                ack,
            });
        });

        // Store client
        this.sessions.set(sessionId, { client, userId });

        // Initialize
        try {
            await client.initialize();
        } catch (err) {
            console.error(`[WhatsApp] Error initializing session ${sessionId}:`, err);
            this.sessions.delete(sessionId);
            this.emit('error', { userId, sessionId, error: err.message });
        }
    }

    /**
     * Send a message through a specific session
     * @param {string} sessionId 
     * @param {string} to - Phone number with country code (e.g., '521234567890@c.us')
     * @param {string} message 
     * @returns {Promise<object>}
     */
    async sendMessage(sessionId, to, message) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found or not connected`);
        }

        // Ensure proper WhatsApp ID format
        const chatId = to.includes('@c.us') ? to : `${to}@c.us`;

        try {
            const sentMessage = await session.client.sendMessage(chatId, message);
            return {
                id: sentMessage.id._serialized,
                to: chatId,
                body: message,
                timestamp: sentMessage.timestamp,
            };
        } catch (err) {
            console.error(`[WhatsApp] Error sending message:`, err);
            throw err;
        }
    }

    /**
     * Get session status
     * @param {string} sessionId 
     * @returns {string}
     */
    getSessionStatus(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) return 'DISCONNECTED';

        const state = session.client.pupPage
            ? 'CONNECTED'
            : 'CONNECTING';
        return state;
    }

    /**
     * Disconnect a session
     * @param {string} sessionId 
     */
    async disconnectSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (session) {
            try {
                await session.client.destroy();
            } catch (err) {
                console.error(`[WhatsApp] Error destroying session ${sessionId}:`, err);
            }
            this.sessions.delete(sessionId);
        }
    }

    /**
     * Get all active sessions
     * @returns {Array}
     */
    getActiveSessions() {
        return Array.from(this.sessions.entries()).map(([id, { userId }]) => ({
            sessionId: id,
            userId,
            status: this.getSessionStatus(id),
        }));
    }

    /**
     * Disconnect all sessions
     */
    async disconnectAll() {
        for (const [sessionId] of this.sessions) {
            await this.disconnectSession(sessionId);
        }
    }
}

// Singleton instance
const whatsappManager = new WhatsAppManager();

module.exports = { WhatsAppManager, whatsappManager };
