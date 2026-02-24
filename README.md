# MotoPerformance CRM — WhatsApp Auto Messenger Bot

AI-powered WhatsApp CRM bot for **MotoPerformance Accessories** built with Gemini 2.0 Flash and `whatsapp-web.js`.

## Features

- 🤖 **AI Sales Consultant** — Gemini-powered bot that acts as a professional business growth consultant
- 💬 **Auto-Reply** — Responds to WhatsApp messages automatically with context-aware conversation
- 🧠 **Persistent Memory** — Remembers past conversations per user across restarts
- 📊 **Lead Capture** — Automatically extracts and stores lead details (Name, Phone, Service, Timeline, Priority)
- 📋 **Google Sheets Integration** — Auto-pushes captured leads to a Google Sheet via Apps Script
- 🔔 **Admin Notifications** — Sends real-time WhatsApp alerts to admins when a new lead is captured
- � **Automated Follow-Ups** — Smart reminder system that follows up with unresponsive leads automatically
- �🛡️ **Adversarial Protection** — Defends against prompt injection and off-topic conversations
- 📱 **Admin Commands** — Manage leads, stats, and follow-ups directly from WhatsApp

## Automated Follow-Up System

The bot automatically schedules and sends follow-up reminders to leads who haven't responded:

| Lead Type                            | First Reminder    | Frequency    | Max Reminders          |
| ------------------------------------ | ----------------- | ------------ | ---------------------- |
| **No Reply** (Medium priority)       | After 2 days      | Every 3 days | 3                      |
| **Maybe / Exploring** (Low priority) | After 1 week      | Every 1 week | 3                      |
| **Urgent / High priority**           | No auto-reminders | —            | Admin handles manually |

### How it works:

- When a lead is captured, the bot auto-categorizes based on priority and timeline
- A scheduler runs **every hour** checking for due follow-ups
- **Different message templates** are used each time to avoid feeling spammy
- If a lead **replies**, the timer resets automatically
- After **3 reminders** with no response, follow-ups stop
- Admins are notified on WhatsApp every time an auto follow-up is sent
- Admins can manually stop follow-ups with `!stopfollow <phone>`

## Tech Stack

- **Runtime:** Node.js
- **AI:** Google Gemini 2.0 Flash API
- **WhatsApp:** whatsapp-web.js
- **Data:** JSON file storage + Google Sheets
- **Deployment:** Google Cloud VM

## Setup

### 1. Clone & Install

```bash
git clone https://github.com/hardikkaaccount/MotoPerformance_CRM.git
cd MotoPerformance_CRM
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and add your keys:

- `GEMINI_API_KEY` — Get from [Google AI Studio](https://aistudio.google.com/app/apikey)
- `GOOGLE_SHEET_URL` — Deploy the Apps Script (see `GOOGLE_APPS_SCRIPT.js`)
- `ADMIN_PHONES` — Comma-separated admin phone numbers with country code

### 3. Google Sheets Setup

1. Create a new Google Sheet
2. Go to **Extensions → Apps Script**
3. Paste contents of `GOOGLE_APPS_SCRIPT.js`
4. Deploy as **Web App** (Execute as: Me, Access: Anyone)
5. Copy deployment URL → paste in `.env`

### 4. Run

```bash
# Development (auto-restart on changes)
npm run dev

# Production
npm start

# Run tests
npm test
```

Scan the QR code with WhatsApp (Settings → Linked Devices → Link a Device).

## Admin Commands

Send these from an admin WhatsApp number:

| Command               | Description                                         |
| --------------------- | --------------------------------------------------- |
| `!leads`              | View last 10 captured leads                         |
| `!stats`              | Lead priority breakdown                             |
| `!followups`          | View all active follow-ups with next dates          |
| `!followstats`        | Follow-up statistics (active, maybe, stopped, etc.) |
| `!stopfollow <phone>` | Manually stop follow-ups for a specific lead        |
| `!help`               | List all commands                                   |

## Project Structure

```
├── index.js              # Main bot entry point + follow-up scheduler
├── gemini_service.js     # Gemini AI integration with persistent history
├── system_prompt.js      # Bot persona and rules
├── crm.js                # Lead storage (JSON + Google Sheets)
├── follow_up.js          # Automated follow-up engine
├── chat_history.js       # Per-user conversation memory
├── google_sheets.js      # Google Sheets API push
├── test_followups.js     # Follow-up system tests (19 tests)
├── GOOGLE_APPS_SCRIPT.js # Apps Script code for Sheets endpoint
├── Dockerfile            # Docker config for cloud deployment
├── nodemon.json          # Dev server config
├── .env.example          # Environment template
├── leads.json            # Auto-created: captured leads
├── followups.json        # Auto-created: follow-up tracking data
└── chats/                # Auto-created: per-user chat logs
```

## Deployment (Google Cloud VM)

```bash
# SSH into your VM
gcloud compute ssh YOUR_VM_NAME --zone YOUR_ZONE

# Pull latest code
cd ~/motoperformance-crm-bot
git pull origin main
npm install

# Restart with PM2
pm2 restart motoperformance-crm
pm2 logs motoperformance-crm
```

## License

Private — MotoPerformance Accessories
