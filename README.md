# LeadPulse

LeadPulse is a WhatsApp-first lead-qualification workspace for real-estate sales teams. It turns each inbound WhatsApp message into a structured qualification, a deterministic priority score, and a concise sales view—without automatically creating work for the sales team.

Built for the [Agents, Everywhere](https://casablanca.aitinkerers.org/hackathons/h_WQ26wdPoGEY) hackathon by adapting the **Web** app from the [CopilotKit Agents, Everywhere Starter Kit](https://github.com/CopilotKit/agents-everywhere-starter-kit).

## What the demo does

1. Twilio delivers an inbound WhatsApp message to `POST /api/twilio/whatsapp`.
2. The server verifies Twilio’s signature, deduplicates the message, persists it in local SQLite, then asks OpenAI to extract qualification facts from the transcript.
3. A deterministic scorer evaluates budget, Bouskoura fit, timing, financing, and acceptance of a call/visit. A high-potential lead that has stopped replying is labelled **Priority—unconfirmed**, so sales can prioritize follow-up without pretending it is fully qualified.
4. The webhook immediately returns a short French, Arabic, or Darija reply as TwiML. Leads that opt out are closed and all pending follow-ups are cancelled.
5. The sales workspace, powered by CopilotKit, shows the transcript, qualification brief, score, and scheduled follow-up state. Its agent can render an evidence-aware qualification card and prepare an Ambiguous sales-task proposal.
6. A human must click **Approve & save** before the server creates and reads back an Ambiguous task. The returned task ID is stored with the lead.
7. A protected endpoint sends due J+3/J+7/J+14 WhatsApp follow-ups through Twilio. The seeded demo includes one due J+3 job for `lead-amine`.

The product profile is deliberately scoped to the demo: **Résidence Oasis Verde**, Bouskoura, apartments T2/T3, 900k–1.6M MAD.

## Stack

- Next.js 15 + React 19
- CopilotKit React / runtime (from the starter kit)
- OpenAI structured-output extraction (`gpt-4o-mini` by default)
- Twilio WhatsApp Sandbox for inbound messages and scheduled outbound follow-ups
- SQLite via `better-sqlite3` for local CRM-lite persistence
- Ambiguous AI for the approval-gated internal sales task

## Local setup

### 1. Prerequisites

- Node.js 22 or newer
- A Twilio account with WhatsApp Sandbox access
- An OpenAI API key
- An ngrok account/CLI for a public webhook URL
- Optional for the approval demo: an Ambiguous API key

### 2. Install and configure

```powershell
cd "D:\Projects\Agent de qualification de leads\leadpulse"
npm ci
Copy-Item .env.example .env
```

Fill the relevant values in `.env`. Never commit this file.

```dotenv
OPENAI_API_KEY=sk-...
MODEL=gpt-4o-mini

TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
TWILIO_WEBHOOK_BASE_URL=https://your-domain.ngrok-free.app
TWILIO_VALIDATE_SIGNATURE=true

AMBIGUOUS_API_KEY=...
CRON_SECRET=generate-a-long-random-secret
LEADPULSE_DB_PATH=.data/leadpulse.db
```

`TWILIO_WHATSAPP_FROM` must include `whatsapp:`. The Sandbox number shown above is only an example; use the number shown in your Twilio console.

### 3. Run the web app and tunnel

In terminal one:

```powershell
npm run dev:web
```

In terminal two:

```powershell
ngrok http 3100
```

Copy the HTTPS forwarding URL into `TWILIO_WEBHOOK_BASE_URL`, restart the web app, then configure this URL in Twilio WhatsApp Sandbox's **When a message comes in** setting:

```text
https://your-domain.ngrok-free.app/api/twilio/whatsapp
```

Set the method to `POST`. Sandbox participants must first send Twilio’s join code from their WhatsApp account.

### 4. Exercise the demo

- Open `http://localhost:3100` to inspect the three seeded leads: a hot lead, a high-potential silent lead, and a partial lead.
- Send a WhatsApp Sandbox message such as: `Bonjour, je cherche un T3 à Bouskoura. Budget 1,2M, achat dans 2 mois.`
- Watch the live message, generated reply, score, and missing facts appear in the workspace.
- Ask the Copilot panel for a qualification brief, then ask it to prepare a sales follow-up. Click **Approve & save** to create the Ambiguous task.
- To demonstrate the due follow-up endpoint after setting Twilio credentials, run:

```powershell
$headers = @{ Authorization = "Bearer $env:CRON_SECRET" }
Invoke-RestMethod -Method Post -Headers $headers -Uri "http://localhost:3100/api/jobs/follow-ups"
```

For a production deployment, invoke the same protected endpoint on a schedule. The endpoint claims jobs first, so repeated requests do not send the same queued job twice.

## Safety and demo boundaries

- The OpenAI model extracts facts and drafts the next customer message; scoring and routing remain deterministic and auditable.
- The agent cannot create an internal task through chat prose. The server persists an Ambiguous task only after a page-level approval click and provider read-back.
- STOP/ARRET/إيقاف/وقف opt-outs are immediately closed locally and remove pending automated follow-ups.
- The database, approval metadata, and this follow-up scheduler are local-demo components. Production needs authenticated sales users, tenant isolation, consent records, retry/observability infrastructure, and a managed database/queue.

## Verification

```powershell
npm run verify
npm run build --workspace web
```

## Project documents

- [Technical breakdown](docs/TECHNICAL_BREAKDOWN.md)
- [MVP roadmap](docs/roadmap_mvp_lead_agent.md)
- [Hackathon submission notes](SUBMISSION.md)

## What was inherited vs built during the hackathon

The Next.js/CopilotKit web shell, agent runtime wiring, generic approval pattern, and Ambiguous provider adapter are adapted from the official starter kit. LeadPulse-specific work includes the WhatsApp webhook and TwiML reply path, SQLite lead/message/follow-up model, OpenAI qualification extraction, scoring and routing rules, multilingual conversation policy, sales inbox UI, Copilot lead tools/cards, and scheduled follow-up endpoint.
