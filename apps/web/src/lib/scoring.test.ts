import assert from "node:assert/strict";
import test from "node:test";
import { scoreLead } from "./scoring";
import type { LeadQualification } from "./lead-types";

const base = (): LeadQualification => ({
  budgetMad: null,
  budgetRaw: null,
  location: null,
  propertyType: null,
  timelineDays: null,
  financing: "unknown",
  intent: "buy",
  acceptedCallOrVisit: false,
  missingFields: [],
  evidence: [],
});

test("high-potential but incomplete leads remain priority_unconfirmed", () => {
  const qualification = base();
  qualification.budgetMad = 1_250_000;
  qualification.location = "Bouskoura";
  qualification.propertyType = "apartment";

  const result = scoreLead(qualification);
  assert.equal(result.intentScore, 55);
  assert.equal(result.confidenceScore, 60);
  assert.equal(result.status, "priority_unconfirmed");
});

test("fully evidenced near-term leads are hot", () => {
  const qualification = base();
  qualification.budgetMad = 1_300_000;
  qualification.location = "Bouskoura";
  qualification.propertyType = "apartment";
  qualification.timelineDays = 30;
  qualification.financing = "pre_approved";
  qualification.acceptedCallOrVisit = true;

  const result = scoreLead(qualification);
  assert.equal(result.intentScore, 100);
  assert.equal(result.confidenceScore, 100);
  assert.equal(result.status, "hot");
});

test("out-of-profile leads do not earn budget or location-fit points", () => {
  const qualification = base();
  qualification.budgetMad = 500_000;
  qualification.location = "Dar Bouazza";
  qualification.timelineDays = 20;

  const result = scoreLead(qualification);
  assert.equal(result.intentScore, 20);
  assert.equal(result.status, "nurture");
});
