import { listLeads } from "@/lib/server/lead-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ leads: listLeads() }, { headers: { "Cache-Control": "no-store" } });
}
