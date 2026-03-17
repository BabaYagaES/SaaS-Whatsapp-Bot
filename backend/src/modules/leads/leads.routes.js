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
             ORDER BY GREATEST(l.created_at, l.updated_at) DESC`,
            [req.user.id]
        );
        res.json({ leads: rowsToCamel(rows) });
    } catch (err) {
        console.error('[Leads] List error:', err);
        res.status(500).json({ error: { message: 'Error fetching leads' } });
    }
});

// DELETE /api/leads/:id
router.delete('/:id', async (req, res) => {
    try {
        const [result] = await pool.execute(
            'DELETE FROM leads WHERE id = ? AND user_id = ?',
            [req.params.id, req.user.id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: { message: 'Lead not found' } });
        }
        res.json({ message: 'Lead deleted successfully' });
    } catch (err) {
        console.error('[Leads] Delete error:', err);
        res.status(500).json({ error: { message: 'Error deleting lead' } });
    }
});

module.exports = router;
