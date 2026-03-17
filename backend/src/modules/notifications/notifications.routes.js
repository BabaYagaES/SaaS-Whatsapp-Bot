const express = require('express');
const { pool, rowsToCamel } = require('../../config/database');
const { authenticate } = require('../../middlewares/auth.middleware');

const router = express.Router();

router.use(authenticate);

// GET /api/notifications
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20',
            [req.user.id]
        );
        res.json({ notifications: rowsToCamel(rows) });
    } catch (err) {
        console.error('[Notifications] Error:', err);
        res.status(500).json({ error: { message: 'Error fetching notifications' } });
    }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', async (req, res) => {
    try {
        await pool.execute(
            'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
            [req.params.id, req.user.id]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: { message: 'Error marking notification as read' } });
    }
});

// PATCH /api/notifications/read-all
router.patch('/read-all', async (req, res) => {
    try {
        await pool.execute(
            'UPDATE notifications SET is_read = TRUE WHERE user_id = ?',
            [req.user.id]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: { message: 'Error marking all as read' } });
    }
});

module.exports = router;
