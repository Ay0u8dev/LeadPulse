import {
  addMessage,
  cancelFollowUps,
  createOrGetLead,
  getLead,
  hasMessageSid,
  markOptedOut,
  scheduleFollowUps,
  updateLeadAnalysis,
} from "@/lib/server/lead-store";
import {
  isOptOutText,
  qualifyLead,
  safeAcknowledgement,
} from "@/lib/server/qualification";
import { scoreLead } from "@/lib/scoring";
import { twimlReply, validateTwilioRequest } from "@/lib/server/twilio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function formValues(form: FormData) {
  return Object.fromEntries(
    [...form.entries()].flatMap(([key, value]) =>
      typeof value === "string" ? [[key, value]] : [],
    ),
  ) as Record<string, string>;
}

function xml(body: string, status = 200) {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/xml; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  const form = await request.formData();
  const values = formValues(form);
  if (!validateTwilioRequest(request.headers.get("x-twilio-signature"), values)) {
    return new Response("Invalid Twilio signature.", { status: 403 });
  }

  const messageSid = values.MessageSid;
  const from = values.From?.replace(/^whatsapp:/, "");
  const body = values.Body?.trim();
  if (!messageSid || !from || !body) return new Response("Missing WhatsApp message data.", { status: 400 });
  if (hasMessageSid(messageSid)) return xml("<Response />");

  const lead = createOrGetLead(from, values.ProfileName);
  addMessage(lead.id, {
    providerMessageSid: messageSid,
    direction: "inbound",
    body,
    createdAt: new Date().toISOString(),
  });

  if (isOptOutText(body)) {
    markOptedOut(lead.id);
    const reply = lead.preferredLanguage === "ar"
      ? "تم إيقاف الرسائل."
      : lead.preferredLanguage === "darija"
        ? "وقفنا الرسائل."
        : "Vos messages ont été arrêtés.";
    addMessage(lead.id, {
      providerMessageSid: `twiml:${messageSid}`,
      direction: "outbound",
      body: reply,
      createdAt: new Date().toISOString(),
    });
    return xml(twimlReply(reply));
  }

  const current = getLead(lead.id)!;
  try {
    const analysis = await qualifyLead({
      messages: current.messages,
      existing: current.qualification,
    });
    if (analysis.optedOut) {
      markOptedOut(lead.id);
    } else {
      const score = scoreLead(analysis.qualification);
      const engagementState = analysis.needsHuman
        ? "needs_human"
        : score.status === "hot"
          ? "qualified"
          : analysis.qualification.missingFields.length
            ? "partial"
            : "awaiting_reply";
      updateLeadAnalysis({
        leadId: lead.id,
        language: analysis.language,
        engagementState,
        qualification: analysis.qualification,
        score,
      });
      if (score.status === "hot" || analysis.needsHuman) cancelFollowUps(lead.id);
      else scheduleFollowUps(lead.id);
    }
    addMessage(lead.id, {
      providerMessageSid: `twiml:${messageSid}`,
      direction: "outbound",
      body: analysis.reply,
      createdAt: new Date().toISOString(),
    });
    return xml(twimlReply(analysis.reply));
  } catch {
    const reply = safeAcknowledgement(current.preferredLanguage);
    updateLeadAnalysis({
      leadId: lead.id,
      language: current.preferredLanguage,
      engagementState: "needs_human",
      qualification: current.qualification,
      score: {
        intentScore: current.intentScore,
        confidenceScore: current.confidenceScore,
        status: current.status,
        reasons: ["Qualification service needs review"],
      },
    });
    addMessage(lead.id, {
      providerMessageSid: `twiml:${messageSid}`,
      direction: "outbound",
      body: reply,
      createdAt: new Date().toISOString(),
    });
    return xml(twimlReply(reply));
  }
}
