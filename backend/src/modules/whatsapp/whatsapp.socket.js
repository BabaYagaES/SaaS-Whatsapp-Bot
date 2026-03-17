const fs = require('fs');
const path = require('path');
const { whatsappManager } = require('../../lib/whatsapp');
const { pool, generateId, toCamelCase } = require('../../config/database');
const { generateResponse, conversationMemory } = require('../../lib/ai');

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

            // Create notification for new message
            const notifId = generateId();
            const notifTitle = `Nuevo mensaje de ${contact.name || contact.phone}`;
            const notifMsg = body ? (body.length > 50 ? body.substring(0, 50) + '...' : body) : 'Archivo recibido';
            
            await pool.execute(
                'INSERT INTO notifications (id, user_id, type, title, message, link) VALUES (?, ?, ?, ?, ?, ?)',
                [notifId, userId, 'MESSAGE', notifTitle, notifMsg, `/dashboard/conversations?contactId=${contact.id}`]
            );
            io.to(`user:${userId}`).emit('notification:new', {
                id: notifId,
                type: 'MESSAGE',
                title: notifTitle,
                message: notifMsg,
                link: `/dashboard/conversations?contactId=${contact.id}`,
                createdAt: new Date(),
                isRead: false
            });

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
        const phone = from.replace(/@c\.us$/, '').replace(/@lid$/, '').replace(/@g\.us$/, '');
        
        // 1. Get contact and check AI status
        const [contacts] = await pool.execute(
            'SELECT id, name, ai_active, last_ai_at FROM contacts WHERE user_id = ? AND phone = ?',
            [userId, phone]
        );
        const contact = contacts[0];
        if (!contact) return;

        let shouldAiRespond = false;
        
        // Check if AI is already active and not expired (30 min)
        const now = new Date();
        const thirtyMinsAgo = new Date(now.getTime() - 30 * 60 * 1000);
        
        if (contact.ai_active && contact.last_ai_at && contact.last_ai_at > thirtyMinsAgo) {
            shouldAiRespond = true;
        }

        // 2. If not already in AI mode, check triggers
        if (!shouldAiRespond) {
            const [automations] = await pool.execute(
                'SELECT * FROM automations WHERE user_id = ? AND enabled = TRUE ORDER BY priority DESC',
                [userId]
            );

            for (const auto of automations) {
                const triggers = (auto.trigger || '').split(',').map(t => t.trim().toLowerCase());
                const lowerBody = body.toLowerCase();
                let matched = false;

                switch (auto.match_type) {
                    case 'EXACT': matched = triggers.some(t => lowerBody === t); break;
                    case 'CONTAINS': matched = triggers.some(t => lowerBody.includes(t)); break;
                    case 'STARTS_WITH': matched = triggers.some(t => lowerBody.startsWith(t)); break;
                    case 'REGEX': try { matched = new RegExp(auto.trigger, 'i').test(body); } catch(e){} break;
                }

                if (matched) {
                    if (auto.is_ai) {
                        shouldAiRespond = true;
                        // Activate AI session for this contact
                        await pool.execute(
                            'UPDATE contacts SET ai_active = TRUE, last_ai_at = NOW() WHERE id = ?',
                            [contact.id]
                        );
                    } else {
                        // Regular fixed response
                        let mediaBase64 = null;
                        let mediaMimeType = null;
                        let mediaName = null;

                        if (auto.media_url) {
                            try {
                                if (auto.media_url.includes('/uploads/')) {
                                    const fileName = auto.media_url.split('/').pop();
                                    const filePath = path.resolve(__dirname, '../../../../public/uploads', fileName);
                                    if (fs.existsSync(filePath)) {
                                        const fileBuffer = fs.readFileSync(filePath);
                                        mediaBase64 = fileBuffer.toString('base64');
                                        const ext = path.extname(fileName).toLowerCase();
                                        mediaMimeType = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 
                                                        ext === '.png' ? 'image/png' : 
                                                        ext === '.pdf' ? 'application/pdf' : 
                                                        ext === '.mp3' ? 'audio/mpeg' : 'application/octet-stream';
                                        mediaName = fileName;
                                    }
                                }
                            } catch (err) {
                                console.error('[Automation] Error preparing media:', err);
                            }
                        }

                        await whatsappManager.sendMessage(sessionId, from, auto.response, mediaBase64, mediaMimeType, mediaName);
                        await pool.execute(
                            'INSERT INTO messages (id, session_id, contact_id, direction, body, media_url, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
                            [generateId(), sessionId, contact.id, 'OUTBOUND', auto.response || '', auto.media_url || null, 'SENT']
                        );
                        return; // Done
                    }
                    break;
                }
            }
        }

        // 3. AI Execution
        if (shouldAiRespond) {
            // Get business info
            const [users] = await pool.execute(
                'SELECT business_name, business_type, business_description FROM users WHERE id = ?',
                [userId]
            );
            const biz = users[0] || {};

            // Add the incoming message to this contact's conversation memory
            conversationMemory.add(userId, phone, 'user', body);

            // Get the full in-memory history for this conversation
            const history = conversationMemory.get(userId, phone);

            // Get gallery items
            const [gallery] = await pool.execute(
                'SELECT name, tags, url FROM media WHERE user_id = ?',
                [userId]
            );

            let aiResponse = await generateResponse(history, {
                businessName: biz.business_name,
                businessType: biz.business_type,
                businessDescription: biz.business_description,
                gallery: gallery.map(g => ({ name: g.name, tags: g.tags, url: g.url }))
            });

            // 4. Extract Gallery Media if present
            let aiMediaUrl = null;
            let aiMediaBase64 = null;
            let aiMediaMimeType = null;
            let aiMediaName = null;

            const mediaMatch = aiResponse.match(/\[\[SEND_MEDIA:\s*"?(.*?)"?\]\]/);
            if (mediaMatch) {
                aiMediaUrl = mediaMatch[1].trim();
                aiResponse = aiResponse.replace(mediaMatch[0], '').trim();

                try {
                    const fileName = aiMediaUrl.split('/').pop();
                    const filePath = path.resolve(__dirname, '../../../../public/uploads', fileName);
                    if (fs.existsSync(filePath)) {
                        const fileBuffer = fs.readFileSync(filePath);
                        aiMediaBase64 = fileBuffer.toString('base64');
                        const ext = path.extname(fileName).toLowerCase();
                        aiMediaMimeType = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 
                                        ext === '.png' ? 'image/png' : 
                                        ext === '.pdf' ? 'application/pdf' : 
                                        ext === '.mp3' ? 'audio/mpeg' : 'application/octet-stream';
                        aiMediaName = fileName;
                    }
                } catch (err) {
                    console.error('[AI] Error preparing gallery media:', err);
                }
            }

            // 5. Extract Lead/Order Data if present
            const orderMatch = aiResponse.match(/\[\[ORDER_DATA:\s*({[\s\S]*?})\]\]/);
            if (orderMatch) {
                try {
                    const orderData = JSON.parse(orderMatch[1]);
                    // Clean response message to user
                    aiResponse = aiResponse.replace(orderMatch[0], '').trim();
                    
                    // Check for a recent lead for this contact (last 30 mins) to avoid duplicates
                    const [recentLeads] = await pool.execute(
                        'SELECT id FROM leads WHERE contact_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 30 MINUTE) ORDER BY created_at DESC LIMIT 1',
                        [contact.id]
                    );

                    if (recentLeads.length > 0) {
                        // Update existing lead
                        await pool.execute(
                            'UPDATE leads SET notes = ?, order_data = ?, updated_at = NOW() WHERE id = ?',
                            [`Pedido detectado: ${orderData.product || 'Varios'}`, JSON.stringify(orderData), recentLeads[0].id]
                        );
                    } else {
                        // Save new lead
                        await pool.execute(
                            'INSERT INTO leads (id, user_id, contact_id, source, notes, order_data) VALUES (?, ?, ?, ?, ?, ?)',
                            [generateId(), userId, contact.id, 'WhatsApp AI', `Pedido detectado: ${orderData.product || 'Varios'}`, JSON.stringify(orderData)]
                        );

                        // Create notification for new lead
                        const lNotifId = generateId();
                        const lNotifTitle = `¡Nuevo pedido de ${contact.name || contact.phone}!`;
                        const lNotifMsg = `${orderData.product || 'Varios'}${orderData.total ? ' - ' + orderData.total : ''}`;
                        
                        await pool.execute(
                            'INSERT INTO notifications (id, user_id, type, title, message, link) VALUES (?, ?, ?, ?, ?, ?)',
                            [lNotifId, userId, 'LEAD', lNotifTitle, lNotifMsg, '/dashboard/leads']
                        );
                        io.to(`user:${userId}`).emit('notification:new', {
                            id: lNotifId,
                            type: 'LEAD',
                            title: lNotifTitle,
                            message: lNotifMsg,
                            link: '/dashboard/leads',
                            createdAt: new Date(),
                            isRead: false
                        });
                    }

                    // Update contact info with latest address and last order details
                    const updates = [];
                    const params = [];
                    
                    if (orderData.address) {
                        updates.push('address = ?');
                        params.push(orderData.address);
                    }
                    if (orderData.name && !contact.name) {
                        updates.push('name = ?');
                        params.push(orderData.name);
                    }
                    
                    updates.push('last_order_details = ?');
                    params.push(JSON.stringify(orderData));
                    
                    updates.push('is_lead = TRUE');

                    if (updates.length > 0) {
                        params.push(contact.id);
                        await pool.execute(
                            `UPDATE contacts SET ${updates.join(', ')} WHERE id = ?`,
                            params
                        );
                    }
                } catch (e) {
                    console.error('[AI] Lead extraction failed:', e);
                }
            }

            // Add AI response to conversation memory
            conversationMemory.add(userId, phone, 'assistant', aiResponse);

            // 5. Send and Save
            await whatsappManager.sendMessage(sessionId, from, aiResponse, aiMediaBase64, aiMediaMimeType, aiMediaName);
            await pool.execute(
                'UPDATE contacts SET last_ai_at = NOW() WHERE id = ?',
                [contact.id]
            );
            await pool.execute(
                'INSERT INTO messages (id, session_id, contact_id, direction, body, media_url, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [generateId(), sessionId, contact.id, 'OUTBOUND', aiResponse, aiMediaUrl, 'SENT']
            );
        }

    } catch (err) {
        console.error('[Automation] Error processing:', err);
    }
}

module.exports = { setupWhatsAppEvents };
