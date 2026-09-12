# LeadPulse submission checklist

Choose your city on the [global event page](https://aitinkerers.org/hackathons/global/agents-everywhere). Use that city's participant portal for the submission deadline and published judging criteria, and its handbook for eligibility and required deliverables. See [hackathon-rules.md](hackathon-rules.md) for the agent-readable summary.

## Build eligibility

- [ ] Our submitted project is a net-new build created during the official hackathon period
- [ ] Its core functionality was built during the event; we are not resubmitting or extending a pre-existing project and entering it as new
- [ ] We identify inherited templates, libraries, prompts, components, and starter code separately from our event work

**What we inherited**

The Web template of the CopilotKit Agents, Everywhere Starter Kit: the Next.js shell, CopilotKit runtime wiring, generic provider adapter, and its approval-boundary pattern.

**What we built during the hackathon**

LeadPulse’s Twilio WhatsApp webhook and TwiML reply flow; SQLite lead, transcript, and follow-up persistence; OpenAI qualification extraction; explainable scoring/routing; multilingual French/Arabic/Darija policy; a lead-prioritized sales workspace; CopilotKit lead tools and qualification card; and a J+3/J+7/J+14 follow-up endpoint. See [README.md](README.md) and [the technical breakdown](docs/TECHNICAL_BREAKDOWN.md).

## Title and description

**What you built**

LeadPulse qualifies inbound WhatsApp real-estate leads for a Bouskoura apartment project. An inbound Twilio message is saved, analyzed into a structured qualification, scored deterministically, and answered in the prospect’s language. A sales rep opens the resulting CRM-lite workspace and can ask the embedded Copilot to explain the lead or prepare a factual Ambiguous handoff task. Only a separate human approval button creates and reads back that internal task.

**Who it is for**

Four-person sales teams at Casablanca property developers who receive hundreds of paid-campaign leads every month but can only call a small subset deeply.

**Why the context matters**

The agent sees the selected prospect’s real WhatsApp transcript, current qualification evidence, deterministic score, and previous internal follow-ups. That lets it distinguish a hot lead from a high-potential prospect who stopped replying—something a standalone chat cannot do—and creates an approval-bound sales task only for the lead actually selected in the workspace.

**Sponsor technologies used**

- CopilotKit: embeds an agent in the lead workspace, supplies page context, frontend tools, and the qualification card.
- OpenAI: extracts structured qualification facts and produces the short prospect-facing reply.
- Ambiguous AI: stores the sales task only after page-level human approval and server read-back.
- Twilio: receives WhatsApp leads and sends immediate and scheduled WhatsApp follow-ups.

## Evidence for the judging criteria

Judges score each of the four official criteria from 1–5. This checklist helps you gather evidence; it does not guarantee a score. A working starter is a foundation for your own project.

| Official criterion | Show in your project and demo |
|---|---|
| Core Requirements & Functionality | Run one complete workflow in the intended environment, from user request through tools to a verified result. Repeat it with live integrations; offline tests alone do not prove the deployed flow. |
| Innovation & Theme Alignment | Show the surrounding context before the prompt and explain the original interaction it enables. Compare with the context removed: what value would a standalone chatbox lose? |
| Technical Execution & Integration | Show how tools, data, and the environment connect. Demonstrate a relevant failure or cancellation path and explain recovery, state persistence, and integration limits. |
| Usefulness & Agentic Experience | Identify the user and problem, show a meaningful action in the surface, and demonstrate clear feedback and appropriate user control. Explain what work the agent saves. |

- [ ] We can point to visible evidence for every criterion
- [ ] We distinguish live services, sample data, session-only state, and standalone recipes
- [ ] Sponsor technologies contribute to the workflow; their count is not a judging criterion

## Public repository

- [ ] A new participant can run the quickstart from a clean clone
- [ ] The README lists the credentials and separate processes required
- [ ] `npm run verify` passes; optional recipe checks pass if used
- [ ] `.env`, tokens, generated traces with sensitive data, and account secrets are excluded
- [ ] Sample data, session-only state, and unimplemented integrations are clearly labeled

## Two-minute demo video

- [ ] Show the surface and existing context before the prompt
- [ ] Demonstrate one complete interaction
- [ ] Show a visible result: an actual record, local state change, or research source links
- [ ] If showing an approval, distinguish the decision from execution and demonstrate the resulting behavior
- [ ] State which sponsor technologies made the interaction possible
- [ ] Keep the video within the event's limit and check audio

See [README.md](README.md#4-exercise-the-demo) for a reproducible LeadPulse workflow.

## Social post and final submission

- [ ] Follow the organizer's posting and sponsor-tagging instructions
- [ ] Link the public repository and video
- [ ] Credit the sponsors you used and applicable local partners
- [ ] Check the live integration once more before recording or submitting
- [ ] Inspect the repository, video and screenshots for secrets

Prepare the post and submission for a human to publish; running the starter kit
does not publish either automatically.
