"use client";

import { useFrontendTool, useAgentContext } from "@copilotkit/react-core/v2";
import { z } from "zod";
import type { WorkplaceControls } from "@/lib/use-workplace";
import type { LeadDetail, LeadSummary } from "@/lib/lead-types";

async function toolResult<T>(action: () => Promise<T>) {
  try {
    return await action();
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Workplace operation failed. Check the page for setup details.",
    };
  }
}

export function AppControl({
  selectedLead,
  leads,
  selectLead,
  workplace,
}: {
  selectedLead: LeadDetail;
  leads: LeadSummary[];
  selectLead: (id: string) => Promise<void>;
  workplace: WorkplaceControls;
}) {
  const { status, propose, retrieve } = workplace;

  useAgentContext({
    description:
      "The LeadPulse sales workspace currently visible to the user. It includes the selected lead's WhatsApp transcript, qualification, score, and approved Ambiguous follow-ups. CRITICAL: propose_sales_followup only prepares a proposal. Only the user's approval button saves it; prose/chat approval never executes a write. Use retrieve_followup or refresh_followups for real reads. Never claim a task was saved without a provider record. Never invent record links.",
    value: {
      availableLeads: leads.map((lead) => ({
        id: lead.id,
        name: lead.displayName || lead.phoneE164,
        status: lead.status,
        intentScore: lead.intentScore,
      })),
      selectedLead,
      followups: status?.status === "connected" ? status.tasks : [],
      workplace: status?.status ?? "unavailable",
      workplaceError: workplace.error,
      proposal: workplace.proposal ?? null,
      lastResult: workplace.notice,
    },
  });

  useFrontendTool(
    {
        name: "select_lead",
        description:
          "Open an existing lead in the workspace. Use an ID from availableLeads.",
        parameters: z.object({ leadId: z.string() }),
        handler: async ({ leadId }) => {
          const lead = leads.find((item) => item.id === leadId);
          if (!lead) throw new Error("Unknown lead. Use an ID from availableLeads.");
          await selectLead(lead.id);
          return `Opened ${lead.id}: ${lead.displayName || lead.phoneE164}. The visible details and agent context now show this lead.`;
        },
      },
    [leads, selectLead],
  );

  useFrontendTool(
    {
        name: "propose_sales_followup",
        description:
          "Prepare an Ambiguous sales task from the selected lead context. Show the exact title and details for the user's approval button. Does not save anything. CRITICAL: wait for the user to click Approve & save to Ambiguous in the page.",
        parameters: z.object({
          leadId: z.string(),
        title: z.string().trim().min(1).max(200),
        details: z.string().trim().min(1).max(4000),
      }),
      handler: async (draft) =>
        toolResult(async () => {
          if (draft.leadId !== selectedLead.id)
            throw new Error(
              "The proposal must be for the lead currently open in the workspace. Select that lead first.",
            );
          return {
            status: "pending_approval",
            proposal: await propose(draft),
          };
        }),
    },
    [propose, selectedLead.id],
  );

  useFrontendTool(
    {
      name: "retrieve_followup",
      description:
        "Retrieve an existing Ambiguous task by its actual ID. Read-only; never creates a duplicate.",
      parameters: z.object({ id: z.uuid() }),
      handler: async ({ id }) => toolResult(() => retrieve(id)),
    },
    [retrieve],
  );

  useFrontendTool(
    {
      name: "refresh_followups",
      description:
        "Read saved follow-ups for the currently selected lead from Ambiguous. Use after approval or browser refresh to verify persistence.",
      parameters: z.object({}),
      handler: async () => toolResult(() => workplace.refresh()),
    },
    [workplace.refresh],
  );

  return null;
}
