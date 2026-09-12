"use client";

import { useCallback, useEffect, useState } from "react";
import { CopilotChat, useConfigureSuggestions } from "@copilotkit/react-core/v2";
import { AppControl } from "@/components/app-control";
import { GenerativeUI } from "@/components/generative-ui";
import { WorkplaceFollowups } from "@/components/workplace-followups";
import type { LeadDetail, LeadSummary } from "@/lib/lead-types";
import { useWorkplace } from "@/lib/use-workplace";

function displayName(lead: LeadSummary) {
  return lead.displayName || lead.phoneE164;
}

function statusLabel(status: LeadSummary["status"]) {
  return status.replace(/_/g, " ");
}

export function LeadWorkspace({
  initialLeads,
  initialSelectedLead,
}: {
  initialLeads: LeadSummary[];
  initialSelectedLead: LeadDetail;
}) {
  const [leads, setLeads] = useState(initialLeads);
  const [selectedLead, setSelectedLead] = useState(initialSelectedLead);
  const [refreshing, setRefreshing] = useState(false);
  const workplace = useWorkplace(selectedLead.id);

  const refreshLeads = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await fetch("/api/leads", { cache: "no-store" });
      const payload = (await response.json()) as { leads: LeadSummary[] };
      if (!response.ok) throw new Error("Unable to refresh the lead inbox.");
      setLeads(payload.leads);
      const active = payload.leads.find((lead) => lead.id === selectedLead.id);
      if (active) {
        const detailResponse = await fetch(`/api/leads/${active.id}`, { cache: "no-store" });
        const detailPayload = (await detailResponse.json()) as { lead: LeadDetail };
        if (detailResponse.ok) setSelectedLead(detailPayload.lead);
      }
    } finally {
      setRefreshing(false);
    }
  }, [selectedLead.id]);

  const selectLead = useCallback(async (id: string) => {
    const response = await fetch(`/api/leads/${id}`, { cache: "no-store" });
    const payload = (await response.json()) as { lead?: LeadDetail; error?: string };
    if (!response.ok || !payload.lead) throw new Error(payload.error || "Unable to open this lead.");
    setSelectedLead(payload.lead);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => refreshLeads().catch(() => {}), 10_000);
    return () => window.clearInterval(timer);
  }, [refreshLeads]);

  useConfigureSuggestions(
    {
      suggestions: [
        { title: "Explain this lead", message: "Explain this selected lead's intent and confidence score using the visible transcript. Show a qualification card." },
        { title: "Prepare sales handoff", message: "If this selected lead is ready, prepare a factual sales follow-up proposal. Do not claim it is saved." },
      ],
      available: "before-first-message",
    },
    [],
  );

  const qualification = selectedLead.qualification;
  return (
    <>
      <GenerativeUI />
      <AppControl
        selectedLead={selectedLead}
        leads={leads}
        selectLead={selectLead}
        workplace={workplace}
      />
      <main className="leadpulse-workspace">
        <header className="leadpulse-header">
          <div>
            <p className="leadpulse-eyebrow">Agents, Everywhere · WhatsApp sales workspace</p>
            <h1>LeadPulse</h1>
            <p>Every WhatsApp lead, prioritized before a salesperson picks up the phone.</p>
          </div>
          <button className="ck-btn" type="button" disabled={refreshing} onClick={() => refreshLeads().catch(() => {})}>
            {refreshing ? "Refreshing…" : "Refresh inbox"}
          </button>
        </header>

        <div className="leadpulse-grid">
          <aside className="leadpulse-inbox" aria-label="Lead inbox">
            <div className="leadpulse-section-head">
              <div><p className="leadpulse-eyebrow">Prioritized inbox</p><h2>{leads.length} leads</h2></div>
              <span className="ck-tag">Live CRM</span>
            </div>
            <div className="leadpulse-lead-list">
              {leads.map((lead) => (
                <button key={lead.id} type="button" className={`leadpulse-lead-row${lead.id === selectedLead.id ? " is-selected" : ""}`} onClick={() => selectLead(lead.id).catch(() => {})}>
                  <span className={`leadpulse-status leadpulse-status--${lead.status}`}>{statusLabel(lead.status)}</span>
                  <strong>{displayName(lead)}</strong>
                  <span>{lead.qualification.location || "Location pending"} · {lead.qualification.propertyType || "Property pending"}</span>
                  <small>Intent {lead.intentScore} · Confidence {lead.confidenceScore}</small>
                </button>
              ))}
            </div>
          </aside>

          <section className="leadpulse-detail" aria-labelledby="lead-title">
            <div className="leadpulse-section-head">
              <div>
                <p className="leadpulse-eyebrow">Selected WhatsApp lead</p>
                <h2 id="lead-title">{displayName(selectedLead)}</h2>
                <p>{selectedLead.phoneE164} · {selectedLead.preferredLanguage.toUpperCase()} · {selectedLead.engagementState.replace(/_/g, " ")}</p>
              </div>
              <span className={`leadpulse-status leadpulse-status--${selectedLead.status}`}>{statusLabel(selectedLead.status)}</span>
            </div>

            <section className="leadpulse-brief" aria-labelledby="brief-title">
              <div><p className="leadpulse-eyebrow">Qualification brief</p><h3 id="brief-title">Intent {selectedLead.intentScore}/100 <span>·</span> Confidence {selectedLead.confidenceScore}/100</h3></div>
              <dl className="leadpulse-facts">
                <div><dt>Budget</dt><dd>{qualification.budgetRaw || "Not confirmed"}</dd></div>
                <div><dt>Location</dt><dd>{qualification.location || "Not confirmed"}</dd></div>
                <div><dt>Property</dt><dd>{qualification.propertyType || "Not confirmed"}</dd></div>
                <div><dt>Timeline</dt><dd>{qualification.timelineDays !== null ? `${qualification.timelineDays} days` : "Not confirmed"}</dd></div>
                <div><dt>Financing</dt><dd>{qualification.financing.replace(/_/g, " ")}</dd></div>
                <div><dt>Next step</dt><dd>{selectedLead.status === "hot" ? "Prepare sales handoff" : "Continue qualification"}</dd></div>
              </dl>
              {!!qualification.missingFields.length && <p className="leadpulse-missing">Missing: {qualification.missingFields.join(", ").replace(/_/g, " ")}</p>}
            </section>

            <section className="leadpulse-transcript" aria-labelledby="transcript-title">
              <div className="leadpulse-section-head"><div><p className="leadpulse-eyebrow">Conversation context</p><h3 id="transcript-title">WhatsApp transcript</h3></div><span className="ck-tag">Twilio</span></div>
              <ol>
                {selectedLead.messages.map((message) => (
                  <li key={message.id} className={`leadpulse-message leadpulse-message--${message.direction}`}>
                    <span>{message.direction === "inbound" ? displayName(selectedLead) : "LeadPulse"}</span>
                    <p>{message.body}</p>
                    <time>{new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
                  </li>
                ))}
              </ol>
            </section>

            <WorkplaceFollowups leadId={selectedLead.id} workplace={workplace} />
          </section>

          <section className="leadpulse-assistant" aria-labelledby="assistant-title">
            <header><p className="leadpulse-eyebrow">CopilotKit agent</p><h2 id="assistant-title">Sales copilot</h2><p>Reads the selected conversation and prepares explainable next actions.</p></header>
            <CopilotChat className="ck-chat" labels={{ welcomeMessageText: "Which lead should we prioritize?", chatInputPlaceholder: "Ask about this lead…" }} />
          </section>
        </div>
      </main>
    </>
  );
}
