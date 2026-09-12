import twilio from "twilio";
import type { LeadLanguage } from "../lead-types";

export function validateTwilioRequest(
  signature: string | null,
  params: Record<string, string>,
) {
  if (process.env.TWILIO_VALIDATE_SIGNATURE === "false") return true;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const baseUrl = process.env.TWILIO_WEBHOOK_BASE_URL?.replace(/\/$/, "");
  if (!token || !baseUrl || !signature) return false;
  return twilio.validateRequest(token, signature, `${baseUrl}/api/twilio/whatsapp`, params);
}

export function twimlReply(body: string) {
  const response = new twilio.twiml.MessagingResponse();
  response.message(body);
  return response.toString();
}

function getClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;
  if (!sid || !token || !from) throw new Error("Twilio WhatsApp credentials are not configured.");
  return { client: twilio(sid, token), from };
}

export async function sendWhatsAppMessage(to: string, body: string) {
  const { client, from } = getClient();
  return client.messages.create({ to: `whatsapp:${to}`, from, body });
}

export function followUpMessage(language: LeadLanguage, sequenceDay: number) {
  if (language === "ar") return `مرحباً، هل ما زلت مهتماً بشقة في بوسكورة؟ يمكننا مساعدتك في اختيار خيار مناسب.`;
  if (language === "darija") return `Salam، واش مازال مهتم بشقة فبوسكورة؟ نقدروا نعاونك نلقاو ليك الاختيار المناسب.`;
  return `Bonjour, êtes-vous toujours intéressé(e) par un appartement à Bouskoura ? Nous pouvons vous aider à trouver l'option adaptée.`;
}
