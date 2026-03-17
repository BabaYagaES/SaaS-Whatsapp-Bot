const express = require('express');
const { pool, generateId, toCamelCase, rowsToCamel } = require('../../config/database');
const { authenticate } = require('../../middlewares/auth.middleware');
const { checkContactLimit } = require('../../middlewares/plan.middleware');

const router = express.Router();

router.use(authenticate);

// GET /api/contacts
router.get('/', async (req, res) => {
    try {
        const { search, tag, page = 1, limit = 50 } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const offset = (pageNum - 1) * limitNum;

        let where = 'WHERE c.user_id = ?';
        const params = [req.user.id];

        if (search) {
            where += ' AND (c.name LIKE ? OR c.phone LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }
        if (tag) {
            where += ' AND c.tags LIKE ?';
            params.push(`%${tag}%`);
        }

        const [[{ total }]] = await pool.execute(
            `SELECT COUNT(*) as total FROM contacts c ${where}`, params
        );

        const [rows] = await pool.execute(
            `SELECT c.*, (SELECT COUNT(*) FROM messages WHERE contact_id = c.id) as message_count
            FROM contacts c ${where}
            ORDER BY c.updated_at DESC LIMIT ? OFFSET ?`,
            [...params, limitNum, offset]
        );

        const contacts = rows.map(r => {
            const contact = toCamelCase(r);
            contact._count = { messages: r.message_count };
            delete contact.messageCount;
            return contact;
        });

        res.json({
            contacts,
            pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
        });
    } catch (err) {
        console.error('[Contacts] List error:', err);
        res.status(500).json({ error: { message: 'Error fetching contacts' } });
    }
});

// POST /api/contacts
router.post('/', checkContactLimit, async (req, res) => {
    try {
        const { phone, name, tags, notes, address } = req.body;
        if (!phone) {
            return res.status(400).json({ error: { message: 'Phone number is required' } });
        }

        const [existing] = await pool.execute(
            'SELECT id FROM contacts WHERE user_id = ? AND phone = ?',
            [req.user.id, phone]
        );
        if (existing.length > 0) {
            return res.status(409).json({ error: { message: 'Contact already exists' } });
        }

        const id = generateId();
        await pool.execute(
            'INSERT INTO contacts (id, user_id, phone, name, tags, notes, address) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [id, req.user.id, phone, name || null, tags ? JSON.stringify(tags) : '[]', notes || null, address || null]
        );

        const [[row]] = await pool.execute('SELECT * FROM contacts WHERE id = ?', [id]);
        res.status(201).json({ contact: toCamelCase(row) });
    } catch (err) {
        console.error('[Contacts] Create error:', err);
        res.status(500).json({ error: { message: 'Error creating contact' } });
    }
});

// PUT /api/contacts/:id
router.put('/:id', async (req, res) => {
    try {
        const { name, tags, notes, address } = req.body;

        const [existing] = await pool.execute(
            'SELECT id FROM contacts WHERE id = ? AND user_id = ?',
            [req.params.id, req.user.id]
        );
        if (existing.length === 0) {
            return res.status(404).json({ error: { message: 'Contact not found' } });
        }

        const fields = [];
        const values = [];
        if (name !== undefined) { fields.push('name = ?'); values.push(name); }
        if (tags) { fields.push('tags = ?'); values.push(JSON.stringify(tags)); }
        if (notes !== undefined) { fields.push('notes = ?'); values.push(notes); }
        if (address !== undefined) { fields.push('address = ?'); values.push(address); }

        if (fields.length > 0) {
            values.push(req.params.id);
            await pool.execute(`UPDATE contacts SET ${fields.join(', ')} WHERE id = ?`, values);
        }

        const [[row]] = await pool.execute('SELECT * FROM contacts WHERE id = ?', [req.params.id]);
        res.json({ contact: toCamelCase(row) });
    } catch (err) {
        console.error('[Contacts] Update error:', err);
        res.status(500).json({ error: { message: 'Error updating contact' } });
    }
});

// DELETE /api/contacts/:id
router.delete('/:id', async (req, res) => {
    try {
        const [existing] = await pool.execute(
            'SELECT id FROM contacts WHERE id = ? AND user_id = ?',
            [req.params.id, req.user.id]
        );
        if (existing.length === 0) {
            return res.status(404).json({ error: { message: 'Contact not found' } });
        }

        await pool.execute('DELETE FROM contacts WHERE id = ?', [req.params.id]);
        res.json({ message: 'Contact deleted' });
    } catch (err) {
        console.error('[Contacts] Delete error:', err);
        res.status(500).json({ error: { message: 'Error deleting contact' } });
    }
});

module.exports = router;
