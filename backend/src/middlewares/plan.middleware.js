const { pool } = require('../config/database');

const PLAN_LIMITS = {
    FREE: { maxSessions: 1, maxMessagesPerMonth: 100, maxAutomations: 3, maxContacts: 50 },
    STARTER: { maxSessions: 3, maxMessagesPerMonth: 1000, maxAutomations: 10, maxContacts: 500 },
    PRO: { maxSessions: 10, maxMessagesPerMonth: Infinity, maxAutomations: Infinity, maxContacts: Infinity },
    ENTERPRISE: { maxSessions: Infinity, maxMessagesPerMonth: Infinity, maxAutomations: Infinity, maxContacts: Infinity },
};

function getPlanLimits(plan) {
    return PLAN_LIMITS[plan] || PLAN_LIMITS.FREE;
}

function checkSessionLimit(req, res, next) {
    return checkLimit('sessions', req, res, next);
}

function checkAutomationLimit(req, res, next) {
    return checkLimit('automations', req, res, next);
}

function checkContactLimit(req, res, next) {
    return checkLimit('contacts', req, res, next);
}

async function checkMessageLimit(req, res, next) {
    try {
        const [users] = await pool.execute('SELECT plan FROM users WHERE id = ?', [req.user.id]);
        const limits = getPlanLimits(users[0]?.plan);

        if (limits.maxMessagesPerMonth === Infinity) return next();

        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const [[{ c: count }]] = await pool.execute(
            `SELECT COUNT(*) as c FROM messages m
             JOIN whatsapp_sessions s ON m.session_id = s.id
             WHERE s.user_id = ? AND m.direction = 'OUTBOUND' AND m.created_at >= ?`,
            [req.user.id, startOfMonth]
        );

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
        next();
    }
}

async function checkLimit(resource, req, res, next) {
    try {
        const [users] = await pool.execute('SELECT plan FROM users WHERE id = ?', [req.user.id]);
        const limits = getPlanLimits(users[0]?.plan);

        let count, max, label;

        switch (resource) {
            case 'sessions':
                max = limits.maxSessions;
                label = 'sesiones WhatsApp';
                if (max === Infinity) return next();
                { const [[{ c }]] = await pool.execute('SELECT COUNT(*) as c FROM whatsapp_sessions WHERE user_id = ?', [req.user.id]); count = c; }
                break;
            case 'automations':
                max = limits.maxAutomations;
                label = 'automatizaciones';
                if (max === Infinity) return next();
                { const [[{ c }]] = await pool.execute('SELECT COUNT(*) as c FROM automations WHERE user_id = ?', [req.user.id]); count = c; }
                break;
            case 'contacts':
                max = limits.maxContacts;
                label = 'contactos';
                if (max === Infinity) return next();
                { const [[{ c }]] = await pool.execute('SELECT COUNT(*) as c FROM contacts WHERE user_id = ?', [req.user.id]); count = c; }
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
