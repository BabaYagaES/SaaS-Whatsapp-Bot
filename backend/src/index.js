const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

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
const { pool, initDatabase } = require('./config/database');
const { whatsappManager } = require('./lib/whatsapp');

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
    windowMs: 1 * 60 * 1000,
    max: 100,
    message: { error: { message: 'Too many requests, please try again later' } },
    standardHeaders: true,
    legacyHeaders: false,
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: { message: 'Too many auth attempts, try again in 15 minutes' } },
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
// Routes
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
// Worker: Background tasks (integrated)
// ==========================================
async function checkSessionHealth() {
    try {
        const [sessions] = await pool.execute(
            'SELECT id, session_name FROM whatsapp_sessions WHERE status = ?',
            ['CONNECTED']
        );
        console.log(`[Worker] Health check: ${sessions.length} active sessions`);
        for (const s of sessions) {
            console.log(`  ✓ Session ${s.session_name} (${s.id})`);
        }
    } catch (err) {
        console.error('[Worker] Health check error:', err);
    }
}

async function aggregateStats() {
    try {
        const [[{ c: users }]] = await pool.execute('SELECT COUNT(*) as c FROM users');
        const [[{ c: sessions }]] = await pool.execute('SELECT COUNT(*) as c FROM whatsapp_sessions');
        const [[{ c: messages }]] = await pool.execute('SELECT COUNT(*) as c FROM messages');
        const [[{ c: automations }]] = await pool.execute('SELECT COUNT(*) as c FROM automations');
        console.log(`[Worker] Stats: ${users} users, ${sessions} sessions, ${messages} messages, ${automations} automations`);
    } catch (err) {
        console.error('[Worker] Stats aggregation error:', err);
    }
}

async function processScheduledCampaigns() {
    // Placeholder for future campaign scheduling
}

// ==========================================
// Auto-reconnect WhatsApp sessions on startup
// ==========================================
async function reconnectSessions() {
    try {
        // Get all session IDs from DB to clean orphaned folders
        const [allSessions] = await pool.execute('SELECT id FROM whatsapp_sessions');
        const activeIds = allSessions.map(s => s.id);
        await whatsappManager.cleanOrphanedSessions(activeIds);

        const [sessions] = await pool.execute(
            'SELECT id, user_id, session_name FROM whatsapp_sessions WHERE status = ?',
            ['CONNECTED']
        );

        if (sessions.length === 0) {
            console.log('[WhatsApp] No sessions to reconnect');
            return;
        }

        console.log(`[WhatsApp] Reconnecting ${sessions.length} session(s)...`);

        for (const session of sessions) {
            try {
                console.log(`[WhatsApp] Reconnecting: ${session.session_name} (${session.id})`);
                await whatsappManager.createSession(session.user_id, session.id);
            } catch (err) {
                console.error(`[WhatsApp] Failed to reconnect ${session.session_name}:`, err.message);
                await pool.execute(
                    'UPDATE whatsapp_sessions SET status = ? WHERE id = ?',
                    ['DISCONNECTED', session.id]
                );
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

async function start() {
    await initDatabase();

    server.listen(PORT, () => {
        console.log(`\n🚀 SaaS WhatsApp API running on http://localhost:${PORT}`);
        console.log(`📡 WebSocket server ready`);
        console.log(`🔒 Rate limiting active`);
        console.log(`🔧 Worker tasks integrated`);
        console.log(`💚 Health: http://localhost:${PORT}/api/health\n`);

        // Start worker periodic tasks
        setInterval(checkSessionHealth, 5 * 60 * 1000);
        setInterval(aggregateStats, 15 * 60 * 1000);
        setInterval(processScheduledCampaigns, 60 * 1000);
        checkSessionHealth();
        aggregateStats();

        // Auto-reconnect sessions after server starts
        setTimeout(reconnectSessions, 3000);
    });
}

start().catch((err) => {
    console.error('[Fatal] Failed to start server:', err);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n[Server] Shutting down...');
    await whatsappManager.disconnectAll();
    await pool.end();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await whatsappManager.disconnectAll();
    await pool.end();
    process.exit(0);
});

module.exports = { app, server, io };
