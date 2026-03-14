const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const EventEmitter = require('events');
const path = require('path');
const fs = require('fs');

class WhatsAppManager extends EventEmitter {
    constructor() {
        super();
        this.sessions = new Map();
        this.sessionPath = path.resolve(process.cwd(), 'whatsapp-sessions');
        this.recentMessageIds = new Map();

        // Cleanup dedupe cache periodically
        setInterval(() => {
            const now = Date.now();
            for (const [id, ts] of this.recentMessageIds.entries()) {
                if (now - ts > 2 * 60 * 1000) {
                    this.recentMessageIds.delete(id);
                }
            }
        }, 60 * 1000).unref();
    }

    getSessionDir() {
        if (!fs.existsSync(this.sessionPath)) {
            fs.mkdirSync(this.sessionPath, { recursive: true });
        }
        return this.sessionPath;
    }

    /**
     * Remove session folder from disk
     */
    removeSessionFiles(sessionId) {
        const folder = path.join(this.sessionPath, `session-${sessionId}`);
        if (fs.existsSync(folder)) {
            fs.rmSync(folder, { recursive: true, force: true });
            console.log(`[WhatsApp] Cleaned session folder: session-${sessionId}`);
        }
    }

    /**
     * Clean up orphaned session folders that don't exist in DB
     */
    async cleanOrphanedSessions(activeSessionIds) {
        try {
            const sessDir = this.getSessionDir();
            const folders = fs.readdirSync(sessDir).filter(f =>
                f.startsWith('session-') && fs.statSync(path.join(sessDir, f)).isDirectory()
            );

            let cleaned = 0;
            for (const folder of folders) {
                const id = folder.replace('session-', '');
                if (!activeSessionIds.includes(id)) {
                    fs.rmSync(path.join(sessDir, folder), { recursive: true, force: true });
                    cleaned++;
                    console.log(`[WhatsApp] Removed orphaned folder: ${folder}`);
                }
            }
            if (cleaned > 0) {
                console.log(`[WhatsApp] Cleaned ${cleaned} orphaned session folder(s)`);
            }
        } catch (err) {
            console.error('[WhatsApp] Error cleaning orphaned sessions:', err.message);
        }
    }

    async createSession(userId, sessionId) {
        if (this.sessions.has(sessionId)) {
            console.log(`[WhatsApp] Session ${sessionId} already exists`);
            return;
        }

        const sessDir = this.getSessionDir();
        console.log(`[WhatsApp] Initializing session ${sessionId}...`);
        const startTime = Date.now();

        const client = new Client({
            authStrategy: new LocalAuth({
                clientId: sessionId,
                dataPath: sessDir,
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
                    '--single-process',
                    '--disable-gpu',
                    '--disable-extensions',
                    '--disable-background-networking',
                    '--disable-default-apps',
                    '--disable-sync',
                    '--disable-translate',
                    '--metrics-recording-only',
                    '--mute-audio',
                    '--no-default-browser-check',
                    '--disable-backgrounding-occluded-windows',
                    '--disable-renderer-backgrounding',
                    '--disable-background-timer-throttling',
                    '--disable-ipc-flooding-protection',
                    '--disable-features=site-per-process',
                    '--js-flags=--max-old-space-size=128',
                ],
            },
            qrMaxRetries: 5,
        });

        client.on('qr', async (qr) => {
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            console.log(`[WhatsApp] QR generated for ${sessionId} in ${elapsed}s`);
            try {
                const qrDataUrl = await qrcode.toDataURL(qr);
                this.emit('qr', { userId, sessionId, qr: qrDataUrl });
            } catch (err) {
                console.error(`[WhatsApp] Error generating QR:`, err);
            }
        });

        client.on('ready', () => {
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            console.log(`[WhatsApp] Session ${sessionId} ready in ${elapsed}s`);
            const info = client.info;
            this.emit('ready', {
                userId,
                sessionId,
                phone: info?.wid?.user || null,
            });
        });

        client.on('authenticated', () => {
            console.log(`[WhatsApp] Session ${sessionId} authenticated`);
            this.emit('authenticated', { userId, sessionId });
        });

        client.on('auth_failure', (msg) => {
            console.error(`[WhatsApp] Auth failure for session ${sessionId}:`, msg);
            this.sessions.delete(sessionId);
            this.removeSessionFiles(sessionId);
            this.emit('auth_failure', { userId, sessionId, error: msg });
        });

        client.on('disconnected', (reason) => {
            console.log(`[WhatsApp] Session ${sessionId} disconnected:`, reason);
            this.sessions.delete(sessionId);
            this.emit('disconnected', { userId, sessionId, reason });
        });

        const forwardIncomingMessage = async (message) => {
            const msgId = message?.id?._serialized;
            if (msgId) {
                if (this.recentMessageIds.has(msgId)) return;
                this.recentMessageIds.set(msgId, Date.now());
            }

            if (
                message.fromMe ||
                message.from === 'status@broadcast' ||
                message.from.endsWith('@g.us') ||
                message.from.endsWith('@broadcast') ||
                message.type === 'revoked' ||
                (!message.body && !message.hasMedia)
            ) {
                return;
            }

            let realPhone = message.from;
            let contactName = null;
            try {
                const contact = await message.getContact();
                if (contact) {
                    if (contact.number) realPhone = `${contact.number}@c.us`;
                    contactName = contact.name || contact.pushname || null;
                }
            } catch (err) {
                console.error('[WhatsApp] Error fetching contact details:', err.message);
            }

            this.emit('message', {
                userId,
                sessionId,
                from: realPhone,
                originalFrom: message.from,
                contactName,
                to: message.to,
                body: message.body,
                timestamp: message.timestamp,
                hasMedia: message.hasMedia,
                type: message.type,
                raw: message,
            });
        };

        // In some WhatsApp-web versions message_create is more reliable for inbound sync.
        client.on('message', forwardIncomingMessage);
        client.on('message_create', forwardIncomingMessage);

        client.on('message_ack', (message, ack) => {
            this.emit('message_ack', {
                userId,
                sessionId,
                messageId: message.id._serialized,
                ack,
            });
        });

        this.sessions.set(sessionId, { client, userId });

        try {
            await client.initialize();
        } catch (err) {
            console.error(`[WhatsApp] Error initializing session ${sessionId}:`, err.message);
            this.sessions.delete(sessionId);
            this.removeSessionFiles(sessionId);
            this.emit('error', { userId, sessionId, error: err.message });
        }
    }

    /**
     * Send a message through a specific session
     * @param {string} sessionId 
     * @param {string} to - Phone number with country code (e.g., '521234567890@c.us' or '521234567890@lid')
     * @param {string} message 
     * @param {string} mediaMimeType
     * @param {string} mediaName
     * @returns {Promise<object>}
     */
    async sendMessage(sessionId, to, message, mediaBase64, mediaMimeType, mediaName) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found or not connected`);
        }

        // Ensure proper WhatsApp ID format
        // WhatsApp has two formats: @c.us (phone numbers) and @lid (Linked IDs)
        // We need to try the right format for the contact
        let chatId;
        if (to.includes('@c.us') || to.includes('@lid') || to.includes('@g.us')) {
            chatId = to;
        } else {
            chatId = `${to}@c.us`;
        }

        console.log(`[WhatsApp] Sending message to: ${chatId} via session ${sessionId}`);

        let content = message || '';
        let options = {};
        if (mediaBase64 && mediaMimeType) {
            content = new MessageMedia(mediaMimeType, mediaBase64, mediaName || 'file');
            if (message) options.caption = message;
        }

        try {
            const sentMessage = await session.client.sendMessage(chatId, content, options);
            console.log(`[WhatsApp] Message sent successfully to ${chatId}`);
            return {
                id: sentMessage.id._serialized,
                to: chatId,
                body: message,
                mediaUrl: null, // we will return the assigned URL from the routes controller
                timestamp: sentMessage.timestamp,
            };
        } catch (err) {
            // If sending with @c.us fails with "No LID for user", try with @lid format
            if (err.message?.includes('No LID') && chatId.includes('@c.us')) {
                const lidChatId = chatId.replace('@c.us', '@lid');
                console.log(`[WhatsApp] Retrying with LID format: ${lidChatId}`);
                try {
                    const sentMessage = await session.client.sendMessage(lidChatId, content, options);
                    console.log(`[WhatsApp] Message sent successfully to ${lidChatId}`);
                    return {
                        id: sentMessage.id._serialized,
                        to: lidChatId,
                        body: message,
                        mediaUrl: null,
                        timestamp: sentMessage.timestamp,
                    };
                } catch (retryErr) {
                    console.error(`[WhatsApp] Retry with @lid also failed:`, retryErr.message || retryErr);
                    throw retryErr;
                }
            }
            console.error(`[WhatsApp] Error sending message to ${chatId}:`, err.message || err);
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
                console.error(`[WhatsApp] Error destroying session ${sessionId}:`, err.message);
            }
            this.sessions.delete(sessionId);
        }
        // Always clean up session files from disk
        this.removeSessionFiles(sessionId);
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
