const express = require('express');
const { prisma } = require('../../config/database');
const { authenticate } = require('../../middlewares/auth.middleware');

const router = express.Router();

router.use(authenticate);

// ==========================================
// GET /api/messages - List messages (conversations view)
// ==========================================
router.get('/', async (req, res) => {
    try {
        const { sessionId, contactId, page = 1, limit = 50 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const where = {
            session: { userId: req.user.id },
        };

        if (sessionId) where.sessionId = sessionId;
        if (contactId) where.contactId = contactId;

        const [messages, total] = await Promise.all([
            prisma.message.findMany({
                where,
                skip,
                take: parseInt(limit),
                orderBy: { timestamp: 'desc' },
                include: {
                    contact: {
                        select: { id: true, phone: true, name: true },
                    },
                    session: {
                        select: { id: true, sessionName: true },
                    },
                },
            }),
            prisma.message.count({ where }),
        ]);

        res.json({
            messages: messages.reverse(), // Chronological order
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit)),
            },
        });
    } catch (err) {
        console.error('[Messages] List error:', err);
        res.status(500).json({ error: { message: 'Error fetching messages' } });
    }
});

// ==========================================
// GET /api/messages/conversations - Get conversation list
// ==========================================
router.get('/conversations', async (req, res) => {
    try {
        // Get unique contacts with latest message
        const contacts = await prisma.contact.findMany({
            where: { userId: req.user.id },
            include: {
                messages: {
                    orderBy: { timestamp: 'desc' },
                    take: 1,
                    select: {
                        id: true,
                        body: true,
                        direction: true,
                        timestamp: true,
                        status: true,
                    },
                },
                _count: {
                    select: { messages: true },
                },
            },
            orderBy: { updatedAt: 'desc' },
        });

        // Filter out contacts with no messages, broadcasts, and format
        const conversations = contacts
            .filter((c) => {
                // Exclude broadcast/status contacts
                if (c.phone.includes('broadcast') || c.phone.includes('status')) return false;
                // Exclude group contacts
                if (c.phone.includes('@g.us')) return false;
                // Must have at least one message
                return c.messages.length > 0;
            })
            .map((c) => ({
                contact: {
                    id: c.id,
                    phone: c.phone,
                    name: c.name,
                    tags: c.tags,
                },
                lastMessage: c.messages[0],
                totalMessages: c._count.messages,
            }));

        res.json({ conversations });
    } catch (err) {
        console.error('[Messages] Conversations error:', err);
        res.status(500).json({ error: { message: 'Error fetching conversations' } });
    }
});

// ==========================================
// GET /api/messages/chat/:contactId - Get chat with a contact
// ==========================================
router.get('/chat/:contactId', async (req, res) => {
    try {
        const { page = 1, limit = 100 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const contact = await prisma.contact.findFirst({
            where: { id: req.params.contactId, userId: req.user.id },
        });

        if (!contact) {
            return res.status(404).json({ error: { message: 'Contact not found' } });
        }

        const [messages, total] = await Promise.all([
            prisma.message.findMany({
                where: { contactId: contact.id },
                skip,
                take: parseInt(limit),
                orderBy: { timestamp: 'asc' },
                include: {
                    session: {
                        select: { id: true, sessionName: true },
                    },
                },
            }),
            prisma.message.count({ where: { contactId: contact.id } }),
        ]);

        res.json({
            contact,
            messages,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit)),
            },
        });
    } catch (err) {
        console.error('[Messages] Chat error:', err);
        res.status(500).json({ error: { message: 'Error fetching chat' } });
    }
});

module.exports = router;
