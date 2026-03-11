const express = require('express');
const { pool, generateId, toCamelCase, rowsToCamel } = require('../../config/database');
const { authenticate } = require('../../middlewares/auth.middleware');
const { checkSessionLimit, checkMessageLimit } = require('../../middlewares/plan.middleware');
const { whatsappManager } = require('../../lib/whatsapp');

const router = express.Router();

router.use(authenticate);

// POST /api/whatsapp/sessions
router.post('/sessions', checkSessionLimit, async (req, res) => {
    try {
        const { sessionName } = req.body;
        if (!sessionName) {
            return res.status(400).json({ error: { message: 'Session name is required' } });
        }

        const id = generateId();
        await pool.execute(
            'INSERT INTO whatsapp_sessions (id, user_id, session_name, status) VALUES (?, ?, ?, ?)',
            [id, req.user.id, sessionName, 'CONNECTING']
        );

        // Fire-and-forget: la inicialización de WhatsApp tarda
        // (lanza Puppeteer/Chromium). Los updates llegan por Socket.IO.
        whatsappManager.createSession(req.user.id, id).catch(err => {
            console.error(`[WhatsApp] Background session init error for ${id}:`, err.message);
        });

        res.status(201).json({
            message: 'Session created, waiting for QR code...',
            session: { id, sessionName, status: 'CONNECTING' },
        });
    } catch (err) {
        console.error('[WhatsApp] Create session error:', err);
        res.status(500).json({ error: { message: 'Error creating session' } });
    }
});

// GET /api/whatsapp/sessions
router.get('/sessions', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            `SELECT s.id, s.session_name, s.status, s.phone, s.created_at,
                (SELECT COUNT(*) FROM messages WHERE session_id = s.id) as message_count
            FROM whatsapp_sessions s
            WHERE s.user_id = ?
            ORDER BY s.created_at DESC`,
            [req.user.id]
        );

        const sessions = rows.map(r => ({
            id: r.id,
            sessionName: r.session_name,
            status: r.status,
            phone: r.phone,
            createdAt: r.created_at,
            _count: { messages: r.message_count },
        }));

        res.json({ sessions });
    } catch (err) {
        console.error('[WhatsApp] List sessions error:', err);
        res.status(500).json({ error: { message: 'Error fetching sessions' } });
    }
});

// GET /api/whatsapp/sessions/:id
router.get('/sessions/:id', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            `SELECT s.*, (SELECT COUNT(*) FROM messages WHERE session_id = s.id) as message_count
            FROM whatsapp_sessions s
            WHERE s.id = ? AND s.user_id = ?`,
            [req.params.id, req.user.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: { message: 'Session not found' } });
        }

        const r = rows[0];
        const session = toCamelCase(r);
        session._count = { messages: r.message_count };
        delete session.messageCount;
        res.json({ session });
    } catch (err) {
        console.error('[WhatsApp] Get session error:', err);
        res.status(500).json({ error: { message: 'Error fetching session' } });
    }
});

// DELETE /api/whatsapp/sessions/:id
router.delete('/sessions/:id', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT id FROM whatsapp_sessions WHERE id = ? AND user_id = ?',
            [req.params.id, req.user.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: { message: 'Session not found' } });
        }

        // Fire-and-forget disconnect (puede tardar cerrando Chromium)
        whatsappManager.disconnectSession(rows[0].id).catch(err => {
            console.error(`[WhatsApp] Background disconnect error:`, err.message);
        });
        await pool.execute('DELETE FROM whatsapp_sessions WHERE id = ?', [rows[0].id]);

        res.json({ message: 'Session disconnected and deleted' });
    } catch (err) {
        console.error('[WhatsApp] Delete session error:', err);
        res.status(500).json({ error: { message: 'Error deleting session' } });
    }
});

// POST /api/whatsapp/sessions/:id/send
router.post('/sessions/:id/send', checkMessageLimit, async (req, res) => {
    try {
        const { to, message } = req.body;
        if (!to || !message) {
            return res.status(400).json({ error: { message: 'Se requiere destinatario y mensaje' } });
        }

        const [sessions] = await pool.execute(
            'SELECT id, status FROM whatsapp_sessions WHERE id = ? AND user_id = ?',
            [req.params.id, req.user.id]
        );

        if (sessions.length === 0) {
            return res.status(404).json({ error: { message: 'Sesión no encontrada' } });
        }

        const session = sessions[0];
        const isActiveInMemory = whatsappManager.sessions.has(session.id);

        if (!isActiveInMemory) {
            if (session.status === 'CONNECTED') {
                await pool.execute('UPDATE whatsapp_sessions SET status = ? WHERE id = ?', ['DISCONNECTED', session.id]);
            }
            return res.status(400).json({
                error: {
                    message: 'Tu sesión de WhatsApp se desconectó. Ve a la sección WhatsApp y reconecta escaneando el código QR.',
                    code: 'SESSION_DISCONNECTED',
                },
            });
        }

        const result = await whatsappManager.sendMessage(session.id, to, message);

        // Find or create contact
        const phone = to.replace(/@c\.us$/, '').replace(/@lid$/, '').replace(/@g\.us$/, '');
        const [contacts] = await pool.execute(
            'SELECT id FROM contacts WHERE user_id = ? AND phone = ?',
            [req.user.id, phone]
        );

        let contactId;
        if (contacts.length === 0) {
            contactId = generateId();
            await pool.execute(
                'INSERT INTO contacts (id, user_id, phone, tags) VALUES (?, ?, ?, ?)',
                [contactId, req.user.id, phone, '[]']
            );
        } else {
            contactId = contacts[0].id;
        }

        // Save message
        const msgId = generateId();
        await pool.execute(
            'INSERT INTO messages (id, session_id, contact_id, direction, body, status) VALUES (?, ?, ?, ?, ?, ?)',
            [msgId, session.id, contactId, 'OUTBOUND', message, 'SENT']
        );

        const [[savedMessage]] = await pool.execute('SELECT * FROM messages WHERE id = ?', [msgId]);
        res.json({ message: 'Message sent', data: toCamelCase(savedMessage) });
    } catch (err) {
        const fs = require('fs');
        const logEntry = `[${new Date().toISOString()}] Send Error:\n  to: ${req.body.to}\n  sessionId: ${req.params.id}\n  error: ${err.message}\n  stack: ${err.stack}\n\n`;
        fs.appendFileSync('send_errors.log', logEntry);
        console.error('[WhatsApp] Send message error:', err.message || err);

        if (err.message?.includes('not found') || err.message?.includes('not connected')) {
            return res.status(400).json({
                error: {
                    message: 'La sesión de WhatsApp no está activa. Ve a la sección WhatsApp y reconecta.',
                    code: 'SESSION_INACTIVE',
                },
            });
        }

        res.status(500).json({
            error: { message: 'Error al enviar el mensaje. Verifica que tu sesión de WhatsApp esté activa.' },
        });
    }
});

// GET /api/whatsapp/sessions/:id/status
router.get('/sessions/:id/status', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT id, status FROM whatsapp_sessions WHERE id = ? AND user_id = ?',
            [req.params.id, req.user.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: { message: 'Session not found' } });
        }

        const session = rows[0];
        const isActiveInMemory = whatsappManager.sessions.has(session.id);
        const realStatus = isActiveInMemory ? whatsappManager.getSessionStatus(session.id) : 'DISCONNECTED';

        if (session.status === 'CONNECTED' && !isActiveInMemory) {
            await pool.execute('UPDATE whatsapp_sessions SET status = ? WHERE id = ?', ['DISCONNECTED', session.id]);
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
