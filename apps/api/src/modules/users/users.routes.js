const express = require('express');
const { prisma } = require('../../config/database');
const { authenticate } = require('../../middlewares/auth.middleware');

const router = express.Router();

// All user routes require auth
router.use(authenticate);

// ==========================================
// GET /api/users/profile
// ==========================================
router.get('/profile', async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                email: true,
                name: true,
                plan: true,
                avatar: true,
                createdAt: true,
                _count: {
                    select: {
                        sessions: true,
                        contacts: true,
                        automations: true,
                    },
                },
            },
        });

        res.json({ user });
    } catch (err) {
        console.error('[Users] Profile error:', err);
        res.status(500).json({ error: { message: 'Error fetching profile' } });
    }
});

// ==========================================
// PUT /api/users/profile
// ==========================================
router.put('/profile', async (req, res) => {
    try {
        const { name, avatar } = req.body;

        const user = await prisma.user.update({
            where: { id: req.user.id },
            data: {
                ...(name && { name }),
                ...(avatar && { avatar }),
            },
            select: {
                id: true,
                email: true,
                name: true,
                plan: true,
                avatar: true,
            },
        });

        res.json({ user, message: 'Profile updated' });
    } catch (err) {
        console.error('[Users] Update profile error:', err);
        res.status(500).json({ error: { message: 'Error updating profile' } });
    }
});

// ==========================================
// GET /api/users/stats
// ==========================================
router.get('/stats', async (req, res) => {
    try {
        const [sessions, contacts, messages, automations] = await Promise.all([
            prisma.whatsAppSession.count({ where: { userId: req.user.id } }),
            prisma.contact.count({ where: { userId: req.user.id } }),
            prisma.message.count({
                where: { session: { userId: req.user.id } },
            }),
            prisma.automation.count({ where: { userId: req.user.id } }),
        ]);

        const activeSessions = await prisma.whatsAppSession.count({
            where: { userId: req.user.id, status: 'CONNECTED' },
        });

        res.json({
            stats: {
                totalSessions: sessions,
                activeSessions,
                totalContacts: contacts,
                totalMessages: messages,
                totalAutomations: automations,
            },
        });
    } catch (err) {
        console.error('[Users] Stats error:', err);
        res.status(500).json({ error: { message: 'Error fetching stats' } });
    }
});

module.exports = router;
