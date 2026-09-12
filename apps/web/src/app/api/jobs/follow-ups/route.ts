import {
  addMessage,
  claimDueFollowUps,
  failFollowUp,
  finishFollowUp,
  getLead,
} from "@/lib/server/lead-store";
import { followUpMessage, sendWhatsAppMessage } from "@/lib/server/twilio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected || request.headers.get("authorization") !== `Bearer ${expected}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const claimed = claimDueFollowUps();
  const results: Array<{ jobId: string; status: "sent" | "skipped" | "failed" }> = [];
  for (const job of claimed) {
    const lead = getLead(job.leadId);
    if (!lead || lead.engagementState === "opted_out" || lead.status === "hot" || lead.approvedTaskId) {
      failFollowUp(job.id, "Lead is no longer eligible for automated follow-up.");
      results.push({ jobId: job.id, status: "skipped" });
      continue;
    }
    try {
      const body = followUpMessage(lead.preferredLanguage, job.sequenceDay);
      const sent = await sendWhatsAppMessage(lead.phoneE164, body);
      addMessage(lead.id, {
        providerMessageSid: sent.sid,
        direction: "outbound",
        body,
        createdAt: new Date().toISOString(),
      });
      finishFollowUp(job.id, sent.sid);
      results.push({ jobId: job.id, status: "sent" });
    } catch {
      failFollowUp(job.id, "Twilio could not deliver this follow-up.");
      results.push({ jobId: job.id, status: "failed" });
    }
  }
  return Response.json({ processed: results.length, results });
}
