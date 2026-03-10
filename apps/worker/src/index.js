require('dotenv').config({ path: '../../.env.example' });

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

console.log('🔧 SaaS WhatsApp Worker started');
console.log('📋 Processing background jobs...\n');

/**
 * Worker process for handling background tasks:
 * - Scheduled message campaigns
 * - Message queue processing
 * - Analytics aggregation
 * - Session health checks
 */

// Session health check - runs every 5 minutes
async function checkSessionHealth() {
    try {
        const sessions = await prisma.whatsAppSession.findMany({
            where: { status: 'CONNECTED' },
        });

        console.log(`[Worker] Health check: ${sessions.length} active sessions`);

        for (const session of sessions) {
            // In production, you'd ping the actual WhatsApp client
            console.log(`  ✓ Session ${session.sessionName} (${session.id})`);
        }
    } catch (err) {
        console.error('[Worker] Health check error:', err);
    }
}

// Stats aggregation
async function aggregateStats() {
    try {
        const [users, sessions, messages, automations] = await Promise.all([
            prisma.user.count(),
            prisma.whatsAppSession.count(),
            prisma.message.count(),
            prisma.automation.count(),
        ]);

        console.log(`[Worker] Stats: ${users} users, ${sessions} sessions, ${messages} messages, ${automations} automations`);
    } catch (err) {
        console.error('[Worker] Stats aggregation error:', err);
    }
}

// Process scheduled campaigns (placeholder for future implementation)
async function processScheduledCampaigns() {
    // This would process any scheduled bulk messaging campaigns
    // For now, it's a placeholder
    console.log('[Worker] Checking scheduled campaigns...');
}

// Run periodic tasks
setInterval(checkSessionHealth, 5 * 60 * 1000); // Every 5 minutes
setInterval(aggregateStats, 15 * 60 * 1000); // Every 15 minutes
setInterval(processScheduledCampaigns, 60 * 1000); // Every minute

// Initial run
checkSessionHealth();
aggregateStats();

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n[Worker] Shutting down...');
    await prisma.$disconnect();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await prisma.$disconnect();
    process.exit(0);
});
