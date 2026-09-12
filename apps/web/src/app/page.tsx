import { LeadWorkspace } from "@/components/lead-workspace";
import { getLead, listLeads } from "@/lib/server/lead-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function Home() {
  const leads = listLeads();
  const selectedLead = getLead(leads[0]?.id || "lead-yasmine");
  if (!selectedLead) throw new Error("LeadPulse could not initialize its demo lead data.");
  return <LeadWorkspace initialLeads={leads} initialSelectedLead={selectedLead} />;
}
