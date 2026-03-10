const express = require('express');
const { prisma } = require('../../config/database');
const { authenticate } = require('../../middlewares/auth.middleware');
const { checkContactLimit } = require('../../middlewares/plan.middleware');

const router = express.Router();

router.use(authenticate);

// ==========================================
// GET /api/contacts - List contacts
// ==========================================
router.get('/', async (req, res) => {
    try {
        const { search, tag, page = 1, limit = 50 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const where = { userId: req.user.id };

        if (search) {
            where.OR = [
                { name: { contains: search } },
                { phone: { contains: search } },
            ];
        }

        if (tag) {
            where.tags = { contains: tag };
        }

        const [contacts, total] = await Promise.all([
            prisma.contact.findMany({
                where,
                skip,
                take: parseInt(limit),
                orderBy: { updatedAt: 'desc' },
                include: {
                    _count: { select: { messages: true } },
                },
            }),
            prisma.contact.count({ where }),
        ]);

        res.json({
            contacts,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit)),
            },
        });
    } catch (err) {
        console.error('[Contacts] List error:', err);
        res.status(500).json({ error: { message: 'Error fetching contacts' } });
    }
});

// ==========================================
// POST /api/contacts - Create contact
// ==========================================
router.post('/', checkContactLimit, async (req, res) => {
    try {
        const { phone, name, tags, notes } = req.body;

        if (!phone) {
            return res.status(400).json({ error: { message: 'Phone number is required' } });
        }

        const existing = await prisma.contact.findFirst({
            where: { userId: req.user.id, phone },
        });

        if (existing) {
            return res.status(409).json({ error: { message: 'Contact already exists' } });
        }

        const contact = await prisma.contact.create({
            data: {
                userId: req.user.id,
                phone,
                name,
                tags: tags ? JSON.stringify(tags) : '[]',
                notes,
            },
        });

        res.status(201).json({ contact });
    } catch (err) {
        console.error('[Contacts] Create error:', err);
        res.status(500).json({ error: { message: 'Error creating contact' } });
    }
});

// ==========================================
// PUT /api/contacts/:id - Update contact
// ==========================================
router.put('/:id', async (req, res) => {
    try {
        const { name, tags, notes } = req.body;

        const contact = await prisma.contact.findFirst({
            where: { id: req.params.id, userId: req.user.id },
        });

        if (!contact) {
            return res.status(404).json({ error: { message: 'Contact not found' } });
        }

        const updated = await prisma.contact.update({
            where: { id: contact.id },
            data: {
                ...(name !== undefined && { name }),
                ...(tags && { tags: JSON.stringify(tags) }),
                ...(notes !== undefined && { notes }),
            },
        });

        res.json({ contact: updated });
    } catch (err) {
        console.error('[Contacts] Update error:', err);
        res.status(500).json({ error: { message: 'Error updating contact' } });
    }
});

// ==========================================
// DELETE /api/contacts/:id - Delete contact
// ==========================================
router.delete('/:id', async (req, res) => {
    try {
        const contact = await prisma.contact.findFirst({
            where: { id: req.params.id, userId: req.user.id },
        });

        if (!contact) {
            return res.status(404).json({ error: { message: 'Contact not found' } });
        }

        await prisma.contact.delete({ where: { id: contact.id } });

        res.json({ message: 'Contact deleted' });
    } catch (err) {
        console.error('[Contacts] Delete error:', err);
        res.status(500).json({ error: { message: 'Error deleting contact' } });
    }
});

module.exports = router;
