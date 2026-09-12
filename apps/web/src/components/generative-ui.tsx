"use client";

/**
 * Generative UI, controlled tier.
 *
 * `useComponent` gives the agent a catalog of *your* React components and lets
 * it choose one and fill in the props. The interface stays on-brand and
 * pixel-perfect because you wrote it — the agent only decides what to show.
 *
 * Renderers receive streamed partial arguments before schema defaults apply.
 */
import { useComponent } from "@copilotkit/react-core/v2";
import { z } from "zod";

import { LeadQualificationCard, Timeline } from "./streamed-cards";

export function GenerativeUI() {
  useComponent({
    name: "lead_qualification_card",
    description:
      "Draw the selected lead's qualification as an explainable card. Call this once you have read the selected lead context.",
    parameters: z.object({
      headline: z.string().describe("Lead status in under ten words."),
      summary: z.string().describe("Factual explanation based on the selected transcript."),
      intentScore: z.number().int().min(0).max(100),
      confidenceScore: z.number().int().min(0).max(100),
      facts: z.array(z.object({ label: z.string(), value: z.string() })).max(4).default([]),
      missing: z.array(z.string()).max(5).default([]),
      recommendedAction: z.string().max(240),
      tone: z.enum(["neutral", "good", "attention"]).default("neutral"),
    }),
    render: LeadQualificationCard,
  });

  useComponent({
    name: "timeline",
    description:
      "Draw an ordered timeline of what happened when. Call this when there are three or more events worth ordering.",
    parameters: z.object({
      title: z.string().optional(),
      columns: z.array(z.string()).min(1).max(4),
      rows: z.array(z.array(z.string())),
    }),
    render: Timeline,
  });

  // Hooks register into the chat stream, so this component renders nothing.
  return null;
}
