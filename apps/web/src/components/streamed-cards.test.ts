import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LeadQualificationCard, Timeline } from "./streamed-cards";

test("lead qualification card renders useful loading content before streamed arguments arrive", () => {
  const html = renderToStaticMarkup(createElement(LeadQualificationCard, {}));
  assert.match(html, /Preparing lead assessment/);
  assert.match(html, /Reading the selected WhatsApp transcript/);
  assert.match(html, /Intent/);
  assert.match(html, /Confidence/);
});

test("lead qualification card tolerates partial streamed facts", () => {
  const html = renderToStaticMarkup(
    createElement(LeadQualificationCard, {
      tone: "att",
      facts: [null, {}, { label: "Budget" }, { label: "Location", value: "Bouskoura" }],
      missing: [null, "timeline"],
    }),
  );
  assert.match(html, /var\(--muted\)/);
  assert.match(html, /Budget/);
  assert.match(html, /Bouskoura/);
  assert.match(html, /timeline/);
  assert.match(html, /Loading/);
});

test("complete qualification and timeline arguments render factual content", () => {
  const card = renderToStaticMarkup(
    createElement(LeadQualificationCard, {
      headline: "Ready for a sales call",
      summary: "Budget and location match the project.",
      intentScore: 80,
      confidenceScore: 60,
      facts: [{ label: "Budget", value: "1.2M MAD" }],
      missing: ["financing"],
      recommendedAction: "Offer a Saturday visit.",
      tone: "good",
    }),
  );
  for (const text of ["Ready for a sales call", "1.2M MAD", "80", "60", "financing", "Offer a Saturday visit.", "#2e7d5b"]) {
    assert.ok(card.includes(text));
  }

  const timeline = renderToStaticMarkup(
    createElement(Timeline, {
      title: "Lead conversation",
      columns: ["Time", "Event"],
      rows: [["10:00", "Inbound WhatsApp"], ["10:01", "Qualification reply"]],
    }),
  );
  for (const text of ["Lead conversation", "Time", "Event", "10:00", "Inbound WhatsApp"]) {
    assert.ok(timeline.includes(text));
  }
});

test("timeline tolerates partial columns and rows", () => {
  const html = renderToStaticMarkup(
    createElement(Timeline, {
      columns: ["Time", null],
      rows: [null, [], ["10:00"], ["10:05", null]],
    }),
  );
  assert.match(html, /Time/);
  assert.match(html, /10:00/);
  assert.match(html, /Loading/);
});
