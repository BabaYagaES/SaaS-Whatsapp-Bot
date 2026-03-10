const express = require('express');
const { prisma } = require('../../config/database');
const { authenticate } = require('../../middlewares/auth.middleware');
const { checkSessionLimit, checkMessageLimit } = require('../../middlewares/plan.middleware');
const { whatsappManager } = require('../../../../../packages/whatsapp');

const router = express.Router();

router.use(authenticate);

// ==========================================
// POST /api/whatsapp/sessions - Create new session & get QR
// ==========================================
router.post('/sessions', checkSessionLimit, async (req, res) => {
    try {
        const { sessionName } = req.body;

        if (!sessionName) {
            return res.status(400).json({ error: { message: 'Session name is required' } });
        }

        // Create session in DB
        const session = await prisma.whatsAppSession.create({
            data: {
                userId: req.user.id,
                sessionName,
                status: 'CONNECTING',
            },
        });

        // Initialize WhatsApp client
        await whatsappManager.createSession(req.user.id, session.id);

        res.status(201).json({
            message: 'Session created, waiting for QR code...',
            session: {
                id: session.id,
                sessionName: session.sessionName,
                status: session.status,
            },
        });
    } catch (err) {
        console.error('[WhatsApp] Create session error:', err);
        res.status(500).json({ error: { message: 'Error creating session' } });
    }
});

// ==========================================
// GET /api/whatsapp/sessions - List user sessions
// ==========================================
router.get('/sessions', async (req, res) => {
    try {
        const sessions = await prisma.whatsAppSession.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                sessionName: true,
                status: true,
                phone: true,
                createdAt: true,
                _count: {
                    select: { messages: true },
                },
            },
        });

        res.json({ sessions });
    } catch (err) {
        console.error('[WhatsApp] List sessions error:', err);
        res.status(500).json({ error: { message: 'Error fetching sessions' } });
    }
});

// ==========================================
// GET /api/whatsapp/sessions/:id - Get session details
// ==========================================
router.get('/sessions/:id', async (req, res) => {
    try {
        const session = await prisma.whatsAppSession.findFirst({
            where: {
                id: req.params.id,
                userId: req.user.id,
            },
            include: {
                _count: { select: { messages: true } },
            },
        });

        if (!session) {
            return res.status(404).json({ error: { message: 'Session not found' } });
        }

        res.json({ session });
    } catch (err) {
        console.error('[WhatsApp] Get session error:', err);
        res.status(500).json({ error: { message: 'Error fetching session' } });
    }
});

// ==========================================
// DELETE /api/whatsapp/sessions/:id - Disconnect & delete session
// ==========================================
router.delete('/sessions/:id', async (req, res) => {
    try {
        const session = await prisma.whatsAppSession.findFirst({
            where: {
                id: req.params.id,
                userId: req.user.id,
            },
        });

        if (!session) {
            return res.status(404).json({ error: { message: 'Session not found' } });
        }

        // Disconnect WhatsApp client
        await whatsappManager.disconnectSession(session.id);

        // Delete from DB
        await prisma.whatsAppSession.delete({ where: { id: session.id } });

        res.json({ message: 'Session disconnected and deleted' });
    } catch (err) {
        console.error('[WhatsApp] Delete session error:', err);
        res.status(500).json({ error: { message: 'Error deleting session' } });
    }
});

// ==========================================
// POST /api/whatsapp/sessions/:id/send - Send message
// ==========================================
router.post('/sessions/:id/send', checkMessageLimit, async (req, res) => {
    try {
        const { to, message } = req.body;

        if (!to || !message) {
            return res.status(400).json({ error: { message: 'to and message are required' } });
        }

        const session = await prisma.whatsAppSession.findFirst({
            where: {
                id: req.params.id,
                userId: req.user.id,
            },
        });

        if (!session) {
            return res.status(404).json({ error: { message: 'Sesión no encontrada' } });
        }

        // Check if the session is actually active in WhatsApp memory
        const isActiveInMemory = whatsappManager.sessions.has(session.id);

        if (!isActiveInMemory) {
            // Session exists in DB but not in memory - attempt auto-reconnect
            if (session.status === 'CONNECTED') {
                console.log(`[WhatsApp] Session ${session.id} is CONNECTED in DB but not in memory. Attempting reconnect...`);

                try {
                    await whatsappManager.createSession(req.user.id, session.id);

                    // Wait a bit for initialization
                    await new Promise(resolve => setTimeout(resolve, 5000));

                    // Check again
                    if (!whatsappManager.sessions.has(session.id)) {
                        // Reconnect is still in progress or failed
                        await prisma.whatsAppSession.update({
                            where: { id: session.id },
                            data: { status: 'RECONNECTING' },
                        });

                        return res.status(503).json({
                            error: {
                                message: 'La sesión de WhatsApp se está reconectando. Espera unos segundos e intenta de nuevo.',
                                code: 'SESSION_RECONNECTING',
                            },
                        });
                    }
                } catch (reconnectErr) {
                    console.error('[WhatsApp] Auto-reconnect failed:', reconnectErr);

                    await prisma.whatsAppSession.update({
                        where: { id: session.id },
                        data: { status: 'DISCONNECTED' },
                    });

                    return res.status(503).json({
                        error: {
                            message: 'La sesión de WhatsApp se desconectó. Ve a WhatsApp y reconecta escaneando el código QR.',
                            code: 'SESSION_DISCONNECTED',
                        },
                    });
                }
            } else {
                return res.status(400).json({
                    error: {
                        message: `La sesión no está conectada (estado: ${session.status}). Ve a WhatsApp y conecta escaneando el código QR.`,
                        code: 'SESSION_NOT_CONNECTED',
                    },
                });
            }
        }

        // Send via WhatsApp
        const result = await whatsappManager.sendMessage(session.id, to, message);

        // Find or create contact
        const phone = to.replace('@c.us', '');
        let contact = await prisma.contact.findFirst({
            where: { userId: req.user.id, phone },
        });

        if (!contact) {
            contact = await prisma.contact.create({
                data: { userId: req.user.id, phone },
            });
        }

        // Save message to DB
        const savedMessage = await prisma.message.create({
            data: {
                sessionId: session.id,
                contactId: contact.id,
                direction: 'OUTBOUND',
                body: message,
                status: 'SENT',
            },
        });

        res.json({
            message: 'Message sent',
            data: savedMessage,
        });
    } catch (err) {
        console.error('[WhatsApp] Send message error:', err.message);

        // If the error is about session not found in manager, give a clear message
        if (err.message?.includes('not found') || err.message?.includes('not connected')) {
            return res.status(503).json({
                error: {
                    message: 'La sesión de WhatsApp no está activa. Ve a WhatsApp y reconecta.',
                    code: 'SESSION_INACTIVE',
                },
            });
        }

        res.status(500).json({ error: { message: 'Error al enviar el mensaje: ' + err.message } });
    }
});

// ==========================================
// GET /api/whatsapp/sessions/:id/status - Check real session status
// ==========================================
router.get('/sessions/:id/status', async (req, res) => {
    try {
        const session = await prisma.whatsAppSession.findFirst({
            where: {
                id: req.params.id,
                userId: req.user.id,
            },
        });

        if (!session) {
            return res.status(404).json({ error: { message: 'Session not found' } });
        }

        const isActiveInMemory = whatsappManager.sessions.has(session.id);
        const realStatus = isActiveInMemory ? whatsappManager.getSessionStatus(session.id) : 'DISCONNECTED';

        // Sync DB status if needed
        if (session.status === 'CONNECTED' && !isActiveInMemory) {
            await prisma.whatsAppSession.update({
                where: { id: session.id },
                data: { status: 'DISCONNECTED' },
            });
        }

        res.json({
            sessionId: session.id,
            dbStatus: session.status,
            realStatus,
            isActive: isActiveInMemory,
        });
    } catch (err) {
        console.error('[WhatsApp] Status check error:', err);
        res.status(500).json({ error: { message: 'Error checking session status' } });
    }
});

module.exports = router;
