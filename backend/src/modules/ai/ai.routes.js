const express = require('express');
const { authenticate } = require('../../middlewares/auth.middleware');
const { generateResponse, generateTemplates } = require('../../lib/ai');
const { pool } = require('../../config/database');

const router = express.Router();

router.use(authenticate);

// POST /api/ai/chat
router.post('/chat', async (req, res) => {
    try {
        const { message } = req.body;
        
        // Get user business info for context
        const [users] = await pool.execute(
            'SELECT business_type, business_name, business_description FROM users WHERE id = ?',
            [req.user.id]
        );
        
        const context = users[0] || {};
        const response = await generateResponse(message, {
            businessType: context.business_type,
            businessName: context.business_name,
            businessDescription: context.business_description
        });
        
        res.json({ response });
    } catch (err) {
        console.error('[AI Route] Chat error:', err);
        res.status(500).json({ error: { message: 'Error processing AI request' } });
    }
});

// POST /api/ai/generate-templates
router.post('/generate-templates', async (req, res) => {
    try {
        const { businessType, businessName, businessDescription, save = false } = req.body;
        
        const templates = await generateTemplates({
            businessType,
            businessName,
            businessDescription
        });

        if (save) {
            const { generateId } = require('../../config/database');
            for (const tpl of templates) {
                const autoId = generateId();
                // We create them as AI-powered automations if saved this way, 
                // using the content as a "base" or just as a normal automation
                await pool.execute(
                    'INSERT INTO automations (id, user_id, name, \`trigger\`, response, match_type, is_ai) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [autoId, req.user.id, tpl.name, tpl.keywords || tpl.name, tpl.content, 'CONTAINS', true]
                );
            }
        }
        
        res.json({ templates });
    } catch (err) {
        console.error('[AI Route] Template error:', err);
        res.status(500).json({ error: { message: 'Error generating templates' } });
    }
});

module.exports = router;
