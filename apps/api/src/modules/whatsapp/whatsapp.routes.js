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
            return res.status(400).json({ error: { message: 'Se requiere destinatario y mensaje' } });
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
            // Session is in DB but NOT in memory (server restarted, etc.)
            // Update DB to reflect real status
            if (session.status === 'CONNECTED') {
                await prisma.whatsAppSession.update({
                    where: { id: session.id },
                    data: { status: 'DISCONNECTED' },
                });
            }

            return res.status(400).json({
                error: {
                    message: 'Tu sesión de WhatsApp se desconectó. Ve a la sección WhatsApp y reconecta escaneando el código QR.',
                    code: 'SESSION_DISCONNECTED',
                },
            });
        }

        // Send via WhatsApp
        const result = await whatsappManager.sendMessage(session.id, to, message);

        // Find or create contact
        const phone = to.replace(/@c\.us$/, '').replace(/@lid$/, '').replace(/@g\.us$/, '');
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
        // Log full error to file for debugging
        const fs = require('fs');
        const logEntry = `[${new Date().toISOString()}] Send Error:\n  to: ${req.body.to}\n  sessionId: ${req.params.id}\n  error: ${err.message}\n  stack: ${err.stack}\n\n`;
        fs.appendFileSync('send_errors.log', logEntry);
        console.error('[WhatsApp] Send message error:', err.message || err);

        // If the error is about session not found in manager
        if (err.message?.includes('not found') || err.message?.includes('not connected')) {
            return res.status(400).json({
                error: {
                    message: 'La sesión de WhatsApp no está activa. Ve a la sección WhatsApp y reconecta.',
                    code: 'SESSION_INACTIVE',
                },
            });
        }

        res.status(500).json({
            error: {
                message: 'Error al enviar el mensaje. Verifica que tu sesión de WhatsApp esté activa.',
            },
        });
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
