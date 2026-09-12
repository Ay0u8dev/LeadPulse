import { isBudgetMatch, isLocationMatch } from "./property-profile";
import type { LeadQualification, LeadStatus } from "./lead-types";

export type LeadScore = {
  intentScore: number;
  confidenceScore: number;
  status: LeadStatus;
  reasons: string[];
};

export function scoreLead(qualification: LeadQualification): LeadScore {
  let intentScore = 0;
  let confidenceScore = 0;
  const reasons: string[] = [];

  if (isBudgetMatch(qualification)) {
    intentScore += 30;
    reasons.push("Budget fits Oasis Verde");
  }
  if (isLocationMatch(qualification)) {
    intentScore += 25;
    reasons.push("Bouskoura is requested");
  }
  if (qualification.timelineDays !== null && qualification.timelineDays <= 90) {
    intentScore += 20;
    reasons.push("Purchase window is within 90 days");
  }
  if (
    qualification.financing === "cash" ||
    qualification.financing === "pre_approved"
  ) {
    intentScore += 15;
    reasons.push("Financing is ready");
  }
  if (qualification.acceptedCallOrVisit) {
    intentScore += 10;
    reasons.push("Lead accepted a call or visit");
  }

  const knownFacts = [
    qualification.budgetMad !== null,
    qualification.location !== null,
    qualification.propertyType !== null,
    qualification.timelineDays !== null,
    qualification.financing !== "unknown",
  ].filter(Boolean).length;
  confidenceScore = knownFacts * 20;

  const coreFactsKnown =
    qualification.budgetMad !== null &&
    qualification.location !== null &&
    qualification.timelineDays !== null;
  const status: LeadStatus =
    intentScore >= 70 && confidenceScore >= 60 && coreFactsKnown
      ? "hot"
      : intentScore >= 55
        ? "priority_unconfirmed"
        : intentScore >= 40
          ? "warm"
          : "nurture";

  if (!reasons.length) reasons.push("More qualification information is needed");
  return { intentScore, confidenceScore, status, reasons };
}
