const fs = require('fs');
const path = require('path');

const FOLLOWUPS_FILE = path.join(__dirname, 'followups.json');

// Initialize follow-ups file if it doesn't exist
if (!fs.existsSync(FOLLOWUPS_FILE)) {
    fs.writeFileSync(FOLLOWUPS_FILE, JSON.stringify({}, null, 2));
}

// ========================
// FOLLOW-UP STATUS TYPES
// ========================
// "no_reply"   → Lead captured, user hasn't replied since. Remind after 2 days, then every 3 days (max 3)
// "maybe"      → User said maybe / just exploring. Remind every 1 week (max 3)
// "confirmed"  → User confirmed interest / urgent. No auto-reminders (admin handles)
// "stopped"    → Manually stopped or max reminders reached. No more reminders.
// "replied"    → User replied after a reminder. Timer resets.

// ========================
// REMINDER TEMPLATES
// ========================
const NO_REPLY_TEMPLATES = [
    "Hey {name}! 👋 Just checking in — we'd love to help you with {service}. Got any questions? Feel free to ask!",
    "Hi {name}! Following up on your interest in {service}. Our team is ready to discuss your project whenever you are 😊",
    "Hey {name}, just a quick reminder — we're here whenever you're ready to move forward with {service}. No rush at all! Let us know if anything comes up 🙌",
];

const MAYBE_TEMPLATES = [
    "Hi {name}! 👋 Hope you're doing well. Just wanted to check — are you still exploring options for {service}? Happy to answer any questions!",
    "Hey {name}! It's been a while since we chatted about {service}. Anything new on your end? We'd love to help when you're ready 😊",
    "Hi {name}! Quick check-in — still thinking about {service}? No pressure at all, but if you'd like a free consultation call, just say the word! 🚀",
];

// ========================
// LOAD & SAVE
// ========================
function loadFollowUps() {
    try {
        const data = fs.readFileSync(FOLLOWUPS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error("Error loading follow-ups:", error.message);
        return {};
    }
}

function saveFollowUps(followUps) {
    try {
        fs.writeFileSync(FOLLOWUPS_FILE, JSON.stringify(followUps, null, 2));
    } catch (error) {
        console.error("Error saving follow-ups:", error.message);
    }
}

// ========================
// FOLLOW-UP MANAGEMENT
// ========================

/**
 * Create or update a follow-up entry when a lead is captured.
 * @param {string} phone - The lead's phone/WhatsApp ID
 * @param {object} leadData - Lead info (name, service, etc.)
 * @param {string} status - Initial status: "no_reply" or "maybe"
 */
function createFollowUp(phone, leadData, status = 'no_reply') {
    const followUps = loadFollowUps();
    const normalizedPhone = phone.replace(/[^0-9]/g, '');

    // Don't overwrite if already exists and is active
    if (followUps[normalizedPhone] && followUps[normalizedPhone].status !== 'stopped') {
        console.log(`📌 Follow-up already exists for ${normalizedPhone}, updating info...`);
        followUps[normalizedPhone].name = leadData.name || followUps[normalizedPhone].name;
        followUps[normalizedPhone].service = leadData.service || followUps[normalizedPhone].service;
        followUps[normalizedPhone].lastUpdated = new Date().toISOString();
        saveFollowUps(followUps);
        return;
    }

    const now = new Date();
    let nextFollowUp;

    if (status === 'maybe') {
        // Maybe leads: first follow-up after 7 days
        nextFollowUp = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    } else {
        // No reply leads: first follow-up after 2 days
        nextFollowUp = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
    }

    followUps[normalizedPhone] = {
        phone: normalizedPhone,
        whatsappId: phone, // Original WhatsApp ID format to send messages
        name: leadData.name || 'there',
        service: leadData.service || 'our services',
        business: leadData.business || '',
        status: status,
        remindersSent: 0,
        maxReminders: 3,
        lastContactAt: now.toISOString(),
        nextFollowUpAt: nextFollowUp.toISOString(),
        createdAt: now.toISOString(),
        lastUpdated: now.toISOString(),
    };

    saveFollowUps(followUps);
    console.log(`📅 Follow-up scheduled for ${leadData.name || normalizedPhone} — ${status} — next: ${nextFollowUp.toLocaleDateString()}`);
}

/**
 * Mark that a lead has replied (resets follow-up timer).
 */
function markReplied(phone) {
    const followUps = loadFollowUps();
    const normalizedPhone = phone.replace(/[^0-9]/g, '');

    if (followUps[normalizedPhone]) {
        followUps[normalizedPhone].lastContactAt = new Date().toISOString();
        followUps[normalizedPhone].lastUpdated = new Date().toISOString();
        // Reset reminder counter when they reply
        followUps[normalizedPhone].remindersSent = 0;
        followUps[normalizedPhone].status = 'replied';

        // Schedule next follow-up (2 days if they replied but don't confirm)
        const nextFollowUp = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
        followUps[normalizedPhone].nextFollowUpAt = nextFollowUp.toISOString();

        saveFollowUps(followUps);
        console.log(`↩️ Follow-up timer reset for ${normalizedPhone} (replied)`);
    }
}

/**
 * Mark a lead as confirmed (stop follow-ups).
 */
function markConfirmed(phone) {
    const followUps = loadFollowUps();
    const normalizedPhone = phone.replace(/[^0-9]/g, '');

    if (followUps[normalizedPhone]) {
        followUps[normalizedPhone].status = 'confirmed';
        followUps[normalizedPhone].lastUpdated = new Date().toISOString();
        saveFollowUps(followUps);
        console.log(`✅ Follow-up stopped for ${normalizedPhone} (confirmed)`);
    }
}

/**
 * Update follow-up status to "maybe" (weekly reminders).
 */
function markMaybe(phone) {
    const followUps = loadFollowUps();
    const normalizedPhone = phone.replace(/[^0-9]/g, '');

    if (followUps[normalizedPhone]) {
        followUps[normalizedPhone].status = 'maybe';
        followUps[normalizedPhone].lastUpdated = new Date().toISOString();
        // Next follow-up in 7 days
        const nextFollowUp = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        followUps[normalizedPhone].nextFollowUpAt = nextFollowUp.toISOString();
        saveFollowUps(followUps);
        console.log(`🤔 Follow-up set to 'maybe' for ${normalizedPhone} (weekly reminders)`);
    }
}

/**
 * Manually stop follow-ups for a lead.
 */
function stopFollowUp(phone) {
    const followUps = loadFollowUps();
    const normalizedPhone = phone.replace(/[^0-9]/g, '');

    if (followUps[normalizedPhone]) {
        followUps[normalizedPhone].status = 'stopped';
        followUps[normalizedPhone].lastUpdated = new Date().toISOString();
        saveFollowUps(followUps);
        console.log(`🛑 Follow-up stopped for ${normalizedPhone}`);
        return true;
    }
    return false;
}

/**
 * Get all follow-ups that are due for a reminder right now.
 * @returns {Array} List of follow-up entries that need reminders sent.
 */
function getDueFollowUps() {
    const followUps = loadFollowUps();
    const now = new Date();
    const dueList = [];

    for (const [phone, entry] of Object.entries(followUps)) {
        // Skip completed/stopped/confirmed
        if (['stopped', 'confirmed'].includes(entry.status)) continue;

        // Skip if max reminders reached
        if (entry.remindersSent >= entry.maxReminders) {
            entry.status = 'stopped';
            entry.lastUpdated = now.toISOString();
            continue;
        }

        // Check if it's time for a follow-up
        const nextDate = new Date(entry.nextFollowUpAt);
        if (now >= nextDate) {
            dueList.push(entry);
        }
    }

    // Save any status changes
    saveFollowUps(followUps);
    return dueList;
}

/**
 * Record that a reminder was sent. Update next follow-up date.
 */
function recordReminderSent(phone) {
    const followUps = loadFollowUps();
    const normalizedPhone = phone.replace(/[^0-9]/g, '');

    if (followUps[normalizedPhone]) {
        const entry = followUps[normalizedPhone];
        entry.remindersSent += 1;
        entry.lastContactAt = new Date().toISOString();
        entry.lastUpdated = new Date().toISOString();

        if (entry.remindersSent >= entry.maxReminders) {
            // Max reminders reached — stop
            entry.status = 'stopped';
            entry.nextFollowUpAt = null;
            console.log(`🛑 Max reminders reached for ${normalizedPhone}. Stopping.`);
        } else {
            // Schedule next reminder
            let intervalMs;
            if (entry.status === 'maybe') {
                intervalMs = 7 * 24 * 60 * 60 * 1000; // 1 week
            } else {
                intervalMs = 3 * 24 * 60 * 60 * 1000; // 3 days
            }
            entry.nextFollowUpAt = new Date(Date.now() + intervalMs).toISOString();
        }

        saveFollowUps(followUps);
    }
}

/**
 * Get the right reminder message template based on status and count.
 */
function getReminderMessage(entry) {
    const templates = entry.status === 'maybe' ? MAYBE_TEMPLATES : NO_REPLY_TEMPLATES;
    const templateIndex = Math.min(entry.remindersSent, templates.length - 1);
    let message = templates[templateIndex];

    // Replace placeholders
    message = message.replace(/{name}/g, entry.name || 'there');
    message = message.replace(/{service}/g, entry.service || 'our services');
    message = message.replace(/{business}/g, entry.business || 'your business');

    return message;
}

/**
 * Get all active follow-ups for admin view.
 */
function getAllFollowUps() {
    const followUps = loadFollowUps();
    return Object.values(followUps);
}

/**
 * Get summary stats for follow-ups.
 */
function getFollowUpStats() {
    const followUps = loadFollowUps();
    const entries = Object.values(followUps);
    return {
        total: entries.length,
        active: entries.filter(e => !['stopped', 'confirmed'].includes(e.status)).length,
        noReply: entries.filter(e => e.status === 'no_reply').length,
        maybe: entries.filter(e => e.status === 'maybe').length,
        replied: entries.filter(e => e.status === 'replied').length,
        confirmed: entries.filter(e => e.status === 'confirmed').length,
        stopped: entries.filter(e => e.status === 'stopped').length,
    };
}

module.exports = {
    createFollowUp,
    markReplied,
    markConfirmed,
    markMaybe,
    stopFollowUp,
    getDueFollowUps,
    recordReminderSent,
    getReminderMessage,
    getAllFollowUps,
    getFollowUpStats,
};
