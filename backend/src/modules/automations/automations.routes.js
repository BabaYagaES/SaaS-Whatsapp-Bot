const express = require('express');
const fs = require('fs');
const path = require('path');
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
        const { name, trigger, response, matchType, enabled, priority, isAi, mediaUrl, mediaBase64, mediaName, mediaMimeType } = req.body;

        if (!name || !trigger) {
            return res.status(400).json({ error: { message: 'Nombre y trigger son requeridos' } });
        }

        let finalMediaUrl = mediaUrl || null;

        // Handle File Upload if base64 is provided
        if (mediaBase64 && mediaMimeType) {
            try {
                const uploadsDir = path.resolve(__dirname, '../../../../public/uploads');
                if (!fs.existsSync(uploadsDir)) {
                    fs.mkdirSync(uploadsDir, { recursive: true });
                }
                const ext = mediaName ? path.extname(mediaName) : (mediaMimeType.includes('image') ? '.jpg' : '.bin');
                const fileName = `auto-${Date.now()}-${generateId()}${ext}`;
                const filePath = path.join(uploadsDir, fileName);
                fs.writeFileSync(filePath, Buffer.from(mediaBase64, 'base64'));
                finalMediaUrl = `http://localhost:3001/uploads/${fileName}`; 
            } catch (err) {
                console.error('[Automations] Error saving media locally:', err);
            }
        }

        const id = generateId();
        await pool.execute(
            'INSERT INTO automations (id, user_id, name, `trigger`, response, match_type, enabled, priority, is_ai, media_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id, req.user.id, name, trigger, response || '', matchType || 'CONTAINS', enabled !== false, priority || 0, isAi === true, finalMediaUrl]
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
        const { name, trigger, response, matchType, enabled, priority, isAi, mediaUrl, mediaBase64, mediaName, mediaMimeType } = req.body;

        const [existing] = await pool.execute(
            'SELECT id, media_url FROM automations WHERE id = ? AND user_id = ?',
            [req.params.id, req.user.id]
        );
        if (existing.length === 0) {
            return res.status(404).json({ error: { message: 'Automation not found' } });
        }

        let finalMediaUrl = mediaUrl !== undefined ? mediaUrl : existing[0].media_url;

        // Handle File Upload if base64 is provided
        if (mediaBase64 && mediaMimeType) {
            try {
                const uploadsDir = path.resolve(__dirname, '../../../../public/uploads');
                if (!fs.existsSync(uploadsDir)) {
                    fs.mkdirSync(uploadsDir, { recursive: true });
                }
                const ext = mediaName ? path.extname(mediaName) : (mediaMimeType.includes('image') ? '.jpg' : '.bin');
                const fileName = `auto-${Date.now()}-${generateId()}${ext}`;
                const filePath = path.join(uploadsDir, fileName);
                fs.writeFileSync(filePath, Buffer.from(mediaBase64, 'base64'));
                finalMediaUrl = `http://localhost:3001/uploads/${fileName}`;
            } catch (err) {
                console.error('[Automations] Error saving media locally:', err);
            }
        }

        const fields = [];
        const values = [];
        if (name) { fields.push('name = ?'); values.push(name); }
        if (trigger) { fields.push('`trigger` = ?'); values.push(trigger); }
        if (response !== undefined) { fields.push('response = ?'); values.push(response); }
        if (matchType) { fields.push('match_type = ?'); values.push(matchType); }
        if (enabled !== undefined) { fields.push('enabled = ?'); values.push(enabled); }
        if (priority !== undefined) { fields.push('priority = ?'); values.push(priority); }
        if (isAi !== undefined) { fields.push('is_ai = ?'); values.push(isAi); }
        fields.push('media_url = ?'); values.push(finalMediaUrl);

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
