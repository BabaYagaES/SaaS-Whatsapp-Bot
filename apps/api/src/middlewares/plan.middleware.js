const { prisma } = require('../config/database');

/**
 * Plan limits configuration
 */
const PLAN_LIMITS = {
    FREE: {
        maxSessions: 1,
        maxMessagesPerMonth: 100,
        maxAutomations: 3,
        maxContacts: 50,
    },
    STARTER: {
        maxSessions: 3,
        maxMessagesPerMonth: 1000,
        maxAutomations: 10,
        maxContacts: 500,
    },
    PRO: {
        maxSessions: 10,
        maxMessagesPerMonth: Infinity,
        maxAutomations: Infinity,
        maxContacts: Infinity,
    },
    ENTERPRISE: {
        maxSessions: Infinity,
        maxMessagesPerMonth: Infinity,
        maxAutomations: Infinity,
        maxContacts: Infinity,
    },
};

/**
 * Get the limits for a user's plan
 */
function getPlanLimits(plan) {
    return PLAN_LIMITS[plan] || PLAN_LIMITS.FREE;
}

/**
 * Middleware: Check if user can create more sessions
 */
function checkSessionLimit(req, res, next) {
    return checkLimit('sessions', req, res, next);
}

/**
 * Middleware: Check if user can create more automations
 */
function checkAutomationLimit(req, res, next) {
    return checkLimit('automations', req, res, next);
}

/**
 * Middleware: Check if user can create more contacts
 */
function checkContactLimit(req, res, next) {
    return checkLimit('contacts', req, res, next);
}

/**
 * Middleware: Check if user can send more messages this month
 */
async function checkMessageLimit(req, res, next) {
    try {
        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        const limits = getPlanLimits(user?.plan);

        if (limits.maxMessagesPerMonth === Infinity) return next();

        // Count messages this month
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const count = await prisma.message.count({
            where: {
                session: { userId: req.user.id },
                direction: 'OUTBOUND',
                createdAt: { gte: startOfMonth },
            },
        });

        if (count >= limits.maxMessagesPerMonth) {
            return res.status(403).json({
                error: {
                    message: `Límite de mensajes alcanzado (${limits.maxMessagesPerMonth}/mes). Upgrade tu plan.`,
                    code: 'PLAN_LIMIT',
                    limit: limits.maxMessagesPerMonth,
                    current: count,
                },
            });
        }

        next();
    } catch (err) {
        console.error('[PlanLimits] Message check error:', err);
        next(); // Don't block on error
    }
}

/**
 * Generic limit checker
 */
async function checkLimit(resource, req, res, next) {
    try {
        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        const limits = getPlanLimits(user?.plan);

        let count, max, label;

        switch (resource) {
            case 'sessions':
                max = limits.maxSessions;
                label = 'sesiones WhatsApp';
                if (max === Infinity) return next();
                count = await prisma.whatsAppSession.count({ where: { userId: req.user.id } });
                break;
            case 'automations':
                max = limits.maxAutomations;
                label = 'automatizaciones';
                if (max === Infinity) return next();
                count = await prisma.automation.count({ where: { userId: req.user.id } });
                break;
            case 'contacts':
                max = limits.maxContacts;
                label = 'contactos';
                if (max === Infinity) return next();
                count = await prisma.contact.count({ where: { userId: req.user.id } });
                break;
            default:
                return next();
        }

        if (count >= max) {
            return res.status(403).json({
                error: {
                    message: `Límite de ${label} alcanzado (${max}). Upgrade tu plan.`,
                    code: 'PLAN_LIMIT',
                    limit: max,
                    current: count,
                },
            });
        }

        next();
    } catch (err) {
        console.error(`[PlanLimits] ${resource} check error:`, err);
        next();
    }
}

module.exports = {
    PLAN_LIMITS,
    getPlanLimits,
    checkSessionLimit,
    checkAutomationLimit,
    checkContactLimit,
    checkMessageLimit,
};
