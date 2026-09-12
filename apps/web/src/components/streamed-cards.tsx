import React from "react";

export interface TimelineProps {
  title?: string;
  columns?: Array<string | null> | null;
  rows?: Array<Array<string | null> | null> | null;
}

export interface LeadQualificationCardProps {
  headline?: string;
  summary?: string;
  intentScore?: number;
  confidenceScore?: number;
  facts?: Array<{ label?: string; value?: string } | null> | null;
  missing?: Array<string | null> | null;
  recommendedAction?: string;
  tone?: string;
}

const toneColor = { neutral: "var(--muted)", good: "#2e7d5b", attention: "var(--accent)" } as const;

export function LeadQualificationCard({
  headline,
  summary,
  intentScore,
  confidenceScore,
  facts,
  missing,
  recommendedAction,
  tone,
}: LeadQualificationCardProps) {
  const color = tone === "good" || tone === "attention" ? toneColor[tone] : toneColor.neutral;
  return (
    <article className="ck-card leadpulse-agent-card" style={{ borderLeftColor: color }}>
      <p className="leadpulse-eyebrow">Agent qualification</p>
      <h3>{headline || "Preparing lead assessment…"}</h3>
      <p>{summary || "Reading the selected WhatsApp transcript…"}</p>
      <div className="leadpulse-agent-scores">
        <span>Intent <strong>{intentScore ?? "–"}</strong>/100</span>
        <span>Confidence <strong>{confidenceScore ?? "–"}</strong>/100</span>
      </div>
      {!!facts?.length && (
        <dl className="ck-facts">
          {facts.map((fact, index) => (
            <div key={index}><dt>{fact?.label || "Loading…"}</dt><dd>{fact?.value || "Loading…"}</dd></div>
          ))}
        </dl>
      )}
      {!!missing?.length && <p className="leadpulse-missing">Missing: {missing.filter(Boolean).join(", ")}</p>}
      {recommendedAction && <p><strong>Recommended action:</strong> {recommendedAction}</p>}
    </article>
  );
}

export function Timeline({ title, columns, rows }: TimelineProps) {
  return (
    <article className="ck-card">
      {title && <h3>{title}</h3>}
      {!columns?.length ? (
        <p>Preparing timeline…</p>
      ) : (
        <div className="ck-scroll">
          <table>
            <thead>
              <tr>
                {columns.map((header, index) => (
                  <th key={index}>{header || "Loading…"}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!rows?.length ? (
                <tr><td colSpan={columns.length}>Loading events…</td></tr>
              ) : rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {columns.map((_, cellIndex) => (
                    <td key={cellIndex}>{row?.[cellIndex] ?? "Loading…"}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </article>
  );
}
