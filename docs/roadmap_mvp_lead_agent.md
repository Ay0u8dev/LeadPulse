# Roadmap MVP — AI Lead Qualification Agent (Real Estate, Morocco)
### Stack: Python + Flask + OpenAI API + Twilio WhatsApp Sandbox + SQLite
### Time budget: 2 hours

---

## Architecture

```
WhatsApp (Twilio Sandbox)  →  Flask webhook  →  OpenAI API (GPT-4o-mini)
                                      ↓
                              SQLite (mini CRM)
                                      ↓
                         ┌────────────┴────────────┐
                         ↓                          ↓
                  Email (smtplib)          Dashboard (Flask + HTML table)
```

**Why these choices:**
- **Twilio WhatsApp Sandbox** → real WhatsApp environment, free, ~5 min setup
- **OpenAI GPT-4o-mini** → fast, cheap, good enough for structured extraction
- **SQLite** → zero-setup mini CRM, one file, no server needed
- **Flask** → webhook + dashboard in one lightweight app, no n8n dependency
- **smtplib** → unified email notification, no external service needed

---

## Time-boxed Plan

### 0:00–0:15 — Setup (15 min)
- [ ] Create Twilio account → activate WhatsApp Sandbox → get sandbox number + join code
- [ ] `pip install flask openai twilio python-dotenv`
- [ ] Get OpenAI API key
- [ ] Create project files: `app.py`, `.env`, `leads.db` (auto-created by SQLite)

### 0:15–0:45 — Core webhook + OpenAI qualification (30 min)
- [ ] Build `/webhook` Flask route to receive incoming WhatsApp messages via Twilio
- [ ] Write system prompt for GPT-4o-mini: extract `budget`, `location`, `property_type`, `timeline`
- [ ] Handle multi-turn conversation (store history per phone number)
- [ ] Model asks one natural follow-up question at a time until all 4 fields are collected

### 0:45–1:15 — Scoring + storage logic (30 min)
- [ ] Define scoring rule (e.g., has budget = +40, has near-term timeline = +40, has location = +20)
- [ ] Threshold: score ≥ 70 = "hot", below = "warm"
- [ ] Save/update lead record in SQLite (`leads` table)

### 1:15–1:35 — Routing: email + dashboard (20 min)
- [ ] On "hot" lead: send unified email via `smtplib` to one team inbox with lead summary
- [ ] Insert/update lead status in DB so dashboard reflects it immediately

### 1:35–1:55 — Dashboard page (20 min)
- [ ] Build `/dashboard` Flask route
- [ ] Query all hot/warm leads, `ORDER BY score DESC`
- [ ] Render as HTML table, color-code hot (red) vs warm (yellow)

### 1:55–2:00 — Test end-to-end + demo prep (5 min)
- [ ] Send a real WhatsApp test message through the Twilio sandbox
- [ ] Confirm: qualification flow → score → email received → dashboard updates
- [ ] Prepare 60-second live demo flow

---

## Setup Checklist

1. **Twilio**
   - Sign up at twilio.com → go to Messaging → Try WhatsApp
   - Join the sandbox by sending the given code to the Twilio WhatsApp number
   - Note your sandbox number

2. **Expose local server**
   - Run `ngrok http 5000`
   - Copy the `https://...ngrok-free.app` URL
   - Paste `<ngrok-url>/webhook` into Twilio Sandbox "WHEN A MESSAGE COMES IN" field

3. **Environment variables (`.env`)**
   ```
   OPENAI_API_KEY=sk-...
   SENDER_EMAIL=you@gmail.com
   SENDER_PASSWORD=your_app_password
   TEAM_EMAIL=team@yourcompany.com
   ```

4. **Run the app**
   ```
   python app.py
   ```

---

## Core Files

- `app.py` — Flask app: webhook, scoring, email, dashboard
- `.env` — API keys and credentials (never commit this)
- `leads.db` — SQLite database (auto-created on first run)

### `leads` table schema
| Column | Type | Description |
|---|---|---|
| phone | TEXT (PK) | WhatsApp sender number |
| budget | TEXT | Extracted budget |
| location | TEXT | Desired area |
| property_type | TEXT | Apartment, villa, etc. |
| timeline | TEXT | Purchase timeframe |
| score | INTEGER | Computed lead score |
| status | TEXT | in_progress / hot / warm |
| history | TEXT | Full conversation log |

---

## Judging Criteria Coverage

| Criterion | How the MVP satisfies it |
|---|---|
| **Core Functionality** | Full loop works end-to-end: WhatsApp → OpenAI qualification → scoring → email/dashboard → stored in DB |
| **Innovation & Theme Alignment** | Lives inside real WhatsApp (via Twilio), not a simulated chat window — leads message the way they already do in Morocco |
| **Technical Execution & Integration** | Real API integrations (Twilio, OpenAI, SMTP), persistent storage, live dashboard — nothing mocked |
| **Usefulness & Agentic Experience** | Solves a real, quantified problem (missed leads); dashboard sorted by score gives sales teams immediate, actionable prioritization |

---

## Cut List (if running short on time)

1. Drop automated J+3 / J+7 / J+14 follow-ups — mention as "next step" in the pitch, don't build it live.
2. Skip HTML-formatted emails — plain text is fine.
3. Skip dashboard auto-refresh — manually reload the page during the demo.

---

## Next Steps (Post-Hackathon / Beyond MVP)

- [ ] Add automated multi-day follow-up sequence (APScheduler or Celery)
- [ ] Replace SQLite with a real CRM integration (HubSpot/Salesforce API)
- [ ] Add authentication to the dashboard
- [ ] Add CNDP-compliant data handling (consent logging, retention policy, anonymization before sending to OpenAI)
- [ ] Support voice notes (common on WhatsApp in Morocco) via Whisper transcription
