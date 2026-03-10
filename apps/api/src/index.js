const path = require('path');
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const http = require('http');
const { Server } = require('socket.io');
const rateLimit = require('express-rate-limit');

// Routes
const authRoutes = require('./modules/auth/auth.routes');
const userRoutes = require('./modules/users/users.routes');
const whatsappRoutes = require('./modules/whatsapp/whatsapp.routes');
const contactRoutes = require('./modules/contacts/contacts.routes');
const messageRoutes = require('./modules/messages/messages.routes');
const automationRoutes = require('./modules/automations/automations.routes');
const reportRoutes = require('./modules/reports/reports.routes');

// WhatsApp Manager & Socket setup
const { setupWhatsAppEvents } = require('./modules/whatsapp/whatsapp.socket');
const { prisma } = require('./config/database');
const { whatsappManager } = require('../../../packages/whatsapp');

const app = express();
const server = http.createServer(app);

// Socket.IO
const io = new Server(server, {
    cors: {
        origin: ['http://localhost:3000', 'http://localhost:3001'],
        methods: ['GET', 'POST'],
    },
});

// ==========================================
// Rate Limiting
// ==========================================
const generalLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100,
    message: { error: { message: 'Too many requests, please try again later' } },
    standardHeaders: true,
    legacyHeaders: false,
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 login/register attempts per 15 min
    message: { error: { message: 'Too many auth attempts, try again in 15 minutes' } },
    standardHeaders: true,
    legacyHeaders: false,
});

const messageLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30, // 30 messages per minute
    message: { error: { message: 'Sending too fast, slow down' } },
    standardHeaders: true,
    legacyHeaders: false,
});

// ==========================================
// Middleware
// ==========================================
app.use(helmet());
app.use(cors({
    origin: ['http://localhost:3000'],
    credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(generalLimiter);

// Make io accessible to routes
app.set('io', io);

// ==========================================
// Routes (with specific rate limits)
// ==========================================
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/automations', automationRoutes);
app.use('/api/reports', reportRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('[API Error]', err);
    res.status(err.status || 500).json({
        error: {
            message: err.message || 'Internal Server Error',
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
        },
    });
});

// ==========================================
// Socket.IO
// ==========================================
io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    socket.on('join', (userId) => {
        socket.join(`user:${userId}`);
        console.log(`[Socket] User ${userId} joined their room`);
    });

    socket.on('disconnect', () => {
        console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
});

// Setup WhatsApp events → Socket.IO
setupWhatsAppEvents(io);

// ==========================================
// Auto-reconnect WhatsApp sessions on startup
// ==========================================
async function reconnectSessions() {
    try {
        const sessions = await prisma.whatsAppSession.findMany({
            where: { status: 'CONNECTED' },
        });

        if (sessions.length === 0) {
            console.log('[WhatsApp] No sessions to reconnect');
            return;
        }

        console.log(`[WhatsApp] Reconnecting ${sessions.length} session(s)...`);

        for (const session of sessions) {
            try {
                console.log(`[WhatsApp] Reconnecting: ${session.sessionName} (${session.id})`);
                await whatsappManager.createSession(session.userId, session.id);
            } catch (err) {
                console.error(`[WhatsApp] Failed to reconnect ${session.sessionName}:`, err.message);
                // Mark as disconnected if reconnection fails
                await prisma.whatsAppSession.update({
                    where: { id: session.id },
                    data: { status: 'DISCONNECTED' },
                });
            }
        }
    } catch (err) {
        console.error('[WhatsApp] Reconnection error:', err);
    }
}

// ==========================================
// Start server
// ==========================================
const PORT = process.env.API_PORT || 3001;
server.listen(PORT, () => {
    console.log(`\n🚀 SaaS WhatsApp API running on http://localhost:${PORT}`);
    console.log(`📡 WebSocket server ready`);
    console.log(`🔒 Rate limiting active`);
    console.log(`💚 Health: http://localhost:${PORT}/api/health\n`);

    // Auto-reconnect sessions after server starts
    setTimeout(reconnectSessions, 3000);
});

module.exports = { app, server, io };
