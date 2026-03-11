const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error('❌ FATAL: JWT_SECRET not set in .env');
    process.exit(1);
}

/**
 * Authentication middleware - validates JWT token
 */
function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: { message: 'Access token required' } });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: { message: 'Invalid or expired token' } });
    }
}

/**
 * Generate JWT token for a user
 */
function generateToken(user) {
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            plan: user.plan,
        },
        JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRATION || '7d' }
    );
}

module.exports = { authenticate, generateToken, JWT_SECRET };
