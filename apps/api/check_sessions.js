const { whatsappManager } = require('../../packages/whatsapp');

console.log('Active sessions in memory:', whatsappManager.getActiveSessions());
console.log('Sessions map size:', whatsappManager.sessions.size);

for (const [id, session] of whatsappManager.sessions) {
    console.log(`Session ${id}:`, {
        userId: session.userId,
        hasClient: !!session.client,
        hasPupPage: !!session.client?.pupPage,
    });
}
