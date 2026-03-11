const express = require('express');
const { pool, toCamelCase } = require('../../config/database');
const { authenticate } = require('../../middlewares/auth.middleware');

const router = express.Router();

router.use(authenticate);

// GET /api/messages
router.get('/', async (req, res) => {
    try {
        const { sessionId, contactId, page = 1, limit = 50 } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const offset = (pageNum - 1) * limitNum;

        let where = 'WHERE s.user_id = ?';
        const params = [req.user.id];

        if (sessionId) { where += ' AND m.session_id = ?'; params.push(sessionId); }
        if (contactId) { where += ' AND m.contact_id = ?'; params.push(contactId); }

        const [[{ total }]] = await pool.execute(
            `SELECT COUNT(*) as total FROM messages m
            JOIN whatsapp_sessions s ON m.session_id = s.id
            ${where}`, params
        );

        const [rows] = await pool.execute(
            `SELECT m.id, m.session_id, m.contact_id, m.direction, m.body, m.media_url,
                m.status, m.timestamp, m.created_at,
                c.id as c_id, c.phone as c_phone, c.name as c_name,
                s.id as s_id, s.session_name as s_session_name
            FROM messages m
            JOIN whatsapp_sessions s ON m.session_id = s.id
            LEFT JOIN contacts c ON m.contact_id = c.id
            ${where}
            ORDER BY m.timestamp DESC
            LIMIT ? OFFSET ?`,
            [...params, limitNum, offset]
        );

        const messages = rows.map(r => ({
            id: r.id,
            sessionId: r.session_id,
            contactId: r.contact_id,
            direction: r.direction,
            body: r.body,
            mediaUrl: r.media_url,
            status: r.status,
            timestamp: r.timestamp,
            createdAt: r.created_at,
            contact: r.c_id ? { id: r.c_id, phone: r.c_phone, name: r.c_name } : null,
            session: { id: r.s_id, sessionName: r.s_session_name },
        })).reverse(); // Chronological order

        res.json({
            messages,
            pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
        });
    } catch (err) {
        console.error('[Messages] List error:', err);
        res.status(500).json({ error: { message: 'Error fetching messages' } });
    }
});

// GET /api/messages/conversations
router.get('/conversations', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            `SELECT c.id, c.phone, c.name, c.tags,
                (SELECT COUNT(*) FROM messages WHERE contact_id = c.id) as total_messages,
                lm.id as last_msg_id, lm.body as last_msg_body, lm.direction as last_msg_direction,
                lm.timestamp as last_msg_timestamp, lm.status as last_msg_status
            FROM contacts c
            INNER JOIN messages lm ON lm.contact_id = c.id
                AND lm.id = (SELECT id FROM messages WHERE contact_id = c.id ORDER BY timestamp DESC LIMIT 1)
            WHERE c.user_id = ?
                AND c.phone NOT LIKE '%broadcast%'
                AND c.phone NOT LIKE '%status@%'
                AND c.phone NOT LIKE '%@g.us%'
            ORDER BY lm.timestamp DESC`,
            [req.user.id]
        );

        const conversations = rows.map(r => ({
            contact: { id: r.id, phone: r.phone, name: r.name, tags: r.tags },
            lastMessage: {
                id: r.last_msg_id,
                body: r.last_msg_body,
                direction: r.last_msg_direction,
                timestamp: r.last_msg_timestamp,
                status: r.last_msg_status,
            },
            totalMessages: r.total_messages,
        }));

        res.json({ conversations });
    } catch (err) {
        console.error('[Messages] Conversations error:', err);
        res.status(500).json({ error: { message: 'Error fetching conversations' } });
    }
});

// GET /api/messages/chat/:contactId
router.get('/chat/:contactId', async (req, res) => {
    try {
        const { page = 1, limit = 100 } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const offset = (pageNum - 1) * limitNum;

        const [contactRows] = await pool.execute(
            'SELECT * FROM contacts WHERE id = ? AND user_id = ?',
            [req.params.contactId, req.user.id]
        );

        if (contactRows.length === 0) {
            return res.status(404).json({ error: { message: 'Contact not found' } });
        }

        const [[{ total }]] = await pool.execute(
            'SELECT COUNT(*) as total FROM messages WHERE contact_id = ?',
            [req.params.contactId]
        );

        const [rows] = await pool.execute(
            `SELECT m.*, s.id as s_id, s.session_name
            FROM messages m
            LEFT JOIN whatsapp_sessions s ON m.session_id = s.id
            WHERE m.contact_id = ?
            ORDER BY m.timestamp ASC
            LIMIT ? OFFSET ?`,
            [req.params.contactId, limitNum, offset]
        );

        const messages = rows.map(r => ({
            id: r.id,
            sessionId: r.session_id,
            contactId: r.contact_id,
            direction: r.direction,
            body: r.body,
            mediaUrl: r.media_url,
            status: r.status,
            timestamp: r.timestamp,
            createdAt: r.created_at,
            session: { id: r.s_id, sessionName: r.session_name },
        }));

        res.json({
            contact: toCamelCase(contactRows[0]),
            messages,
            pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
        });
    } catch (err) {
        console.error('[Messages] Chat error:', err);
        res.status(500).json({ error: { message: 'Error fetching chat' } });
    }
});

module.exports = router;
