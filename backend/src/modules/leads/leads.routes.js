const express = require('express');
const { pool, rowsToCamel } = require('../../config/database');
const { authenticate } = require('../../middlewares/auth.middleware');

const router = express.Router();

router.use(authenticate);

// GET /api/leads
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            `SELECT l.*, c.name as contact_name, c.phone as contact_phone 
             FROM leads l
             LEFT JOIN contacts c ON l.contact_id = c.id
             WHERE l.user_id = ? 
             ORDER BY l.created_at DESC`,
            [req.user.id]
        );
        res.json({ leads: rowsToCamel(rows) });
    } catch (err) {
        console.error('[Leads] List error:', err);
        res.status(500).json({ error: { message: 'Error fetching leads' } });
    }
});

module.exports = router;
