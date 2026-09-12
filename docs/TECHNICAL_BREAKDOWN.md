# LeadPulse — Technical Breakdown

## 1. Product in one sentence

**LeadPulse** is a WhatsApp-first lead-qualification agent for Moroccan real-estate developers. It replies to every inbound lead, extracts purchase intent from French, Arabic, or Darija messages, ranks both responsive and silent leads, and gives the sales team a CRM-style workspace for approval-based handoffs.

The core business outcome is not a chat reply. It is a ranked, explainable sales queue in which a commercial can immediately see:

- who is fully qualified and ready to call;
- who appears high-potential from their first message but has not replied;
- what the agent has already asked or sent;
- why a lead is ranked where it is; and
- what action should happen next.

## 2. Hackathon framing and starter-kit choice

This project is built from the [CopilotKit Agents Everywhere Starter Kit](https://github.com/CopilotKit/agents-everywhere-starter-kit), specifically the **Web** template in `apps/web`.

The kit is inherited infrastructure. LeadPulse is the event work:

| Inherited from the kit | Built by the team during the hackathon |
| --- | --- |
| Next.js web application, CopilotKit React wiring, agent-rendered UI, approval pattern, Ambiguous task persistence | Twilio WhatsApp connector, lead/message persistence, multilingual qualification service, scoring logic, property matching, sales inbox, follow-up scheduler, LeadPulse UI, tests, and demo scenarios |

The project has two connected environments:

1. **WhatsApp** is where prospects naturally speak.
2. **LeadPulse sales workspace** is where commercial teams review, understand, approve, and own follow-up actions.

The workspace context is essential: the CopilotKit agent can see the selected lead, their actual transcript, property inventory, current lead state, and sales-assignment constraints. Without that context, it would be a generic chatbot rather than a useful sales agent.

## 3. MVP scope

### Must work in the core demo

- A real WhatsApp inbound message reaches the application through the Twilio WhatsApp Sandbox.
- The agent replies in the lead's language and asks one useful qualification question.
- The system stores the message and produces a preliminary qualification even if the lead never replies.
- The sales inbox ranks leads using **intent** and **confidence** separately.
- A sales rep opens a selected lead and sees an agent-rendered qualification brief.
- The agent proposes a sales follow-up; a human can approve or decline it.
- Approval creates a real persistent record in Ambiguous AI and returns the actual record ID/link.
- Refreshing the workspace proves that the approved task persists.

### Explicitly bounded stretch work

- Automatic J+3, J+7, and J+14 WhatsApp re-engagement.
- Sales-rep workload balancing and automatic assignment.
- HubSpot/Salesforce synchronization.
- Voice-note transcription.
- Dashboard authentication and CNDP production compliance review.

The follow-up data model and job mechanism are built now so that the stretch work has a clear path. For the live demo, use one seeded lead whose follow-up is already due to prove the same worker path without waiting days.

## 4. System architecture

```text
Lead sends WhatsApp message
          |
          v
Twilio WhatsApp Sandbox
          |
          v
POST /api/twilio/whatsapp  (Next.js, apps/web)
          |
          +--> validate Twilio signature + deduplicate MessageSid
          +--> persist message and update Lead record (SQLite)
          +--> qualification service
                    |
                    +--> model extracts structured facts / language / next reply
                    +--> TypeScript validates the result
                    +--> deterministic score and status are calculated
          |
          +--> return a WhatsApp reply through TwiML or Twilio Messaging API
          |
          v
LeadPulse Web Workspace (CopilotKit React)
          |
          +--> ranked inbox + selected transcript + qualification card
          +--> CopilotKit agent explains and proposes next actions
          |
          v
Human approval boundary
          |
          v
POST /api/followups --> Ambiguous AI workplace task --> returned task ID/link
```

### Why the system has two agent-facing paths

The webhook path is proactive: it must triage every lead, including the hundreds that receive no answer from a salesperson. The CopilotKit workspace path is collaborative: it helps a salesperson inspect a lead and approve a consequential internal action.

Both paths share the same qualification and scoring service. This avoids inconsistent scores between WhatsApp and the dashboard.

## 5. Repository layout

Start from the starter kit root; do not scaffold a second application over it.

```text
agents-everywhere-starter-kit/
  apps/web/
    src/
      app/
        page.tsx                         # LeadPulse inbox workspace
        api/
          copilotkit/[[...path]]/route.ts # Existing CopilotKit runtime, adapted
          twilio/whatsapp/route.ts         # Twilio inbound webhook
          followups/route.ts               # Approved Ambiguous task write
          jobs/follow-ups/route.ts         # Protected scheduled follow-up runner
      components/
        lead-inbox.tsx
        whatsapp-transcript.tsx
        lead-qualification-card.tsx
        lead-action-approval.tsx
        app-control.tsx                   # Page context + frontend tools
        generative-ui.tsx                 # CopilotKit UI registrations
      lib/
        leads.ts                          # Repository/query layer
        messages.ts                       # Conversation persistence
        qualification.ts                  # Model request + schema validation
        scoring.ts                        # Deterministic scoring rules
        properties.ts                     # Demo project inventory/matching
        follow-up-jobs.ts                 # Due-job selection and processing
        server/
          twilio.ts                       # Signature check and outbound messages
          workplace.ts                    # Existing Ambiguous adapter, retained
          followups.ts                    # Task creation after approval only
      types/
        lead.ts
    data/
      leadpulse.db                        # Local SQLite database; never commit real data
```

The exact starter-kit filenames should be verified after cloning. The existing incident/follow-up domain is replaced, not left alongside LeadPulse.

## 6. Data model

SQLite is sufficient for the live hackathon demonstration. The database is the CRM-lite source of truth; Ambiguous AI stores only approved sales tasks.

### `leads`

| Field | Purpose |
| --- | --- |
| `id` | Internal UUID |
| `phone_e164` | WhatsApp number; redact from logs and screenshots |
| `display_name` | Optional sender profile name |
| `preferred_language` | `fr`, `ar`, `darija`, or `unknown` |
| `engagement_state` | `new`, `awaiting_reply`, `partial`, `qualified`, `opted_out`, `needs_human` |
| `intent_score` | 0–100 estimate of buying potential |
| `confidence_score` | 0–100 completeness/reliability of available evidence |
| `status` | `priority_unconfirmed`, `hot`, `warm`, `nurture`, `closed` |
| `next_follow_up_at` | Next scheduled contact, if permitted |
| `follow_up_count` | Number of automated re-engagement attempts |
| `approved_task_id` | Ambiguous task ID after a human approves a handoff |
| `created_at`, `updated_at` | Audit timestamps |

### `messages`

| Field | Purpose |
| --- | --- |
| `id` | Internal UUID |
| `lead_id` | Foreign key to `leads` |
| `provider_message_sid` | Unique Twilio Message SID; enables idempotency |
| `direction` | `inbound` or `outbound` |
| `body` | Raw message body |
| `created_at` | Message time |

### `qualifications`

Store the current normalized facts, raw phrasing, evidence, and decision explanation:

```ts
type Qualification = {
  budgetMad: number | null;
  budgetRaw: string | null;
  location: string | null;
  propertyType: "apartment" | "villa" | "land" | "other" | null;
  timelineDays: number | null;
  financing: "cash" | "pre_approved" | "needs_financing" | "unknown";
  intent: "buy" | "rent" | "investment" | "unknown";
  missingFields: string[];
  evidence: Array<{ field: string; messageId: string; excerpt: string }>;
};
```

### `follow_up_jobs`

`id`, `lead_id`, `due_at`, `sequence_day` (`3`, `7`, `14`), `status` (`pending`, `sent`, `cancelled`, `failed`), `last_error`, and `sent_message_sid`.

Only create these jobs for eligible, non-opted-out leads. Cancel remaining jobs when a lead replies, becomes hot, is assigned, or opts out.

## 7. Qualification agent contract

The agent is conversational, but its effects are constrained.

### Inputs

- The most recent 8–12 messages from the selected lead.
- Existing normalized qualification fields.
- Current property-profile data.
- The selected lead's engagement state and outstanding question.

### Structured output

The model must return a schema-validated object such as:

```json
{
  "language": "fr",
  "facts": {
    "budgetMad": 1300000,
    "budgetRaw": "autour de 1,3 million",
    "location": "Bouskoura",
    "propertyType": "apartment",
    "timelineDays": 60,
    "financing": "pre_approved",
    "intent": "buy"
  },
  "missingFields": ["financing"],
  "reply": "Parfait. Votre financement est-il déjà pré-accordé par la banque ?",
  "needsHuman": false,
  "optedOut": false,
  "evidence": [{"field": "budgetMad", "messageIndex": 3, "excerpt": "1,3 million"}]
}
```

### Guardrails

- Extract facts only supported by a message; use `null` when unknown.
- Ask exactly one concise question at a time.
- Never invent price, availability, discount, financing approval, or viewing availability.
- Keep the reply in the lead's language and never expose internal scores.
- Recognize opt-out language such as `STOP`, `ARRÊT`, and Arabic equivalents; stop future messages immediately.
- Escalate to a human if a lead asks for legal/financial advice, exact availability, or a salesperson.
- Validate all model fields with TypeScript/Zod before writing to the database.

## 8. Scoring and prioritization

Scoring is deterministic TypeScript, never a free-form model decision.

### Intent score

| Signal | Points |
| --- | ---: |
| Budget fits an active property profile | +30 |
| Requested area matches a project | +25 |
| Purchase target within 90 days | +20 |
| Cash or mortgage pre-approval | +15 |
| Explicitly accepts a call or visit | +10 |

### Confidence score

Confidence is calculated from the completeness and clarity of the evidence. A lead who sends only one rich message can have high intent but medium confidence.

```text
Example: “Je cherche un T3 à Bouskoura, budget 1,3M, urgent.”
Intent score:      75/100
Confidence score:  55/100
Status:            priority_unconfirmed
```

This distinction solves the original problem: unresponsive leads are ranked for human follow-up without falsely claiming that they are fully qualified.

### Inbox order

1. `hot` — confirmed, high-intent leads ready for human handoff.
2. `priority_unconfirmed` — strong initial signals, no reply or incomplete profile.
3. `warm` / `partial` — agent is collecting information or a scheduled re-engagement is due.
4. `nurture` — low evidence or low stated intent.

Every card shows a human-readable score explanation rather than a mysterious number.

## 9. Core flows

### A. First inbound WhatsApp message

1. Twilio calls `POST /api/twilio/whatsapp`.
2. Verify the Twilio signature before processing the request.
3. Reject duplicate `MessageSid` values without sending a second reply.
4. Create or locate the lead by normalized phone number.
5. Persist the inbound message.
6. Run the qualification service and deterministic score.
7. Persist updated qualification, scores, status, and next follow-up eligibility.
8. Return one localized WhatsApp message asking the highest-value missing question.
9. Update the sales inbox; no salesperson action is required.

### B. Silent high-potential lead

1. Lead sends a meaningful first message.
2. Agent extracts early intent signals and sends its first qualification question.
3. Lead is immediately visible as `priority_unconfirmed`.
4. If the lead remains silent, a due follow-up job sends a permitted re-engagement message.
5. The salesperson can call the highest-intent silent lead directly from the workspace.

### C. Fully qualified lead and human handoff

1. Qualification becomes sufficiently complete and meets the `hot` threshold.
2. CopilotKit renders `LeadQualificationCard` with facts, evidence, explanation, and recommendation.
3. The agent proposes an internal sales task; it cannot create the task directly.
4. The sales rep clicks **Approve & create follow-up** or **Decline**.
5. Only approval reaches `POST /api/followups`.
6. The server creates the Ambiguous task and returns the real ID/link.
7. Store the returned ID in the lead record and show it after page refresh.

### D. Scheduled re-engagement

1. A protected cron endpoint or worker runs periodically.
2. It selects due `pending` jobs in a transaction.
3. It rechecks opt-out, current lead state, and cooldown rules.
4. It sends one approved WhatsApp follow-up and persists the returned Twilio SID.
5. It marks the job `sent` or `failed` and never retries indefinitely.

## 10. CopilotKit workspace integration

Keep the starter's CopilotKit wiring and approval UI. Replace its incident-specific context with lead context.

### Page context supplied to the agent

```ts
{
  selectedLead: {
    id, displayName, status, intentScore, confidenceScore,
    qualification, transcript, recommendedAction
  },
  activePropertyProfiles: [...],
  salesQueueSummary: {...}
}
```

### Frontend tools and generated components

| Capability | Purpose | Can write externally? |
| --- | --- | --- |
| `select_lead` | Change the active lead context | No |
| `show_qualification_card` | Render an explainable assessment | No |
| `propose_sales_followup` | Render an approval card | No |
| `retrieve_followup` | Read back an approved Ambiguous task | No |
| Page approval button | Calls the server to create the task | Yes, only after click |

The agent does not receive raw Ambiguous write tools. That is intentional: an assistant saying it created a task is not evidence; the returned provider record is.

## 11. Environment variables

Use the starter kit's root `.env`; never commit it.

```bash
# Existing starter model configuration
MODEL_PROVIDER=openai
OPENAI_API_KEY=...
MODEL=...

# Existing Web-template persistent task integration
AMBIGUOUS_API_KEY=...

# LeadPulse WhatsApp connector
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_FROM=whatsapp:+...

# Local MVP storage and scheduled-job protection
DATABASE_URL=file:./apps/web/data/leadpulse.db
CRON_SECRET=...
```

Only the Next.js server reads secrets. Do not expose Twilio, model-provider, Ambiguous, or cron credentials through `NEXT_PUBLIC_*` variables.

## 12. Failure handling and safety checks

| Situation | Required behavior |
| --- | --- |
| Invalid Twilio signature | Reject request; do not persist or reply |
| Duplicate webhook | Return success without duplicate message/task |
| Model request fails | Store message, mark `needs_human`/retryable error, do not invent a reply |
| Invalid structured output | Do not write facts; use a safe generic acknowledgement or flag for review |
| Opt-out | Mark `opted_out`, cancel follow-up jobs, send no further messages |
| Lead refuses a task | Keep lead state; create no Ambiguous record |
| Ambiguous write fails | Show failure in UI; do not claim success; allow a deliberate retry |
| Twilio outbound failure | Mark the job/message failed with a safe error; do not assume delivery |

For the demo, visibly show at least one rejected approval or incomplete lead path as well as the success path.

## 13. Build sequence

1. Clone the starter kit, read its root guidance, select `apps/web`, install dependencies, and run the untouched verification command.
2. Replace the incident seed data with lead transcripts, property profiles, and sales-rep data.
3. Implement SQLite migrations/repository and deterministic scoring tests.
4. Build the LeadPulse workspace: inbox, transcript, qualification card, and score explanations.
5. Adapt CopilotKit page context and generated components to the selected lead.
6. Keep the existing approval boundary, but change its payload to a sales follow-up; verify an Ambiguous task can be created, read back, and declined.
7. Add the Twilio webhook, signature validation, idempotency, and outbound localized reply.
8. Add the follow-up-job schema and protected runner; demonstrate with an already-due test job.
9. Run all starter-kit checks, then live-test WhatsApp → inbox → approval → persisted task.
10. Complete `SUBMISSION.md`: distinguish inherited starter code from LeadPulse work and record actual credentials/processes required to run the demo.

## 14. Definition of done and demo evidence

The following must be observable, not merely described:

- A phone sends a real message to the Twilio Sandbox.
- The WhatsApp agent replies appropriately and the transcript appears in LeadPulse.
- A first-message-only lead is ranked as `priority_unconfirmed` with a reason.
- A complete lead is ranked `hot` and has a clear next action.
- The selected-lead CopilotKit agent renders the qualification result from page context.
- Declining a proposal creates no external task.
- Approving a proposal returns an actual Ambiguous task ID/link.
- Refreshing and retrieving the task proves persistence.
- A duplicate Twilio webhook does not produce a duplicate reply or task.

## 15. Post-hackathon evolution

- Replace SQLite with a managed database and encrypt personal data at rest.
- Integrate HubSpot/Salesforce as the sales system of record.
- Add consent capture, retention policies, access control, and a formal CNDP compliance review.
- Add audio-message transcription and language-quality evaluation for Darija.
- Introduce a property-matching agent and an appointment-scheduling agent, each with explicit tool boundaries and human approval where appropriate.
