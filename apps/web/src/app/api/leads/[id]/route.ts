import { getLead } from "@/lib/server/lead-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const lead = getLead(id);
  if (!lead) return Response.json({ error: "Lead not found." }, { status: 404 });
  return Response.json({ lead }, { headers: { "Cache-Control": "no-store" } });
}
