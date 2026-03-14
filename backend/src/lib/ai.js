const { GoogleGenerativeAI } = require("@google/generative-ai");

const key = (process.env.GOOGLE_GEMINI_API_KEY || '').trim();
const groqKey = (process.env.GROQ_API_KEY || '').trim();

const genAI = key
    ? new GoogleGenerativeAI(key)
    : null;

// ---------------------------------------------------------------------------
// ConversationMemory — stores per-contact message history in memory
// Key: `${userId}:${contactPhone}`
// Automatically evicts conversations inactive for `ttlMs` milliseconds.
// ---------------------------------------------------------------------------
class ConversationMemory {
    constructor({ maxMessages = 20, ttlMs = 2 * 60 * 60 * 1000 } = {}) {
        this.conversations = new Map();
        this.maxMessages = maxMessages;
        this.ttlMs = ttlMs;
        // Periodic cleanup every 30 minutes; unref() so it doesn't block process exit
        setInterval(() => this._cleanup(), 30 * 60 * 1000).unref();
    }

    _key(userId, contactPhone) {
        return `${userId}:${contactPhone}`;
    }

    _cleanup() {
        const now = Date.now();
        for (const [key, conv] of this.conversations) {
            if (now - conv.lastActivity > this.ttlMs) {
                this.conversations.delete(key);
            }
        }
    }

    add(userId, contactPhone, role, content) {
        const key = this._key(userId, contactPhone);
        if (!this.conversations.has(key)) {
            this.conversations.set(key, { messages: [], lastActivity: Date.now() });
        }
        const conv = this.conversations.get(key);
        conv.messages.push({ role, content });
        // Keep only the most recent maxMessages turns
        if (conv.messages.length > this.maxMessages) {
            conv.messages.splice(0, conv.messages.length - this.maxMessages);
        }
        conv.lastActivity = Date.now();
    }

    get(userId, contactPhone) {
        const conv = this.conversations.get(this._key(userId, contactPhone));
        return conv ? [...conv.messages] : [];
    }

    clear(userId, contactPhone) {
        this.conversations.delete(this._key(userId, contactPhone));
    }
}

// Singleton shared across the application
const conversationMemory = new ConversationMemory();

// ---------------------------------------------------------------------------
// buildSystemPrompt — creates a strict, business-scoped system prompt
// ---------------------------------------------------------------------------
function buildSystemPrompt(context = {}) {
    const businessName = context.businessName || 'nuestra empresa';
    const businessType = context.businessType || 'negocio';
    const businessDescription = context.businessDescription
        ? `Descripción del negocio: ${context.businessDescription}`
        : '';

    return `Eres el asistente virtual de ventas de "${businessName}", un negocio de tipo "${businessType}".
${businessDescription}

=== REGLAS ABSOLUTAS (nunca las ignores) ===

1. ALCANCE: ÚNICAMENTE puedes hablar sobre "${businessName}": productos, servicios, precios, promociones, horarios, formas de pago, pedidos y atención al cliente.

2. TEMAS PROHIBIDOS: NO respondas preguntas de conocimiento general, cultura, historia, geografía, ciencia, entretenimiento, matemáticas, política, chistes u otros temas ajenos al negocio. Si el usuario lo solicita, redirige SIEMPRE la conversación hacia "${businessName}".

3. REDIRECCIÓN: Si el usuario pregunta algo fuera del negocio, responde con algo como:
   "Solo puedo ayudarte con información y pedidos de ${businessName}. ¿En qué puedo asistirte hoy?"

4. TONO: Sé siempre cordial, profesional y breve (máximo 3-4 líneas, estilo WhatsApp).

5. OBJETIVO: Concretar ventas. Si el usuario muestra intención de compra, solicita los datos necesarios (nombre, producto/servicio, cantidad, dirección si aplica).

6. PEDIDOS: Cuando tengas todos los datos de un pedido, añade al FINAL de tu respuesta (sin mencionarlo en el texto visible):
   [[ORDER_DATA: {"name": "...", "product": "...", "address": "...", "total": "..."}]]

RECUERDA: Eres EXCLUSIVAMENTE el asistente de "${businessName}". Nada fuera de ese ámbito.`;
}

// ---------------------------------------------------------------------------
// callAI — common interface for AI providers (Groq → Gemini fallback)
// ---------------------------------------------------------------------------
async function callAI(messages, systemPrompt = "") {
    // Try Groq first if available
    if (groqKey) {
        try {
            const groqMessages = [];
            if (systemPrompt) groqMessages.push({ role: 'system', content: systemPrompt });
            groqMessages.push(...messages);

            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${groqKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile',
                    messages: groqMessages,
                    temperature: 0.7
                })
            });
            const data = await response.json();
            if (data.choices && data.choices[0]) {
                return data.choices[0].message.content;
            }
        } catch (err) {
            console.error('[AI] Groq failed:', err.message);
        }
    }

    // Fallback to Gemini
    if (genAI) {
        try {
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const conversation = messages.map(m => `${m.role === 'user' ? 'Usuario' : 'Asistente'}: ${m.content}`).join('\n');
            const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${conversation}` : conversation;
            const result = await model.generateContent(fullPrompt);
            const response = await result.response;
            return response.text();
        } catch (err) {
            console.error('[AI] Gemini failed:', err.message);
            throw err;
        }
    }

    throw new Error("No AI provider configured.");
}

/**
 * Generate a response using AI.
 * @param {string|Array} messages - Last message or full message history
 * @param {object} context - Business profile (businessName, businessType, businessDescription)
 */
async function generateResponse(messages, context = {}) {
    try {
        const msgArray = Array.isArray(messages) ? messages : [{ role: 'user', content: messages }];
        const systemPrompt = buildSystemPrompt(context);
        return await callAI(msgArray, systemPrompt);
    } catch (err) {
        console.error('[AI] Error generating response:', err);
        return "Lo siento, hubo un error al procesar tu solicitud.";
    }
}

/**
 * Generate message templates based on business info
 * @param {object} businessInfo 
 */
async function generateTemplates(businessInfo) {
    const systemPrompt = "Eres un generador de plantillas de WhatsApp profesional. Responde únicamente con el JSON solicitado.";
    const prompt = `
        Genera 3 plantillas de mensajes de WhatsApp efectivas para un negocio con los siguientes datos:
        Nombre: ${businessInfo.businessName || 'No especificado'}
        Tipo: ${businessInfo.businessType || 'No especificado'}
        Descripción: ${businessInfo.businessDescription || 'No especificado'}

        Genera las plantillas en formato JSON con la siguiente estructura:
        [
          { "name": "Bienvenida", "keywords": "hola, buen dia, inicio", "content": "..." },
          { "name": "Promoción", "keywords": "precio, cuanto cuesta, oferta, catalogo", "content": "..." },
          { "name": "Seguimiento", "keywords": "gracias, agendar, cita, pedido", "content": "..." }
        ]
        Solo devuelve el JSON, nada de texto adicional.
    `;

    try {
        const messages = [{ role: 'user', content: prompt }];
        const text = await callAI(messages, systemPrompt);
        
        // Extract JSON from response (sometimes AI adds markdown blocks)
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        return JSON.parse(jsonMatch ? jsonMatch[0] : text);
    } catch (err) {
        console.error('[AI] Error generating templates:', err);
        throw err;
    }
}

module.exports = {
    generateResponse,
    generateTemplates,
    conversationMemory,
};
