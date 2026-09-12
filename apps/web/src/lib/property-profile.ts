import type { LeadQualification } from "./lead-types";

export const DEMO_PROPERTY = {
  id: "oasis-verde",
  name: "Résidence Oasis Verde",
  location: "Bouskoura",
  propertyTypes: ["apartment"] as const,
  unitTypes: ["T2", "T3"],
  minBudgetMad: 900_000,
  maxBudgetMad: 1_600_000,
};

export function isBudgetMatch(qualification: LeadQualification) {
  return (
    qualification.budgetMad !== null &&
    qualification.budgetMad >= DEMO_PROPERTY.minBudgetMad &&
    qualification.budgetMad <= DEMO_PROPERTY.maxBudgetMad
  );
}

export function isLocationMatch(qualification: LeadQualification) {
  return qualification.location?.toLocaleLowerCase().includes("bouskoura") ?? false;
}
