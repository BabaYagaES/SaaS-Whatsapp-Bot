const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { prisma } = require('../../config/database');
const { generateToken } = require('../../middlewares/auth.middleware');

const router = express.Router();

// ==========================================
// POST /api/auth/register
// ==========================================
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

            // Check if user already exists
            const existingUser = await prisma.user.findUnique({ where: { email } });
            if (existingUser) {
                return res.status(409).json({ error: { message: 'Email already registered' } });
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 12);

            // Create user
            const user = await prisma.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    name: name || email.split('@')[0],
                },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    plan: true,
                    createdAt: true,
                },
            });

            // Generate token
            const token = generateToken(user);

            res.status(201).json({
                message: 'Account created successfully',
                user,
                token,
            });
        } catch (err) {
            console.error('[Auth] Register error:', err);
            res.status(500).json({ error: { message: 'Error creating account' } });
        }
    }
);

// ==========================================
// POST /api/auth/login
// ==========================================
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

            // Find user
            const user = await prisma.user.findUnique({ where: { email } });
            if (!user) {
                return res.status(401).json({ error: { message: 'Invalid email or password' } });
            }

            // Verify password
            const isValid = await bcrypt.compare(password, user.password);
            if (!isValid) {
                return res.status(401).json({ error: { message: 'Invalid email or password' } });
            }

            // Generate token
            const token = generateToken(user);

            res.json({
                message: 'Login successful',
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    plan: user.plan,
                },
                token,
            });
        } catch (err) {
            console.error('[Auth] Login error:', err);
            res.status(500).json({ error: { message: 'Error logging in' } });
        }
    }
);

// ==========================================
// GET /api/auth/me
// ==========================================
const { authenticate } = require('../../middlewares/auth.middleware');

router.get('/me', authenticate, async (req, res) => {
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
            },
        });

        if (!user) {
            return res.status(404).json({ error: { message: 'User not found' } });
        }

        res.json({ user });
    } catch (err) {
        console.error('[Auth] Me error:', err);
        res.status(500).json({ error: { message: 'Error fetching user' } });
    }
});

// ==========================================
// PUT /api/auth/password - Change password
// ==========================================
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

            // Get user with password
            const user = await prisma.user.findUnique({ where: { id: req.user.id } });
            if (!user) {
                return res.status(404).json({ error: { message: 'User not found' } });
            }

            // Verify current password
            const isValid = await bcrypt.compare(currentPassword, user.password);
            if (!isValid) {
                return res.status(401).json({ error: { message: 'La contraseña actual es incorrecta' } });
            }

            // Hash new password
            const hashedPassword = await bcrypt.hash(newPassword, 12);

            // Update password
            await prisma.user.update({
                where: { id: user.id },
                data: { password: hashedPassword },
            });

            res.json({ message: 'Contraseña actualizada correctamente' });
        } catch (err) {
            console.error('[Auth] Change password error:', err);
            res.status(500).json({ error: { message: 'Error changing password' } });
        }
    }
);

module.exports = router;
