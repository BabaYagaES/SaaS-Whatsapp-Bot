const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { pool, generateId, toCamelCase } = require('../../config/database');
const { generateToken, authenticate } = require('../../middlewares/auth.middleware');

const router = express.Router();

// POST /api/auth/register
router.post(
    '/register',
    [
        body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
        body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
        body('name').optional().trim().isLength({ min: 2 }),
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { email, password, name } = req.body;

            const [existing] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
            if (existing.length > 0) {
                return res.status(409).json({ error: { message: 'Email already registered' } });
            }

            const hashedPassword = await bcrypt.hash(password, 12);
            const id = generateId();

            await pool.execute(
                'INSERT INTO users (id, email, password, name) VALUES (?, ?, ?, ?)',
                [id, email, hashedPassword, name || email.split('@')[0]]
            );

            const [[row]] = await pool.execute(
                'SELECT id, email, name, plan, created_at FROM users WHERE id = ?',
                [id]
            );
            const user = toCamelCase(row);
            const token = generateToken(user);

            res.status(201).json({ message: 'Account created successfully', user, token });
        } catch (err) {
            console.error('[Auth] Register error:', err);
            res.status(500).json({ error: { message: 'Error creating account' } });
        }
    }
);

// POST /api/auth/login
router.post(
    '/login',
    [
        body('email').isEmail().normalizeEmail(),
        body('password').notEmpty(),
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { email, password } = req.body;

            const [rows] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
            if (rows.length === 0) {
                return res.status(401).json({ error: { message: 'Invalid email or password' } });
            }

            const dbUser = rows[0];
            const isValid = await bcrypt.compare(password, dbUser.password);
            if (!isValid) {
                return res.status(401).json({ error: { message: 'Invalid email or password' } });
            }

            const user = { 
                id: dbUser.id, 
                email: dbUser.email, 
                name: dbUser.name, 
                plan: dbUser.plan,
                businessType: dbUser.business_type,
                businessName: dbUser.business_name,
                businessDescription: dbUser.business_description
            };
            const token = generateToken(user);

            res.json({ message: 'Login successful', user, token });
        } catch (err) {
            console.error('[Auth] Login error:', err);
            res.status(500).json({ error: { message: 'Error logging in' } });
        }
    }
);

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT id, email, name, plan, avatar, business_type, business_name, business_description, created_at FROM users WHERE id = ?',
            [req.user.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: { message: 'User not found' } });
        }

        res.json({ user: toCamelCase(rows[0]) });
    } catch (err) {
        console.error('[Auth] Me error:', err);
        res.status(500).json({ error: { message: 'Error fetching user' } });
    }
});

// PUT /api/auth/password
router.put(
    '/password',
    authenticate,
    [
        body('currentPassword').notEmpty().withMessage('Current password required'),
        body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { currentPassword, newPassword } = req.body;

            const [rows] = await pool.execute('SELECT id, password FROM users WHERE id = ?', [req.user.id]);
            if (rows.length === 0) {
                return res.status(404).json({ error: { message: 'User not found' } });
            }

            const isValid = await bcrypt.compare(currentPassword, rows[0].password);
            if (!isValid) {
                return res.status(401).json({ error: { message: 'La contraseña actual es incorrecta' } });
            }

            const hashedPassword = await bcrypt.hash(newPassword, 12);
            await pool.execute('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.user.id]);

            res.json({ message: 'Contraseña actualizada correctamente' });
        } catch (err) {
            console.error('[Auth] Change password error:', err);
            res.status(500).json({ error: { message: 'Error changing password' } });
        }
    }
);

module.exports = router;
