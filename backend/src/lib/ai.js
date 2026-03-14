const { GoogleGenerativeAI } = require("@google/generative-ai");

const key = (process.env.GOOGLE_GEMINI_API_KEY || '').trim();
const groqKey = (process.env.GROQ_API_KEY || '').trim();

const genAI = key 
    ? new GoogleGenerativeAI(key)
    : null;

/**
 * Common interface for AI providers
 */
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
 * Generate a response using AI
 * @param {string|array} messages - Last message or message history
 * @param {object} context - Optional context like business profile
 */
async function generateResponse(messages, context = {}) {
    try {
        const msgArray = Array.isArray(messages) ? messages : [{ role: 'user', content: messages }];

        let systemPrompt = `Eres un asistente virtual experto en WhatsApp Marketing. 
        Trabajas para "${context.businessName || 'una empresa'}". 
        Negocio: ${context.businessType || 'General'}.
        Descripción: ${context.businessDescription || 'Sin descripción'}.
        
        INSTRUCCIONES:
        1. Responde de forma cordial, profesional y breve (WhatsApp style).
        2. Tu objetivo es ayudar al usuario y concretar pedidos/ventas.
        3. Si el usuario proporciona datos para un pedido (nombre, producto, cantidad, dirección, etc.), al FINAL de tu respuesta añade SIEMPRE este bloque especial:
           [[ORDER_DATA: {"name": "...", "product": "...", "address": "...", "total": "..."}]]
           Sustituye los valores que tengas. Si no tienes algunos, déjalos vacíos.
        4. No menciones el bloque especial en tu texto, solo añádelo al final.
        `;

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
    generateTemplates
};
