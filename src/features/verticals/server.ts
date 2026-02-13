import type { SupabaseClient } from "@supabase/supabase-js";

import type { CaseType } from "@/features/cases/casesTypes";

export type LeadgenVertical = "mortgage" | "credit" | "insurance";
export type Vertical = "taxes" | LeadgenVertical;

export type TaxesIntakeInput = {
  fiscalYear: number;
  hasPartner: boolean;
  hasFreelanceIncome: boolean;
  hasOwnHome: boolean;
  hasForeignIncome: boolean;
  wantsTaxCreditsReview: boolean;
  notes: string | null;
};

export type LeadgenSubmitInput = {
  fullName: string;
  email: string;
  phone: string | null;
  employmentStatus: "employed" | "self_employed" | "student" | "unemployed";
  yearlyIncomeBand: "lt_25k" | "25_50k" | "50_90k" | "90k_plus";
  timelineMonths: "0_3" | "3_6" | "6_12" | "12_plus";
  hasPartner: boolean;
  notes: string | null;
  consent: boolean;
};

const LEADGEN_VERTICALS: ReadonlySet<string> = new Set(["mortgage", "credit", "insurance"]);
const ACTIVE_CASE_STATUSES = ["created", "in_progress", "waiting_user", "under_review", "ready_for_review", "submitted"] as const;

export const LEADGEN_PRODUCT_SLUG: Record<LeadgenVertical, string> = {
  mortgage: "leadgen_mortgage_v1",
  credit: "leadgen_credit_v1",
  insurance: "leadgen_insurance_v1",
};

export function isLeadgenVertical(value: string): value is LeadgenVertical {
  return LEADGEN_VERTICALS.has(value);
}

export function parseTaxesIntakeInput(input: unknown): TaxesIntakeInput {
  if (!input || typeof input !== "object") throw new Error("Invalid body");
  const raw = input as Record<string, unknown>;

  const fiscalYear = Number(raw.fiscalYear);
  if (!Number.isInteger(fiscalYear) || fiscalYear < 2020 || fiscalYear > 2035) {
    throw new Error("Invalid fiscalYear");
  }

  const hasPartner = raw.hasPartner === true;
  const hasFreelanceIncome = raw.hasFreelanceIncome === true;
  const hasOwnHome = raw.hasOwnHome === true;
  const hasForeignIncome = raw.hasForeignIncome === true;
  const wantsTaxCreditsReview = raw.wantsTaxCreditsReview === true;
  const notes = typeof raw.notes === "string" && raw.notes.trim() ? raw.notes.trim().slice(0, 2000) : null;

  return {
    fiscalYear,
    hasPartner,
    hasFreelanceIncome,
    hasOwnHome,
    hasForeignIncome,
    wantsTaxCreditsReview,
    notes,
  };
}

export function parseLeadgenSubmitInput(input: unknown): LeadgenSubmitInput {
  if (!input || typeof input !== "object") throw new Error("Invalid body");
  const raw = input as Record<string, unknown>;

  const fullName = typeof raw.fullName === "string" ? raw.fullName.trim() : "";
  const email = typeof raw.email === "string" ? raw.email.trim().toLowerCase() : "";
  if (fullName.length < 2) throw new Error("fullName required");
  if (!email.includes("@") || email.length < 6) throw new Error("email invalid");

  const phone = typeof raw.phone === "string" && raw.phone.trim() ? raw.phone.trim().slice(0, 50) : null;
  const notes = typeof raw.notes === "string" && raw.notes.trim() ? raw.notes.trim().slice(0, 2000) : null;
  const consent = raw.consent === true;
  if (!consent) throw new Error("consent required");

  const employmentStatus = String(raw.employmentStatus ?? "");
  if (!["employed", "self_employed", "student", "unemployed"].includes(employmentStatus)) {
    throw new Error("employmentStatus invalid");
  }

  const yearlyIncomeBand = String(raw.yearlyIncomeBand ?? "");
  if (!["lt_25k", "25_50k", "50_90k", "90k_plus"].includes(yearlyIncomeBand)) {
    throw new Error("yearlyIncomeBand invalid");
  }

  const timelineMonths = String(raw.timelineMonths ?? "");
  if (!["0_3", "3_6", "6_12", "12_plus"].includes(timelineMonths)) {
    throw new Error("timelineMonths invalid");
  }

  return {
    fullName,
    email,
    phone,
    employmentStatus: employmentStatus as LeadgenSubmitInput["employmentStatus"],
    yearlyIncomeBand: yearlyIncomeBand as LeadgenSubmitInput["yearlyIncomeBand"],
    timelineMonths: timelineMonths as LeadgenSubmitInput["timelineMonths"],
    hasPartner: raw.hasPartner === true,
    notes,
    consent,
  };
}

export function taxesChecklistTasks(input: TaxesIntakeInput): string[] {
  const base = [
    "Upload ID document",
    "Upload annual income statements (jaaropgave)",
    "Upload bank account proof (IBAN owner)",
  ];
  if (input.hasPartner) base.push("Upload partner annual income statement");
  if (input.hasFreelanceIncome) base.push("Upload ZZP income summary and deductible costs");
  if (input.hasOwnHome) base.push("Upload mortgage annual statement");
  if (input.hasForeignIncome) base.push("Upload foreign income evidence");
  return base;
}

export function leadgenChecklistTasks(vertical: LeadgenVertical): string[] {
  if (vertical === "mortgage") {
    return [
      "Upload ID document",
      "Upload latest 3 payslips",
      "Upload employer statement",
      "Upload savings/deposits proof",
    ];
  }
  if (vertical === "credit") {
    return [
      "Upload ID document",
      "Upload latest income proof",
      "Upload monthly obligations overview",
      "Upload bank statements (last 90 days)",
    ];
  }
  return [
    "Upload ID document",
    "Upload current policy overview",
    "Upload risk profile questionnaire",
    "Upload claims history (if available)",
  ];
}

export function titleForVertical(vertical: Vertical): string {
  if (vertical === "taxes") return "Taxes Pro case";
  if (vertical === "mortgage") return "Mortgage intake case";
  if (vertical === "credit") return "Credit intake case";
  return "Insurance intake case";
}

export function caseTypeForVertical(vertical: Vertical): CaseType {
  if (vertical === "taxes") return "taxes";
  return vertical;
}

export async function findLatestActiveCaseByVertical(
  supabase: SupabaseClient,
  vertical: Vertical,
  userId: string
): Promise<string | null> {
  const caseType = caseTypeForVertical(vertical);
  const productSlug = vertical === "taxes" ? "taxes_pro_v1" : LEADGEN_PRODUCT_SLUG[vertical];

  const query = await supabase
    .from("cases")
    .select("id")
    .eq("type", caseType)
    .eq("product_slug", productSlug)
    .eq("user_id", userId)
    .in("status", [...ACTIVE_CASE_STATUSES])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (query.error) throw new Error(query.error.message);
  return typeof query.data?.id === "string" ? query.data.id : null;
}

export async function ensureChecklistTasks(
  supabase: SupabaseClient,
  caseId: string,
  checklist: string[]
): Promise<void> {
  const existing = await supabase
    .from("case_tasks")
    .select("title")
    .eq("case_id", caseId);

  if (existing.error) throw new Error(existing.error.message);
  const titles = new Set((existing.data ?? []).map((row) => String(row.title ?? "")));

  const missingRows = checklist
    .filter((title) => !titles.has(title))
    .map((title) => ({ case_id: caseId, title, status: "open" as const }));

  if (missingRows.length === 0) return;
  const ins = await supabase.from("case_tasks").insert(missingRows);
  if (ins.error) throw new Error(ins.error.message);
}

function isMissingRelation(error: unknown, relation: string): boolean {
  if (!error || typeof error !== "object") return false;
  const message = "message" in error ? String((error as { message?: unknown }).message ?? "") : "";
  return message.toLowerCase().includes(`relation "${relation}" does not exist`);
}

export async function insertProductEventSafe(
  admin: SupabaseClient,
  payload: { userId: string; caseId: string | null; eventName: string; data?: Record<string, unknown> }
): Promise<void> {
  const ins = await admin.from("product_events").insert({
    user_id: payload.userId,
    case_id: payload.caseId,
    event_name: payload.eventName,
    payload: payload.data ?? {},
  });
  if (ins.error && !isMissingRelation(ins.error, "product_events")) {
    throw new Error(ins.error.message);
  }
}

export async function upsertCaseExternalRefSafe(
  admin: SupabaseClient,
  params: { caseId: string; vertical: LeadgenVertical }
): Promise<void> {
  const upsert = await admin.from("external_refs").upsert(
    {
      case_id: params.caseId,
      provider: "elements",
      entity_type: "case",
      local_id: params.caseId,
      external_id: `leadgen:${params.vertical}:pending`,
      payload_hash: `leadgen-${params.vertical}-pending`,
      last_synced_at: new Date().toISOString(),
      sync_status: "pending",
      payload_json: { vertical: params.vertical, source: "leadgen_v1" },
    },
    { onConflict: "provider,entity_type,local_id" }
  );

  if (upsert.error && !isMissingRelation(upsert.error, "external_refs")) {
    throw new Error(upsert.error.message);
  }
}
