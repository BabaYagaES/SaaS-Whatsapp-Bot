const express = require('express');
const { pool, generateId, toCamelCase, rowsToCamel } = require('../../config/database');
const { authenticate } = require('../../middlewares/auth.middleware');
const { checkAutomationLimit } = require('../../middlewares/plan.middleware');

const router = express.Router();

router.use(authenticate);

// GET /api/automations
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT * FROM automations WHERE user_id = ? ORDER BY priority DESC, created_at DESC',
            [req.user.id]
        );
        res.json({ automations: rowsToCamel(rows) });
    } catch (err) {
        console.error('[Automations] List error:', err);
        res.status(500).json({ error: { message: 'Error fetching automations' } });
    }
});

// POST /api/automations
router.post('/', checkAutomationLimit, async (req, res) => {
    try {
        const { name, trigger, response, matchType, enabled, priority } = req.body;

        if (!name || !trigger || !response) {
            return res.status(400).json({ error: { message: 'name, trigger, and response are required' } });
        }

        const id = generateId();
        await pool.execute(
            'INSERT INTO automations (id, user_id, name, `trigger`, response, match_type, enabled, priority) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [id, req.user.id, name, trigger, response, matchType || 'CONTAINS', enabled !== false, priority || 0]
        );

        const [[row]] = await pool.execute('SELECT * FROM automations WHERE id = ?', [id]);
        res.status(201).json({ automation: toCamelCase(row) });
    } catch (err) {
        console.error('[Automations] Create error:', err);
        res.status(500).json({ error: { message: 'Error creating automation' } });
    }
});

// PUT /api/automations/:id
router.put('/:id', async (req, res) => {
    try {
        const { name, trigger, response, matchType, enabled, priority } = req.body;

        const [existing] = await pool.execute(
            'SELECT id FROM automations WHERE id = ? AND user_id = ?',
            [req.params.id, req.user.id]
        );
        if (existing.length === 0) {
            return res.status(404).json({ error: { message: 'Automation not found' } });
        }

        const fields = [];
        const values = [];
        if (name) { fields.push('name = ?'); values.push(name); }
        if (trigger) { fields.push('`trigger` = ?'); values.push(trigger); }
        if (response) { fields.push('response = ?'); values.push(response); }
        if (matchType) { fields.push('match_type = ?'); values.push(matchType); }
        if (enabled !== undefined) { fields.push('enabled = ?'); values.push(enabled); }
        if (priority !== undefined) { fields.push('priority = ?'); values.push(priority); }

        if (fields.length > 0) {
            values.push(req.params.id);
            await pool.execute(`UPDATE automations SET ${fields.join(', ')} WHERE id = ?`, values);
        }

        const [[row]] = await pool.execute('SELECT * FROM automations WHERE id = ?', [req.params.id]);
        res.json({ automation: toCamelCase(row) });
    } catch (err) {
        console.error('[Automations] Update error:', err);
        res.status(500).json({ error: { message: 'Error updating automation' } });
    }
});

// PATCH /api/automations/:id/toggle
router.patch('/:id/toggle', async (req, res) => {
    try {
        const [existing] = await pool.execute(
            'SELECT id, enabled FROM automations WHERE id = ? AND user_id = ?',
            [req.params.id, req.user.id]
        );
        if (existing.length === 0) {
            return res.status(404).json({ error: { message: 'Automation not found' } });
        }

        const newEnabled = !existing[0].enabled;
        await pool.execute('UPDATE automations SET enabled = ? WHERE id = ?', [newEnabled, req.params.id]);

        const [[row]] = await pool.execute('SELECT * FROM automations WHERE id = ?', [req.params.id]);
        res.json({ automation: toCamelCase(row) });
    } catch (err) {
        console.error('[Automations] Toggle error:', err);
        res.status(500).json({ error: { message: 'Error toggling automation' } });
    }
});

// DELETE /api/automations/:id
router.delete('/:id', async (req, res) => {
    try {
        const [existing] = await pool.execute(
            'SELECT id FROM automations WHERE id = ? AND user_id = ?',
            [req.params.id, req.user.id]
        );
        if (existing.length === 0) {
            return res.status(404).json({ error: { message: 'Automation not found' } });
        }

        await pool.execute('DELETE FROM automations WHERE id = ?', [req.params.id]);
        res.json({ message: 'Automation deleted' });
    } catch (err) {
        console.error('[Automations] Delete error:', err);
        res.status(500).json({ error: { message: 'Error deleting automation' } });
    }
});

module.exports = router;
