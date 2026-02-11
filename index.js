const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { getChatResponse } = require('./gemini_service');
const { saveLead, getLeads } = require('./crm');
require('dotenv').config();

// Multiple admin phone numbers (comma-separated in .env)
const ADMIN_PHONES = (process.env.ADMIN_PHONES || '')
    .split(',')
    .map(p => p.trim().replace(/[^0-9]/g, ''))
    .filter(p => p.length > 0);

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    }
});

client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log('📱 QR RECEIVED — Scan with your WhatsApp.');
});

client.on('ready', () => {
    console.log('✅ RNS CRM Bot is LIVE and ready!');
    if (ADMIN_PHONES.length > 0) {
        console.log(`📊 Admins: ${ADMIN_PHONES.join(', ')}`);
    } else {
        console.log('⚠️  No admins configured. Set ADMIN_PHONES in .env');
    }
});

// ========================
// ADMIN CHECK
// ========================
async function isAdminUser(msg) {
    if (ADMIN_PHONES.length === 0) return false;

    // Check if msg.from contains any admin number directly
    for (const adminNum of ADMIN_PHONES) {
        if (msg.from.includes(adminNum)) return true;
    }

    // Also check actual phone number from contact (for @lid format)
    try {
        const contact = await msg.getContact();
        const contactNumber = (contact.number || '').replace(/[^0-9]/g, '');
        for (const adminNum of ADMIN_PHONES) {
            if (contactNumber.includes(adminNum) || adminNum.includes(contactNumber)) return true;
        }
    } catch (e) { /* ignore */ }

    return false;
}

// ========================
// NOTIFY ADMINS ON NEW LEAD
// ========================
async function notifyAdminsNewLead(leadData) {
    const notification = `🔔 *NEW LEAD CAPTURED*\n\n` +
        `👤 *Name:* ${leadData.name || 'N/A'}\n` +
        `📱 *Phone:* ${leadData.phone || 'N/A'}\n` +
        `🏢 *Business:* ${leadData.business || 'N/A'}\n` +
        `🎯 *Service:* ${leadData.service || 'N/A'}\n` +
        `⏰ *Timeline:* ${leadData.timeline || 'N/A'}\n` +
        `⚡ *Priority:* ${leadData.priority || 'N/A'}\n` +
        `🏷️ *Tags:* ${leadData.tags || 'N/A'}\n` +
        `📝 *Notes:* ${leadData.notes || 'N/A'}`;

    for (const adminNum of ADMIN_PHONES) {
        try {
            // Try both WhatsApp ID formats
            const chatId = adminNum + '@c.us';
            await client.sendMessage(chatId, notification);
            console.log(`📲 Admin notified: ${adminNum}`);
        } catch (e) {
            console.error(`❌ Failed to notify admin ${adminNum}:`, e.message);
        }
    }
}

// ========================
// ADMIN COMMANDS
// ========================
async function handleAdminCommand(msg, command) {
    switch (command) {
        case '!leads': {
            const leads = getLeads();
            if (leads.length === 0) {
                await client.sendMessage(msg.from, '📊 No leads captured yet.');
                return true;
            }
            let summary = `📊 *LEAD SUMMARY* (${leads.length} total)\n\n`;
            leads.slice(-10).forEach((lead, i) => {
                summary += `*${i + 1}. ${lead.name || 'Unknown'}*\n`;
                summary += `📱 ${lead.phone || 'N/A'}\n`;
                summary += `🏢 ${lead.business || 'N/A'}\n`;
                summary += `🎯 ${lead.service || 'N/A'}\n`;
                summary += `⏰ ${lead.timeline || 'N/A'} | Priority: ${lead.priority || 'N/A'}\n`;
                summary += `📅 ${lead.createdAt || ''}\n\n`;
            });
            if (leads.length > 10) {
                summary += `_...showing last 10 of ${leads.length} leads_`;
            }
            await client.sendMessage(msg.from, summary);
            return true;
        }
        case '!stats': {
            const leads = getLeads();
            const high = leads.filter(l => l.priority === 'HIGH').length;
            const medium = leads.filter(l => l.priority === 'MEDIUM').length;
            const low = leads.filter(l => l.priority === 'LOW').length;
            const stats = `📈 *CRM STATS*\n\nTotal Leads: ${leads.length}\n🔴 High Priority: ${high}\n🟡 Medium Priority: ${medium}\n🟢 Low Priority: ${low}`;
            await client.sendMessage(msg.from, stats);
            return true;
        }
        case '!help': {
            const help = `🤖 *ADMIN COMMANDS*\n\n!leads — View last 10 leads\n!stats — Lead statistics\n!help — This message`;
            await client.sendMessage(msg.from, help);
            return true;
        }
        default:
            return false;
    }
}

// ========================
// MESSAGE HANDLER
// ========================
client.on('message', async msg => {
    const chat = await msg.getChat();
    
    // Skip group messages and status broadcasts
    if (chat.isGroup) return;
    if (msg.from === 'status@broadcast') return;
    if (!msg.body || msg.body.trim() === '') return;

    console.log(`📩 [${msg.from}]: ${msg.body}`);

    // Check for admin commands
    if (msg.body.startsWith('!')) {
        const admin = await isAdminUser(msg);
        if (admin) {
            const handled = await handleAdminCommand(msg, msg.body.trim().toLowerCase());
            if (handled) return;
        }
    }

    try {
        // Show typing indicator
        await chat.sendStateTyping();

        // Get AI response (with persistent history)
        const aiResponse = await getChatResponse(msg.from, msg.body);

        // Strip ALL hidden lead data before sending to user
        let replyText = aiResponse;

        // Catch all variations of lead data tags
        const leadPatterns = [
            /<LEAD_DATA>\s*([\s\S]*?)\s*<\/LEAD_DATA>/gi,
            /```json\s*\n?\s*<LEAD_DATA>\s*([\s\S]*?)\s*<\/LEAD_DATA>\s*\n?\s*```/gi,
            /```\s*\n?\s*<LEAD_DATA>\s*([\s\S]*?)\s*<\/LEAD_DATA>\s*\n?\s*```/gi,
            /\*{0,2}<LEAD_DATA>\*{0,2}\s*([\s\S]*?)\s*\*{0,2}<\/LEAD_DATA>\*{0,2}/gi,
        ];

        // Try to extract and save lead data
        for (const pattern of leadPatterns) {
            const match = aiResponse.match(pattern);
            if (match) {
                try {
                    let jsonStr = match[0];
                    jsonStr = jsonStr.replace(/<\/?LEAD_DATA>/gi, '')
                                    .replace(/```json?/gi, '')
                                    .replace(/```/g, '')
                                    .replace(/\*{1,2}/g, '')
                                    .trim();
                    const leadData = JSON.parse(jsonStr);
                    leadData.phone = leadData.phone || msg.from.replace(/@.*/, '');
                    
                    console.log("🎯 Lead Captured:", JSON.stringify(leadData));
                    await saveLead(leadData);

                    // 🔔 Notify all admins about the new lead
                    notifyAdminsNewLead(leadData).catch(err => {
                        console.error("❌ Admin notification failed:", err.message);
                    });
                } catch (e) {
                    console.error("❌ Failed to parse lead JSON:", e.message);
                }
                break;
            }
        }

        // Aggressively remove ALL lead data blocks from reply
        replyText = replyText
            .replace(/```json?\s*\n?\s*<LEAD_DATA>[\s\S]*?<\/LEAD_DATA>\s*\n?\s*```/gi, '')
            .replace(/<LEAD_DATA>[\s\S]*?<\/LEAD_DATA>/gi, '')
            .replace(/```json?\s*\n?\s*\{[\s\S]*?"name"[\s\S]*?"phone"[\s\S]*?\}\s*\n?\s*```/gi, '')
            .replace(/\n{3,}/g, '\n\n')
            .trim();

        await chat.clearState();

        if (replyText) {
            await client.sendMessage(msg.from, replyText);
            console.log(`📤 [BOT → ${msg.from}]: ${replyText.substring(0, 100)}...`);
        }

    } catch (error) {
        console.error("❌ Error processing message:", error.message);
    }
});

// Graceful shutdown
async function shutdown() {
    console.log('🔄 Shutting down gracefully...');
    try { await client.destroy(); } catch (e) { /* ignore */ }
    process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

console.log('🚀 Initializing RNS CRM Bot...');
client.initialize();
