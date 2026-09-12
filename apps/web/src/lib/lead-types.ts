export type LeadLanguage = "fr" | "ar" | "darija" | "unknown";
export type EngagementState =
  | "new"
  | "awaiting_reply"
  | "partial"
  | "qualified"
  | "opted_out"
  | "needs_human";
export type LeadStatus =
  | "hot"
  | "priority_unconfirmed"
  | "warm"
  | "nurture"
  | "closed";
export type Financing = "cash" | "pre_approved" | "needs_financing" | "unknown";
export type PropertyType = "apartment" | "villa" | "land" | "other";
export type LeadIntent = "buy" | "rent" | "investment" | "unknown";

export type LeadQualification = {
  budgetMad: number | null;
  budgetRaw: string | null;
  location: string | null;
  propertyType: PropertyType | null;
  timelineDays: number | null;
  financing: Financing;
  intent: LeadIntent;
  acceptedCallOrVisit: boolean;
  missingFields: string[];
  evidence: Array<{ field: string; messageId: string; excerpt: string }>;
};

export type LeadMessage = {
  id: string;
  providerMessageSid: string;
  direction: "inbound" | "outbound";
  body: string;
  createdAt: string;
};

export type LeadSummary = {
  id: string;
  phoneE164: string;
  displayName: string | null;
  preferredLanguage: LeadLanguage;
  engagementState: EngagementState;
  intentScore: number;
  confidenceScore: number;
  status: LeadStatus;
  qualification: LeadQualification;
  nextFollowUpAt: string | null;
  approvedTaskId: string | null;
  updatedAt: string;
};

export type LeadDetail = LeadSummary & { messages: LeadMessage[] };

export type QualificationAnalysis = {
  language: LeadLanguage;
  qualification: LeadQualification;
  reply: string;
  needsHuman: boolean;
  optedOut: boolean;
};
