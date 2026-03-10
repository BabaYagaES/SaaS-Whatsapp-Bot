const express = require('express');
const { prisma } = require('../../config/database');
const { authenticate } = require('../../middlewares/auth.middleware');
const { checkAutomationLimit } = require('../../middlewares/plan.middleware');

const router = express.Router();

router.use(authenticate);

// ==========================================
// GET /api/automations - List automations
// ==========================================
router.get('/', async (req, res) => {
    try {
        const automations = await prisma.automation.findMany({
            where: { userId: req.user.id },
            orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        });

        res.json({ automations });
    } catch (err) {
        console.error('[Automations] List error:', err);
        res.status(500).json({ error: { message: 'Error fetching automations' } });
    }
});

// ==========================================
// POST /api/automations - Create automation
// ==========================================
router.post('/', checkAutomationLimit, async (req, res) => {
    try {
        const { name, trigger, response, matchType, enabled, priority } = req.body;

        if (!name || !trigger || !response) {
            return res.status(400).json({
                error: { message: 'name, trigger, and response are required' },
            });
        }

        const automation = await prisma.automation.create({
            data: {
                userId: req.user.id,
                name,
                trigger,
                response,
                matchType: matchType || 'CONTAINS',
                enabled: enabled !== false,
                priority: priority || 0,
            },
        });

        res.status(201).json({ automation });
    } catch (err) {
        console.error('[Automations] Create error:', err);
        res.status(500).json({ error: { message: 'Error creating automation' } });
    }
});

// ==========================================
// PUT /api/automations/:id - Update automation
// ==========================================
router.put('/:id', async (req, res) => {
    try {
        const { name, trigger, response, matchType, enabled, priority } = req.body;

        const automation = await prisma.automation.findFirst({
            where: { id: req.params.id, userId: req.user.id },
        });

        if (!automation) {
            return res.status(404).json({ error: { message: 'Automation not found' } });
        }

        const updated = await prisma.automation.update({
            where: { id: automation.id },
            data: {
                ...(name && { name }),
                ...(trigger && { trigger }),
                ...(response && { response }),
                ...(matchType && { matchType }),
                ...(enabled !== undefined && { enabled }),
                ...(priority !== undefined && { priority }),
            },
        });

        res.json({ automation: updated });
    } catch (err) {
        console.error('[Automations] Update error:', err);
        res.status(500).json({ error: { message: 'Error updating automation' } });
    }
});

// ==========================================
// PATCH /api/automations/:id/toggle - Toggle enabled
// ==========================================
router.patch('/:id/toggle', async (req, res) => {
    try {
        const automation = await prisma.automation.findFirst({
            where: { id: req.params.id, userId: req.user.id },
        });

        if (!automation) {
            return res.status(404).json({ error: { message: 'Automation not found' } });
        }

        const updated = await prisma.automation.update({
            where: { id: automation.id },
            data: { enabled: !automation.enabled },
        });

        res.json({ automation: updated });
    } catch (err) {
        console.error('[Automations] Toggle error:', err);
        res.status(500).json({ error: { message: 'Error toggling automation' } });
    }
});

// ==========================================
// DELETE /api/automations/:id - Delete automation
// ==========================================
router.delete('/:id', async (req, res) => {
    try {
        const automation = await prisma.automation.findFirst({
            where: { id: req.params.id, userId: req.user.id },
        });

        if (!automation) {
            return res.status(404).json({ error: { message: 'Automation not found' } });
        }

        await prisma.automation.delete({ where: { id: automation.id } });

        res.json({ message: 'Automation deleted' });
    } catch (err) {
        console.error('[Automations] Delete error:', err);
        res.status(500).json({ error: { message: 'Error deleting automation' } });
    }
});

module.exports = router;
