export type AppLang = "en" | "es" | "pl" | "ro";

export type LeadInterest =
  | "personal_finance"
  | "taxes"
  | "voorlopige_aanslag"
  | "toeslagen"
  | "mortgage"
  | "personal_loan"
  | "insurance";

export type MarketingLeadInput = {
  fullName: string;
  email: string;
  phone?: string | null;
  locale: AppLang;
  source: "landing";
  interestedIn: LeadInterest[];
  consentMarketing: boolean;

  // optional attribution
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmTerm?: string | null;
  utmContent?: string | null;

  // anti-spam honeypot
  hp?: string | null;
};

export type MarketingLeadResult =
  | { ok: true; id: string }
  | { ok: false; error: string; code?: "validation" | "server" };
