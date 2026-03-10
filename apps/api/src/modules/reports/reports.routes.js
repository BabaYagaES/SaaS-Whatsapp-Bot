const express = require('express');
const { prisma } = require('../../config/database');
const { authenticate } = require('../../middlewares/auth.middleware');

const router = express.Router();

router.use(authenticate);

// ==========================================
// GET /api/reports/overview - General stats
// ==========================================
router.get('/overview', async (req, res) => {
    try {
        const userId = req.user.id;

        const [
            totalMessages,
            inboundMessages,
            outboundMessages,
            totalContacts,
            totalSessions,
            activeSessions,
            totalAutomations,
            enabledAutomations,
        ] = await Promise.all([
            prisma.message.count({ where: { session: { userId } } }),
            prisma.message.count({ where: { session: { userId }, direction: 'INBOUND' } }),
            prisma.message.count({ where: { session: { userId }, direction: 'OUTBOUND' } }),
            prisma.contact.count({ where: { userId } }),
            prisma.whatsAppSession.count({ where: { userId } }),
            prisma.whatsAppSession.count({ where: { userId, status: 'CONNECTED' } }),
            prisma.automation.count({ where: { userId } }),
            prisma.automation.count({ where: { userId, enabled: true } }),
        ]);

        res.json({
            overview: {
                totalMessages,
                inboundMessages,
                outboundMessages,
                totalContacts,
                totalSessions,
                activeSessions,
                totalAutomations,
                enabledAutomations,
                responseRate: totalMessages > 0
                    ? Math.round((outboundMessages / totalMessages) * 100)
                    : 0,
            },
        });
    } catch (err) {
        console.error('[Reports] Overview error:', err);
        res.status(500).json({ error: { message: 'Error fetching overview' } });
    }
});

// ==========================================
// GET /api/reports/messages-by-day - Messages grouped by day
// ==========================================
router.get('/messages-by-day', async (req, res) => {
    try {
        const userId = req.user.id;
        const { days = 14 } = req.query;
        const sinceDate = new Date();
        sinceDate.setDate(sinceDate.getDate() - parseInt(days));

        const messages = await prisma.message.findMany({
            where: {
                session: { userId },
                timestamp: { gte: sinceDate },
            },
            select: {
                direction: true,
                timestamp: true,
            },
            orderBy: { timestamp: 'asc' },
        });

        // Group by day
        const byDay = {};
        for (let i = 0; i < parseInt(days); i++) {
            const d = new Date();
            d.setDate(d.getDate() - (parseInt(days) - 1 - i));
            const key = d.toISOString().split('T')[0];
            byDay[key] = { date: key, inbound: 0, outbound: 0, total: 0 };
        }

        for (const msg of messages) {
            const key = new Date(msg.timestamp).toISOString().split('T')[0];
            if (byDay[key]) {
                byDay[key].total++;
                if (msg.direction === 'INBOUND') byDay[key].inbound++;
                else byDay[key].outbound++;
            }
        }

        res.json({ messagesByDay: Object.values(byDay) });
    } catch (err) {
        console.error('[Reports] Messages by day error:', err);
        res.status(500).json({ error: { message: 'Error fetching messages by day' } });
    }
});

// ==========================================
// GET /api/reports/top-contacts - Most active contacts
// ==========================================
router.get('/top-contacts', async (req, res) => {
    try {
        const userId = req.user.id;
        const { limit = 10 } = req.query;

        const contacts = await prisma.contact.findMany({
            where: {
                userId,
                phone: { not: { contains: 'broadcast' } },
            },
            include: {
                _count: { select: { messages: true } },
                messages: {
                    orderBy: { timestamp: 'desc' },
                    take: 1,
                    select: { timestamp: true, body: true },
                },
            },
            orderBy: {
                messages: { _count: 'desc' },
            },
            take: parseInt(limit),
        });

        const topContacts = contacts
            .filter(c => c._count.messages > 0)
            .map(c => ({
                id: c.id,
                phone: c.phone,
                name: c.name,
                totalMessages: c._count.messages,
                lastMessage: c.messages[0]?.timestamp || null,
                lastMessagePreview: c.messages[0]?.body?.substring(0, 50) || null,
            }));

        res.json({ topContacts });
    } catch (err) {
        console.error('[Reports] Top contacts error:', err);
        res.status(500).json({ error: { message: 'Error fetching top contacts' } });
    }
});

// ==========================================
// GET /api/reports/messages-by-hour - Activity by hour of day
// ==========================================
router.get('/messages-by-hour', async (req, res) => {
    try {
        const userId = req.user.id;

        const messages = await prisma.message.findMany({
            where: { session: { userId } },
            select: { timestamp: true, direction: true },
        });

        const byHour = Array.from({ length: 24 }, (_, i) => ({
            hour: i,
            label: `${i.toString().padStart(2, '0')}:00`,
            inbound: 0,
            outbound: 0,
            total: 0,
        }));

        for (const msg of messages) {
            const hour = new Date(msg.timestamp).getHours();
            byHour[hour].total++;
            if (msg.direction === 'INBOUND') byHour[hour].inbound++;
            else byHour[hour].outbound++;
        }

        res.json({ messagesByHour: byHour });
    } catch (err) {
        console.error('[Reports] Messages by hour error:', err);
        res.status(500).json({ error: { message: 'Error fetching messages by hour' } });
    }
});

module.exports = router;
