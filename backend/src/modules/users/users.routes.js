const express = require('express');
const { pool, toCamelCase } = require('../../config/database');
const { authenticate } = require('../../middlewares/auth.middleware');

const router = express.Router();

router.use(authenticate);

// GET /api/users/profile
router.get('/profile', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            `SELECT u.id, u.email, u.name, u.plan, u.avatar, u.business_type, u.business_name, u.business_description, u.created_at,
                (SELECT COUNT(*) FROM whatsapp_sessions WHERE user_id = u.id) as sessions_count,
                (SELECT COUNT(*) FROM contacts WHERE user_id = u.id) as contacts_count,
                (SELECT COUNT(*) FROM automations WHERE user_id = u.id) as automations_count
            FROM users u WHERE u.id = ?`,
            [req.user.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: { message: 'User not found' } });
        }

        const row = rows[0];
        res.json({
            user: {
                id: row.id,
                email: row.email,
                name: row.name,
                plan: row.plan,
                avatar: row.avatar,
                businessType: row.business_type,
                businessName: row.business_name,
                businessDescription: row.business_description,
                createdAt: row.created_at,
                _count: {
                    sessions: row.sessions_count,
                    contacts: row.contacts_count,
                    automations: row.automations_count,
                },
            },
        });
    } catch (err) {
        console.error('[Users] Profile error:', err);
        res.status(500).json({ error: { message: 'Error fetching profile' } });
    }
});

// PUT /api/users/profile
router.put('/profile', async (req, res) => {
    try {
        const { name, avatar, businessType, businessName, businessDescription } = req.body;
        const fields = [];
        const values = [];

        if (name !== undefined) { fields.push('name = ?'); values.push(name); }
        if (avatar !== undefined) { fields.push('avatar = ?'); values.push(avatar); }
        if (businessType !== undefined) { fields.push('business_type = ?'); values.push(businessType); }
        if (businessName !== undefined) { fields.push('business_name = ?'); values.push(businessName); }
        if (businessDescription !== undefined) { fields.push('business_description = ?'); values.push(businessDescription); }

        if (fields.length > 0) {
            values.push(req.user.id);
            await pool.execute(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
        }

        const [rows] = await pool.execute(
            'SELECT * FROM users WHERE id = ?',
            [req.user.id]
        );

        res.json({ user: toCamelCase(rows[0]), message: 'Profile updated' });
    } catch (err) {
        console.error('[Users] Update profile error:', err);
        console.error('[Users] Body:', req.body);
        res.status(500).json({ error: { message: 'Error updating profile', details: err.message } });
    }
});

// GET /api/users/stats
router.get('/stats', async (req, res) => {
    try {
        const uid = req.user.id;
        const [[{ c: totalSessions }]] = await pool.execute('SELECT COUNT(*) as c FROM whatsapp_sessions WHERE user_id = ?', [uid]);
        const [[{ c: activeSessions }]] = await pool.execute('SELECT COUNT(*) as c FROM whatsapp_sessions WHERE user_id = ? AND status = ?', [uid, 'CONNECTED']);
        const [[{ c: totalContacts }]] = await pool.execute('SELECT COUNT(*) as c FROM contacts WHERE user_id = ?', [uid]);
        const [[{ c: totalMessages }]] = await pool.execute(
            'SELECT COUNT(*) as c FROM messages m JOIN whatsapp_sessions s ON m.session_id = s.id WHERE s.user_id = ?', [uid]
        );
        const [[{ c: totalAutomations }]] = await pool.execute('SELECT COUNT(*) as c FROM automations WHERE user_id = ?', [uid]);

        res.json({
            stats: { totalSessions, activeSessions, totalContacts, totalMessages, totalAutomations },
        });
    } catch (err) {
        console.error('[Users] Stats error:', err);
        res.status(500).json({ error: { message: 'Error fetching stats' } });
    }
});

module.exports = router;
