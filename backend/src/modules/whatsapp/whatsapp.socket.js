const { whatsappManager } = require('../../lib/whatsapp');
const { pool, generateId, toCamelCase } = require('../../config/database');

function setupWhatsAppEvents(io) {
    // QR Code generated
    whatsappManager.on('qr', async ({ userId, sessionId, qr }) => {
        console.log(`[WS] Emitting QR for user ${userId}`);
        await pool.execute(
            'UPDATE whatsapp_sessions SET status = ?, qr_code = ? WHERE id = ?',
            ['QR_READY', qr, sessionId]
        );
        io.to(`user:${userId}`).emit('whatsapp:qr', { sessionId, qr });
    });

    // Session ready (connected)
    whatsappManager.on('ready', async ({ userId, sessionId, phone }) => {
        console.log(`[WS] Session ${sessionId} connected for user ${userId}`);
        await pool.execute(
            'UPDATE whatsapp_sessions SET status = ?, phone = ?, qr_code = NULL WHERE id = ?',
            ['CONNECTED', phone, sessionId]
        );
        io.to(`user:${userId}`).emit('whatsapp:ready', { sessionId, phone });
    });

    // Session disconnected
    whatsappManager.on('disconnected', async ({ userId, sessionId, reason }) => {
        console.log(`[WS] Session ${sessionId} disconnected for user ${userId}`);
        try {
            await pool.execute('UPDATE whatsapp_sessions SET status = ? WHERE id = ?', ['DISCONNECTED', sessionId]);
        } catch (e) {
            // Session might have been deleted
        }
        io.to(`user:${userId}`).emit('whatsapp:disconnected', { sessionId, reason });
    });

    // Incoming message
    whatsappManager.on('message', async ({ userId, sessionId, from, originalFrom, contactName, body, timestamp }) => {
        console.log(`[WS] New message for user ${userId} from ${from} (${contactName || 'no name'})`);

        try {
            const phone = from.replace(/@c\.us$/, '').replace(/@lid$/, '').replace(/@g\.us$/, '');

            // Find or create contact
            const [contacts] = await pool.execute(
                'SELECT id, name FROM contacts WHERE user_id = ? AND phone = ?',
                [userId, phone]
            );

            let contact;
            if (contacts.length === 0) {
                const contactId = generateId();
                await pool.execute(
                    'INSERT INTO contacts (id, user_id, phone, name, tags) VALUES (?, ?, ?, ?, ?)',
                    [contactId, userId, phone, contactName || null, '[]']
                );
                contact = { id: contactId, phone, name: contactName || null };
            } else {
                contact = contacts[0];
                if (!contact.name && contactName) {
                    await pool.execute('UPDATE contacts SET name = ? WHERE id = ?', [contactName, contact.id]);
                    contact.name = contactName;
                }
            }

            // Save message
            const msgId = generateId();
            const msgTimestamp = new Date(timestamp * 1000);
            await pool.execute(
                'INSERT INTO messages (id, session_id, contact_id, direction, body, status, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [msgId, sessionId, contact.id, 'INBOUND', body || '', 'DELIVERED', msgTimestamp]
            );

            const message = {
                id: msgId,
                sessionId,
                contactId: contact.id,
                direction: 'INBOUND',
                body: body || '',
                status: 'DELIVERED',
                timestamp: msgTimestamp,
                contact: { id: contact.id, phone, name: contact.name },
            };

            io.to(`user:${userId}`).emit('whatsapp:message', { sessionId, message });

            // Check automations
            await processAutomations(userId, sessionId, from, body);
        } catch (err) {
            console.error('[WS] Error processing incoming message:', err);
        }
    });

    // Auth failure
    whatsappManager.on('auth_failure', async ({ userId, sessionId, error }) => {
        await pool.execute('UPDATE whatsapp_sessions SET status = ? WHERE id = ?', ['DISCONNECTED', sessionId]);
        io.to(`user:${userId}`).emit('whatsapp:error', { sessionId, error: 'Authentication failed' });
    });

    console.log('[WhatsApp] Event listeners configured');
}

async function processAutomations(userId, sessionId, from, body) {
    if (!body) return;

    try {
        const [automations] = await pool.execute(
            'SELECT * FROM automations WHERE user_id = ? AND enabled = TRUE ORDER BY priority DESC',
            [userId]
        );

        for (const auto of automations) {
            let matched = false;

            switch (auto.match_type) {
                case 'EXACT':
                    matched = body.toLowerCase() === auto.trigger.toLowerCase();
                    break;
                case 'CONTAINS':
                    matched = body.toLowerCase().includes(auto.trigger.toLowerCase());
                    break;
                case 'STARTS_WITH':
                    matched = body.toLowerCase().startsWith(auto.trigger.toLowerCase());
                    break;
                case 'REGEX':
                    try {
                        const regex = new RegExp(auto.trigger, 'i');
                        matched = regex.test(body);
                    } catch (e) { }
                    break;
            }

            if (matched) {
                console.log(`[Automation] Triggered: "${auto.name}" for message: "${body}"`);

                try {
                    await whatsappManager.sendMessage(sessionId, from, auto.response);

                    const phone = from.replace(/@c\.us$/, '').replace(/@lid$/, '').replace(/@g\.us$/, '');
                    const [contacts] = await pool.execute(
                        'SELECT id FROM contacts WHERE user_id = ? AND phone = ?',
                        [userId, phone]
                    );

                    const msgId = generateId();
                    await pool.execute(
                        'INSERT INTO messages (id, session_id, contact_id, direction, body, status) VALUES (?, ?, ?, ?, ?, ?)',
                        [msgId, sessionId, contacts[0]?.id || null, 'OUTBOUND', auto.response, 'SENT']
                    );
                } catch (err) {
                    console.error('[Automation] Error sending auto-reply:', err);
                }

                break; // Only first matching automation
            }
        }
    } catch (err) {
        console.error('[Automation] Error processing:', err);
    }
}

module.exports = { setupWhatsAppEvents };
