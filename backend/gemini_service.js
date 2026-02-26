const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();
const SYSTEM_PROMPT = require('./system_prompt');
const { getFormattedHistory, saveMessage } = require('./chat_history');
const { fetchWebsiteContent } = require('./web_scraper');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ==============================
// SERVER-SIDE RAG WEBSITE DIRECTORY
// Detects keywords in user message and maps them to the correct website URL.
// The server scrapes silently — Gemini never needs to "call a tool".
// ==============================
const WEBSITE_DIRECTORY = [
    {
        keywords: ['dieseltronic', 'diesel tronic', 'dt pro', 'dieseltronic pro', 'diesel electronic', 'diesel tronics'],
        url: 'https://dieseltronic.in/',
        label: 'DieselTRONIC'
    },
    {
        keywords: ['powertronic', 'power tronic', 'quick shifter', 'quickshifter', 'fuelx', 'fuel x', 'fuel optimizer', 'powertronicecu'],
        url: 'https://powertronicecu.com/',
        label: 'PowerTRONIC'
    },
    {
        keywords: ['dp brake', 'dp brakes', 'dp pad', 'brake pad', 'flashx', 'flash x', 'the switch', 'harness', 'balaclava', 'rdessential', 'rd essential', 'interceptor brake', 'bullet brake'],
        url: 'https://rdessentials.com/',
        label: 'RD Essentials'
    },
    {
        keywords: ['race dynamics', 'racedynamics'],
        url: 'https://racedynamics.com/',
        label: 'Race Dynamics'
    }
];

/**
 * Detects which website to pre-scrape based on keywords in the user message.
 * Returns { url, label } or null if no match found.
 */
function detectWebsiteToScrape(message) {
    const lowerMsg = message.toLowerCase();
    for (const entry of WEBSITE_DIRECTORY) {
        if (entry.keywords.some(kw => lowerMsg.includes(kw))) {
            return { url: entry.url, label: entry.label };
        }
    }
    return null;
}

// Simple Gemini model WITHOUT any tool declarations — clean text I/O only
const model = genAI.getGenerativeModel({ 
    model: "gemini-2.0-flash",
    systemInstruction: SYSTEM_PROMPT,
});

async function getChatResponse(userId, userMessage, isKnownLead = false) {
    try {
        // Load persistent history from disk
        const userHistory = getFormattedHistory(userId);
        
        // Start chat with full conversational context
        const chat = model.startChat({
            history: userHistory,
            generationConfig: {
                temperature: 0.7,
            },
        });

        // ===== SERVER-SIDE RAG: Silently detect & pre-scrape =====
        let liveWebData = '';
        let scrapedUrl = null;
        const detected = detectWebsiteToScrape(userMessage);

        if (detected) {
            console.log(`[RAG] Detected "${detected.label}" in message. Pre-scraping: ${detected.url}`);
            try {
                const content = await fetchWebsiteContent(detected.url);
                liveWebData = content;
                scrapedUrl = detected.url;
                console.log(`[RAG] Successfully scraped ${detected.url} (${content.length} chars)`);
            } catch (err) {
                console.error(`[RAG] Failed to scrape ${detected.url}:`, err.message);
            }
        }

        // Build the final message to Gemini with live data injected silently
        let messageToSend = userMessage;

        if (isKnownLead) {
            messageToSend = `[SYSTEM NOTE: THIS USER IS ALREADY A CAPTURED LEAD. DO NOT ASK FOR THEIR NAME, VEHICLE, YEAR, OR LOCATION AGAIN. ACT PURELY AS A CONSULTING BOT.]\n\n`;
        } else {
            messageToSend = '';
        }

        if (liveWebData) {
            messageToSend += `[BACKGROUND PRODUCT DATA — Use this to answer the question below. IMPORTANT RULES:
1. NEVER say "the website says", "according to the website", "on the website", "I checked", or anything that reveals you accessed a data source.
2. NEVER say "I do not have enough information" or "I couldn't find it". If specific details aren't in the data, use your existing FAQ knowledge base and answer confidently.
3. Just speak naturally as a knowledgeable consultant who already knows this information.
4. At the very END of your response (after your answer), add exactly one line: "Explore more: ${scrapedUrl}"]

PRODUCT DATA:
${liveWebData}

---
Customer Query: ${userMessage}`;
        } else {
            messageToSend += userMessage;
        }

        const result = await chat.sendMessage(messageToSend);
        const responseText = result.response.text();

        // Save to persistent history
        saveMessage(userId, 'user', userMessage);
        saveMessage(userId, 'model', responseText);

        return responseText;
    } catch (error) {
        console.error("Gemini Error:", error.message || error);
        
        if (error.message && error.message.includes('SAFETY')) {
            return "I appreciate you reaching out! I'm here to help with motorcycle performance parts like FuelX and PowerTRONIC. What bike do you ride?";
        }
        
        return "Hey! We're experiencing a brief hiccup while processing. Could you try again in a moment?";
    }
}

module.exports = { getChatResponse };
