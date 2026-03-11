const express = require('express');
const { pool } = require('../../config/database');
const { authenticate } = require('../../middlewares/auth.middleware');

const router = express.Router();

router.use(authenticate);

// GET /api/reports/overview
router.get('/overview', async (req, res) => {
    try {
        const uid = req.user.id;

        const [[{ c: totalMessages }]] = await pool.execute(
            'SELECT COUNT(*) as c FROM messages m JOIN whatsapp_sessions s ON m.session_id = s.id WHERE s.user_id = ?', [uid]
        );
        const [[{ c: inboundMessages }]] = await pool.execute(
            'SELECT COUNT(*) as c FROM messages m JOIN whatsapp_sessions s ON m.session_id = s.id WHERE s.user_id = ? AND m.direction = ?', [uid, 'INBOUND']
        );
        const [[{ c: outboundMessages }]] = await pool.execute(
            'SELECT COUNT(*) as c FROM messages m JOIN whatsapp_sessions s ON m.session_id = s.id WHERE s.user_id = ? AND m.direction = ?', [uid, 'OUTBOUND']
        );
        const [[{ c: totalContacts }]] = await pool.execute('SELECT COUNT(*) as c FROM contacts WHERE user_id = ?', [uid]);
        const [[{ c: totalSessions }]] = await pool.execute('SELECT COUNT(*) as c FROM whatsapp_sessions WHERE user_id = ?', [uid]);
        const [[{ c: activeSessions }]] = await pool.execute('SELECT COUNT(*) as c FROM whatsapp_sessions WHERE user_id = ? AND status = ?', [uid, 'CONNECTED']);
        const [[{ c: totalAutomations }]] = await pool.execute('SELECT COUNT(*) as c FROM automations WHERE user_id = ?', [uid]);
        const [[{ c: enabledAutomations }]] = await pool.execute('SELECT COUNT(*) as c FROM automations WHERE user_id = ? AND enabled = TRUE', [uid]);

        res.json({
            overview: {
                totalMessages, inboundMessages, outboundMessages, totalContacts,
                totalSessions, activeSessions, totalAutomations, enabledAutomations,
                responseRate: totalMessages > 0 ? Math.round((outboundMessages / totalMessages) * 100) : 0,
            },
        });
    } catch (err) {
        console.error('[Reports] Overview error:', err);
        res.status(500).json({ error: { message: 'Error fetching overview' } });
    }
});

// GET /api/reports/messages-by-day
router.get('/messages-by-day', async (req, res) => {
    try {
        const uid = req.user.id;
        const { days = 14 } = req.query;
        const numDays = parseInt(days);
        const sinceDate = new Date();
        sinceDate.setDate(sinceDate.getDate() - numDays);

        const [rows] = await pool.execute(
            `SELECT DATE(m.timestamp) as day, m.direction, COUNT(*) as cnt
            FROM messages m
            JOIN whatsapp_sessions s ON m.session_id = s.id
            WHERE s.user_id = ? AND m.timestamp >= ?
            GROUP BY day, m.direction
            ORDER BY day ASC`,
            [uid, sinceDate]
        );

        // Build complete date range
        const byDay = {};
        for (let i = 0; i < numDays; i++) {
            const d = new Date();
            d.setDate(d.getDate() - (numDays - 1 - i));
            const key = d.toISOString().split('T')[0];
            byDay[key] = { date: key, inbound: 0, outbound: 0, total: 0 };
        }

        for (const row of rows) {
            const key = new Date(row.day).toISOString().split('T')[0];
            if (byDay[key]) {
                byDay[key].total += row.cnt;
                if (row.direction === 'INBOUND') byDay[key].inbound += row.cnt;
                else byDay[key].outbound += row.cnt;
            }
        }

        res.json({ messagesByDay: Object.values(byDay) });
    } catch (err) {
        console.error('[Reports] Messages by day error:', err);
        res.status(500).json({ error: { message: 'Error fetching messages by day' } });
    }
});

// GET /api/reports/top-contacts
router.get('/top-contacts', async (req, res) => {
    try {
        const uid = req.user.id;
        const { limit = 10 } = req.query;

        const [rows] = await pool.execute(
            `SELECT c.id, c.phone, c.name,
                COUNT(m.id) as total_messages,
                MAX(m.timestamp) as last_message,
                (SELECT SUBSTRING(body, 1, 50) FROM messages WHERE contact_id = c.id ORDER BY timestamp DESC LIMIT 1) as last_message_preview
            FROM contacts c
            LEFT JOIN messages m ON m.contact_id = c.id
            WHERE c.user_id = ? AND c.phone NOT LIKE '%broadcast%'
            GROUP BY c.id
            HAVING total_messages > 0
            ORDER BY total_messages DESC
            LIMIT ?`,
            [uid, parseInt(limit)]
        );

        const topContacts = rows.map(r => ({
            id: r.id,
            phone: r.phone,
            name: r.name,
            totalMessages: r.total_messages,
            lastMessage: r.last_message,
            lastMessagePreview: r.last_message_preview,
        }));

        res.json({ topContacts });
    } catch (err) {
        console.error('[Reports] Top contacts error:', err);
        res.status(500).json({ error: { message: 'Error fetching top contacts' } });
    }
});

// GET /api/reports/messages-by-hour
router.get('/messages-by-hour', async (req, res) => {
    try {
        const uid = req.user.id;

        const [rows] = await pool.execute(
            `SELECT HOUR(m.timestamp) as hour, m.direction, COUNT(*) as cnt
            FROM messages m
            JOIN whatsapp_sessions s ON m.session_id = s.id
            WHERE s.user_id = ?
            GROUP BY hour, m.direction`,
            [uid]
        );

        const byHour = Array.from({ length: 24 }, (_, i) => ({
            hour: i,
            label: `${i.toString().padStart(2, '0')}:00`,
            inbound: 0,
            outbound: 0,
            total: 0,
        }));

        for (const row of rows) {
            byHour[row.hour].total += row.cnt;
            if (row.direction === 'INBOUND') byHour[row.hour].inbound += row.cnt;
            else byHour[row.hour].outbound += row.cnt;
        }

        res.json({ messagesByHour: byHour });
    } catch (err) {
        console.error('[Reports] Messages by hour error:', err);
        res.status(500).json({ error: { message: 'Error fetching messages by hour' } });
    }
});

module.exports = router;
