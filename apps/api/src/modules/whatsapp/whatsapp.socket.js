const { whatsappManager } = require('../../../../../packages/whatsapp');
const { prisma } = require('../../config/database');

/**
 * Setup WhatsApp events → Socket.IO bridge
 * This connects WhatsApp events to real-time Socket.IO updates
 */
function setupWhatsAppEvents(io) {
    // QR Code generated
    whatsappManager.on('qr', async ({ userId, sessionId, qr }) => {
        console.log(`[WS] Emitting QR for user ${userId}`);

        // Update DB
        await prisma.whatsAppSession.update({
            where: { id: sessionId },
            data: { status: 'QR_READY', qrCode: qr },
        });

        // Emit to user's room
        io.to(`user:${userId}`).emit('whatsapp:qr', { sessionId, qr });
    });

    // Session ready (connected)
    whatsappManager.on('ready', async ({ userId, sessionId, phone }) => {
        console.log(`[WS] Session ${sessionId} connected for user ${userId}`);

        await prisma.whatsAppSession.update({
            where: { id: sessionId },
            data: { status: 'CONNECTED', phone, qrCode: null },
        });

        io.to(`user:${userId}`).emit('whatsapp:ready', { sessionId, phone });
    });

    // Session disconnected
    whatsappManager.on('disconnected', async ({ userId, sessionId, reason }) => {
        console.log(`[WS] Session ${sessionId} disconnected for user ${userId}`);

        try {
            await prisma.whatsAppSession.update({
                where: { id: sessionId },
                data: { status: 'DISCONNECTED' },
            });
        } catch (e) {
            // Session might have been deleted
        }

        io.to(`user:${userId}`).emit('whatsapp:disconnected', { sessionId, reason });
    });

    // Incoming message
    whatsappManager.on('message', async ({ userId, sessionId, from, body, timestamp }) => {
        console.log(`[WS] New message for user ${userId} from ${from}`);

        try {
            const phone = from.replace(/@c\.us$/, '').replace(/@lid$/, '').replace(/@g\.us$/, '');

            // Find or create contact
            let contact = await prisma.contact.findFirst({
                where: { userId, phone },
            });

            if (!contact) {
                contact = await prisma.contact.create({
                    data: { userId, phone },
                });
            }

            // Save message
            const message = await prisma.message.create({
                data: {
                    sessionId,
                    contactId: contact.id,
                    direction: 'INBOUND',
                    body: body || '',
                    status: 'DELIVERED',
                    timestamp: new Date(timestamp * 1000),
                },
                include: {
                    contact: true,
                },
            });

            // Emit to user
            io.to(`user:${userId}`).emit('whatsapp:message', {
                sessionId,
                message,
            });

            // Check automations
            await processAutomations(userId, sessionId, from, body);
        } catch (err) {
            console.error('[WS] Error processing incoming message:', err);
        }
    });

    // Auth failure
    whatsappManager.on('auth_failure', async ({ userId, sessionId, error }) => {
        await prisma.whatsAppSession.update({
            where: { id: sessionId },
            data: { status: 'DISCONNECTED' },
        });

        io.to(`user:${userId}`).emit('whatsapp:error', {
            sessionId,
            error: 'Authentication failed',
        });
    });

    console.log('[WhatsApp] Event listeners configured');
}

/**
 * Process automations for incoming messages
 */
async function processAutomations(userId, sessionId, from, body) {
    if (!body) return;

    try {
        const automations = await prisma.automation.findMany({
            where: { userId, enabled: true },
            orderBy: { priority: 'desc' },
        });

        for (const auto of automations) {
            let matched = false;

            switch (auto.matchType) {
                case 'EXACT':
                    matched = body.toLowerCase() === auto.trigger.toLowerCase();
                    break;
                case 'CONTAINS':
                    matched = body.toLowerCase().includes(auto.trigger.toLowerCase());
                    break;
                case 'STARTS_WITH':
                    matched = body.toLowerCase().startsWith(auto.trigger.toLowerCase());
                    break;
                case 'REGEX':
                    try {
                        const regex = new RegExp(auto.trigger, 'i');
                        matched = regex.test(body);
                    } catch (e) { }
                    break;
            }

            if (matched) {
                console.log(`[Automation] Triggered: "${auto.name}" for message: "${body}"`);

                // Send auto-reply
                try {
                    await whatsappManager.sendMessage(sessionId, from, auto.response);

                    // Save auto-reply as outbound message
                    const phone = from.replace(/@c\.us$/, '').replace(/@lid$/, '').replace(/@g\.us$/, '');
                    const contact = await prisma.contact.findFirst({
                        where: { userId, phone },
                    });

                    await prisma.message.create({
                        data: {
                            sessionId,
                            contactId: contact?.id,
                            direction: 'OUTBOUND',
                            body: auto.response,
                            status: 'SENT',
                        },
                    });
                } catch (err) {
                    console.error('[Automation] Error sending auto-reply:', err);
                }

                break; // Only first matching automation
            }
        }
    } catch (err) {
        console.error('[Automation] Error processing:', err);
    }
}

module.exports = { setupWhatsAppEvents };
