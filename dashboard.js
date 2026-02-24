const express = require('express');
const cors = require('cors');
const path = require('path');
const { getLeads } = require('./crm');
const { getAllFollowUps, getFollowUpStats } = require('./follow_up');

function startDashboard(blockedUsers, spamMemory, stopFollowUp) {
    const app = express();
    app.use(cors());
    app.use(express.json());
    
    // Serve the static HTML frontend
    app.use(express.static(path.join(__dirname, 'public')));

    app.get('/api/stats', (req, res) => {
        const leads = getLeads();
        const fStats = getFollowUpStats();
        res.json({
            totalLeads: leads.length,
            followUpStats: fStats,
            blockedCount: blockedUsers.size
        });
    });

    app.get('/api/leads', (req, res) => {
        res.json(getLeads());
    });

    app.get('/api/followups', (req, res) => {
        res.json(getAllFollowUps());
    });

    app.get('/api/blocked', (req, res) => {
        res.json(Array.from(blockedUsers));
    });

    app.post('/api/unblock', (req, res) => {
        const { phone } = req.body;
        if (!phone) return res.status(400).json({ error: "Phone required" });
        
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        if (blockedUsers.has(cleanPhone)) {
            blockedUsers.delete(cleanPhone);
            spamMemory.delete(cleanPhone);
            res.json({ success: true, message: `Unblocked ${cleanPhone}` });
        } else {
            res.json({ success: false, message: `${cleanPhone} is not blocked` });
        }
    });

    app.post('/api/stopFollowUp', (req, res) => {
        const { phone } = req.body;
        if (!phone) return res.status(400).json({ error: "Phone required" });
        
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        const stopped = stopFollowUp(cleanPhone);
        res.json({ success: stopped, message: stopped ? 'Follow-ups stopped' : 'No active follow-up found' });
    });

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`[SYSTEM] 🌐 Web Admin Dashboard running at http://localhost:${PORT}`);
    });
}

module.exports = { startDashboard };
