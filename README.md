# RNSINONE CRM — WhatsApp Auto Messenger Bot

AI-powered WhatsApp CRM bot for **RNSINONE PRIVATE LIMITED** built with Gemini 2.0 Flash and `whatsapp-web.js`.

## Features

- 🤖 **AI Sales Consultant** — Gemini-powered bot that acts as a professional business growth consultant
- 💬 **Auto-Reply** — Responds to WhatsApp messages automatically with context-aware conversation
- 🧠 **Persistent Memory** — Remembers past conversations per user across restarts
- 📊 **Lead Capture** — Automatically extracts and stores lead details (Name, Phone, Service, Timeline, Priority)
- 📋 **Google Sheets Integration** — Auto-pushes captured leads to a Google Sheet via Apps Script
- 🔔 **Admin Notifications** — Sends real-time WhatsApp alerts to admins when a new lead is captured
- 🛡️ **Adversarial Protection** — Defends against prompt injection and off-topic conversations
- 📱 **Admin Commands** — Check leads and stats directly from WhatsApp (`!leads`, `!stats`, `!help`)

## Tech Stack

- **Runtime:** Node.js
- **AI:** Google Gemini 2.0 Flash API
- **WhatsApp:** whatsapp-web.js
- **Data:** JSON file storage + Google Sheets

## Setup

### 1. Clone & Install

```bash
git clone https://github.com/hardikkaaccount/RNSINONE_CRM.git
cd RNSINONE_CRM
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
npm start
```

Scan the QR code with WhatsApp (Settings → Linked Devices → Link a Device).

## Admin Commands

Send these from an admin WhatsApp number:
| Command | Description |
|---------|-------------|
| `!leads` | View last 10 captured leads |
| `!stats` | Lead priority breakdown |
| `!help` | List all commands |

## Project Structure

```
├── index.js              # Main bot entry point
├── gemini_service.js     # Gemini AI integration with persistent history
├── system_prompt.js      # Bot persona and rules
├── crm.js                # Lead storage (JSON + Google Sheets)
├── chat_history.js       # Per-user conversation memory
├── google_sheets.js      # Google Sheets API push
├── GOOGLE_APPS_SCRIPT.js # Apps Script code for Sheets endpoint
├── nodemon.json          # Dev server config
├── .env.example          # Environment template
└── chats/                # Auto-created: per-user chat logs
```

## License

Private — RNSINONE PRIVATE LIMITED
