import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type {
  EngagementState,
  LeadDetail,
  LeadLanguage,
  LeadMessage,
  LeadQualification,
  LeadStatus,
} from "../lead-types";
import type { LeadScore } from "../scoring";

type LeadRow = {
  id: string;
  phone_e164: string;
  display_name: string | null;
  preferred_language: LeadLanguage;
  engagement_state: EngagementState;
  intent_score: number;
  confidence_score: number;
  status: LeadStatus;
  qualification_json: string;
  next_follow_up_at: string | null;
  approved_task_id: string | null;
  updated_at: string;
};

const defaultQualification = (): LeadQualification => ({
  budgetMad: null,
  budgetRaw: null,
  location: null,
  propertyType: null,
  timelineDays: null,
  financing: "unknown",
  intent: "unknown",
  acceptedCallOrVisit: false,
  missingFields: ["budget", "location", "property_type", "timeline"],
  evidence: [],
});

let database: DatabaseSync | undefined;

function now() {
  return new Date().toISOString();
}

function db() {
  if (database) return database;
  const path = resolve(process.cwd(), process.env.LEADPULSE_DB_PATH || ".data/leadpulse.db");
  mkdirSync(dirname(path), { recursive: true });
  database = new DatabaseSync(path);
  database.exec("PRAGMA journal_mode = WAL;");
  database.exec(`
    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      phone_e164 TEXT NOT NULL UNIQUE,
      display_name TEXT,
      preferred_language TEXT NOT NULL DEFAULT 'unknown',
      engagement_state TEXT NOT NULL DEFAULT 'new',
      intent_score INTEGER NOT NULL DEFAULT 0,
      confidence_score INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'nurture',
      qualification_json TEXT NOT NULL,
      next_follow_up_at TEXT,
      approved_task_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL REFERENCES leads(id),
      provider_message_sid TEXT NOT NULL UNIQUE,
      direction TEXT NOT NULL CHECK(direction IN ('inbound', 'outbound')),
      body TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS follow_up_jobs (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL REFERENCES leads(id),
      due_at TEXT NOT NULL,
      sequence_day INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      last_error TEXT,
      sent_message_sid TEXT,
      claimed_at TEXT
    );
    CREATE INDEX IF NOT EXISTS messages_lead_created ON messages(lead_id, created_at);
    CREATE INDEX IF NOT EXISTS follow_up_jobs_due ON follow_up_jobs(status, due_at);
  `);
  seedDemoLeads(database);
  return database;
}

function mapLead(row: LeadRow): Omit<LeadDetail, "messages"> {
  return {
    id: row.id,
    phoneE164: row.phone_e164,
    displayName: row.display_name,
    preferredLanguage: row.preferred_language,
    engagementState: row.engagement_state,
    intentScore: row.intent_score,
    confidenceScore: row.confidence_score,
    status: row.status,
    qualification: JSON.parse(row.qualification_json) as LeadQualification,
    nextFollowUpAt: row.next_follow_up_at,
    approvedTaskId: row.approved_task_id,
    updatedAt: row.updated_at,
  };
}

function seedLead(
  instance: DatabaseSync,
  input: {
    id: string;
    name: string;
    phone: string;
    language: LeadLanguage;
    state: EngagementState;
    score: LeadScore;
    qualification: LeadQualification;
    messages: Array<{ sid: string; direction: "inbound" | "outbound"; body: string; time: string }>;
  },
) {
  const existing = instance.prepare("SELECT 1 FROM leads WHERE id = ?").get(input.id);
  if (existing) return;
  const timestamp = now();
  instance
    .prepare(`INSERT INTO leads (id, phone_e164, display_name, preferred_language, engagement_state, intent_score, confidence_score, status, qualification_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(
      input.id,
      input.phone,
      input.name,
      input.language,
      input.state,
      input.score.intentScore,
      input.score.confidenceScore,
      input.score.status,
      JSON.stringify(input.qualification),
      timestamp,
      timestamp,
    );
  const insert = instance.prepare(`INSERT INTO messages (id, lead_id, provider_message_sid, direction, body, created_at)
    VALUES (?, ?, ?, ?, ?, ?)`);
  for (const message of input.messages) {
    insert.run(randomUUID(), input.id, message.sid, message.direction, message.body, message.time);
  }
}

function seedDemoLeads(instance: DatabaseSync) {
  const hot: LeadQualification = {
    budgetMad: 1_350_000,
    budgetRaw: "1,35 million MAD",
    location: "Bouskoura",
    propertyType: "apartment",
    timelineDays: 45,
    financing: "pre_approved",
    intent: "buy",
    acceptedCallOrVisit: true,
    missingFields: [],
    evidence: [],
  };
  seedLead(instance, {
    id: "lead-yasmine",
    name: "Yasmine El M.",
    phone: "+212600000001",
    language: "fr",
    state: "qualified",
    score: { intentScore: 100, confidenceScore: 100, status: "hot", reasons: [] },
    qualification: hot,
    messages: [
      { sid: "demo-yasmine-1", direction: "inbound", body: "Bonjour, je cherche un T3 à Bouskoura. Mon budget est 1,35 million MAD.", time: "2026-09-12T08:20:00.000Z" },
      { sid: "demo-yasmine-2", direction: "outbound", body: "Merci Yasmine. À quel horizon souhaitez-vous acheter ?", time: "2026-09-12T08:20:05.000Z" },
      { sid: "demo-yasmine-3", direction: "inbound", body: "Dans un mois ou deux. J'ai déjà un pré-accord bancaire et je peux visiter samedi.", time: "2026-09-12T08:22:00.000Z" },
    ],
  });
  const silent: LeadQualification = {
    budgetMad: 1_250_000,
    budgetRaw: "1,25M",
    location: "Bouskoura",
    propertyType: "apartment",
    timelineDays: null,
    financing: "unknown",
    intent: "buy",
    acceptedCallOrVisit: false,
    missingFields: ["timeline", "financing", "call_or_visit"],
    evidence: [],
  };
  seedLead(instance, {
    id: "lead-amine",
    name: "Amine B.",
    phone: "+212600000002",
    language: "darija",
    state: "awaiting_reply",
    score: { intentScore: 65, confidenceScore: 60, status: "priority_unconfirmed", reasons: [] },
    qualification: silent,
    messages: [
      { sid: "demo-amine-1", direction: "inbound", body: "Salam, bghit appartement T3 f Bouskoura, budget 1,25M.", time: "2026-09-12T09:10:00.000Z" },
      { sid: "demo-amine-2", direction: "outbound", body: "Salam Amine. Fash katfakker teshri ?", time: "2026-09-12T09:10:04.000Z" },
    ],
  });
  const partial = defaultQualification();
  partial.location = "Casablanca";
  partial.propertyType = "apartment";
  partial.intent = "buy";
  partial.missingFields = ["budget", "timeline", "financing", "call_or_visit"];
  seedLead(instance, {
    id: "lead-sara",
    name: "Sara A.",
    phone: "+212600000003",
    language: "ar",
    state: "partial",
    score: { intentScore: 40, confidenceScore: 40, status: "warm", reasons: [] },
    qualification: partial,
    messages: [
      { sid: "demo-sara-1", direction: "inbound", body: "أبحث عن شقة في الدار البيضاء.", time: "2026-09-12T10:00:00.000Z" },
      { sid: "demo-sara-2", direction: "outbound", body: "مرحباً سارة. ما هي المنطقة التي تفضلينها؟", time: "2026-09-12T10:00:04.000Z" },
    ],
  });
  const dueJob = instance.prepare("SELECT 1 FROM follow_up_jobs WHERE lead_id = 'lead-amine'").get();
  if (!dueJob) {
    instance
      .prepare(`INSERT INTO follow_up_jobs (id, lead_id, due_at, sequence_day, status) VALUES (?, 'lead-amine', ?, 3, 'pending')`)
      .run(randomUUID(), "2026-09-11T09:10:04.000Z");
    instance
      .prepare("UPDATE leads SET next_follow_up_at = ? WHERE id = 'lead-amine'")
      .run("2026-09-11T09:10:04.000Z");
  }
}

export function listLeads() {
  const rows = db()
    .prepare(`SELECT * FROM leads ORDER BY
      CASE status WHEN 'hot' THEN 0 WHEN 'priority_unconfirmed' THEN 1 WHEN 'warm' THEN 2 ELSE 3 END,
      intent_score DESC, updated_at DESC`)
    .all() as LeadRow[];
  return rows.map(mapLead);
}

export function getLead(id: string): LeadDetail | undefined {
  const row = db().prepare("SELECT * FROM leads WHERE id = ?").get(id) as LeadRow | undefined;
  if (!row) return undefined;
  const messages = db()
    .prepare(`SELECT id, provider_message_sid, direction, body, created_at FROM messages WHERE lead_id = ? ORDER BY created_at ASC`)
    .all(id)
    .map((message) => ({
      id: message.id as string,
      providerMessageSid: message.provider_message_sid as string,
      direction: message.direction as "inbound" | "outbound",
      body: message.body as string,
      createdAt: message.created_at as string,
    })) as LeadMessage[];
  return { ...mapLead(row), messages };
}

export function getLeadByPhone(phone: string) {
  const row = db().prepare("SELECT * FROM leads WHERE phone_e164 = ?").get(phone) as LeadRow | undefined;
  return row ? mapLead(row) : undefined;
}

export function createOrGetLead(phone: string, displayName?: string) {
  const existing = getLeadByPhone(phone);
  if (existing) return existing;
  const id = randomUUID();
  const timestamp = now();
  db()
    .prepare(`INSERT INTO leads (id, phone_e164, display_name, qualification_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(id, phone, displayName || null, JSON.stringify(defaultQualification()), timestamp, timestamp);
  return getLead(id)!;
}

export function hasMessageSid(sid: string) {
  return !!db().prepare("SELECT 1 FROM messages WHERE provider_message_sid = ?").get(sid);
}

export function addMessage(
  leadId: string,
  message: Omit<LeadMessage, "id">,
) {
  db()
    .prepare(`INSERT INTO messages (id, lead_id, provider_message_sid, direction, body, created_at) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(randomUUID(), leadId, message.providerMessageSid, message.direction, message.body, message.createdAt);
  db().prepare("UPDATE leads SET updated_at = ? WHERE id = ?").run(now(), leadId);
}

export function updateLeadAnalysis(input: {
  leadId: string;
  language: LeadLanguage;
  engagementState: EngagementState;
  qualification: LeadQualification;
  score: LeadScore;
}) {
  db()
    .prepare(`UPDATE leads SET preferred_language = ?, engagement_state = ?, intent_score = ?, confidence_score = ?, status = ?, qualification_json = ?, updated_at = ? WHERE id = ?`)
    .run(
      input.language,
      input.engagementState,
      input.score.intentScore,
      input.score.confidenceScore,
      input.score.status,
      JSON.stringify(input.qualification),
      now(),
      input.leadId,
    );
}

export function markOptedOut(leadId: string) {
  db().prepare("UPDATE leads SET engagement_state = 'opted_out', status = 'closed', next_follow_up_at = NULL, updated_at = ? WHERE id = ?").run(now(), leadId);
  db().prepare("UPDATE follow_up_jobs SET status = 'cancelled' WHERE lead_id = ? AND status = 'pending'").run(leadId);
}

export function cancelFollowUps(leadId: string) {
  db().prepare("UPDATE follow_up_jobs SET status = 'cancelled' WHERE lead_id = ? AND status IN ('pending', 'processing')").run(leadId);
  db().prepare("UPDATE leads SET next_follow_up_at = NULL, updated_at = ? WHERE id = ?").run(now(), leadId);
}

export function setApprovedTask(leadId: string, taskId: string) {
  db().prepare("UPDATE leads SET approved_task_id = ?, updated_at = ? WHERE id = ?").run(taskId, now(), leadId);
}

export function scheduleFollowUps(leadId: string, from = Date.now()) {
  const insert = db().prepare(`INSERT INTO follow_up_jobs (id, lead_id, due_at, sequence_day, status) VALUES (?, ?, ?, ?, 'pending')`);
  const exists = db().prepare("SELECT 1 FROM follow_up_jobs WHERE lead_id = ?").get(leadId);
  if (exists) return;
  for (const day of [3, 7, 14]) {
    insert.run(randomUUID(), leadId, new Date(from + day * 86_400_000).toISOString(), day);
  }
  db().prepare("UPDATE leads SET next_follow_up_at = ? WHERE id = ?").run(new Date(from + 3 * 86_400_000).toISOString(), leadId);
}

export type DueFollowUp = { id: string; leadId: string; sequenceDay: number };

export function claimDueFollowUps(at = new Date().toISOString()) {
  const rows = db().prepare(`SELECT id, lead_id, sequence_day FROM follow_up_jobs WHERE status = 'pending' AND due_at <= ? ORDER BY due_at LIMIT 10`).all(at) as Array<{ id: string; lead_id: string; sequence_day: number }>;
  const claim = db().prepare("UPDATE follow_up_jobs SET status = 'processing', claimed_at = ? WHERE id = ? AND status = 'pending'");
  return rows.flatMap((row) =>
    claim.run(now(), row.id).changes ? [{ id: row.id, leadId: row.lead_id, sequenceDay: row.sequence_day }] : [],
  );
}

export function finishFollowUp(id: string, sid: string) {
  db().prepare("UPDATE follow_up_jobs SET status = 'sent', sent_message_sid = ? WHERE id = ?").run(sid, id);
}

export function failFollowUp(id: string, error: string) {
  db().prepare("UPDATE follow_up_jobs SET status = 'failed', last_error = ? WHERE id = ?").run(error.slice(0, 500), id);
}
