import { SUBSIDY_DOCS_BY_SLUG, isSubsidySlug, type SubsidyDocKey } from "../../domain/subsidies/registry";
import type { SubsidySlug } from "../../domain/subsidies/types";

export type ToeslagenContractStartInput = {
  selectedSlugs: SubsidySlug[];
  intakeSnapshot?: Record<string, unknown> | null;
  estimates?: Array<{ slug: SubsidySlug; eligible: boolean; amountPerMonth: number | null }>;
};

function uniqueDocKeys(slugs: SubsidySlug[]): SubsidyDocKey[] {
  const out = new Set<SubsidyDocKey>();
  for (const slug of slugs) {
    for (const key of SUBSIDY_DOCS_BY_SLUG[slug]) {
      out.add(key);
    }
  }
  return Array.from(out);
}

export function parseToeslagenContractStartInput(raw: unknown): ToeslagenContractStartInput {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid body");
  }

  const body = raw as Record<string, unknown>;
  const selectedRaw = Array.isArray(body.selectedSlugs) ? body.selectedSlugs : [];

  const selectedSlugs = selectedRaw
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter((v): v is SubsidySlug => isSubsidySlug(v));

  const uniqueSlugs = Array.from(new Set(selectedSlugs));
  if (uniqueSlugs.length === 0) {
    throw new Error("At least one valid subsidy slug is required");
  }

  const intakeSnapshot =
    body.intakeSnapshot && typeof body.intakeSnapshot === "object"
      ? (body.intakeSnapshot as Record<string, unknown>)
      : null;

  const estimatesRaw = Array.isArray(body.estimates) ? body.estimates : [];
  const estimates = estimatesRaw
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const rec = row as Record<string, unknown>;
      const slug = typeof rec.slug === "string" ? rec.slug.trim() : "";
      if (!isSubsidySlug(slug)) return null;
      const eligible = rec.eligible === true;
      const amountPerMonth = typeof rec.amountPerMonth === "number" && Number.isFinite(rec.amountPerMonth)
        ? rec.amountPerMonth
        : null;
      return { slug, eligible, amountPerMonth };
    })
    .filter((v): v is { slug: SubsidySlug; eligible: boolean; amountPerMonth: number | null } => Boolean(v));

  return {
    selectedSlugs: uniqueSlugs,
    intakeSnapshot,
    estimates,
  };
}

export function buildToeslagenCaseTitle(slugs: SubsidySlug[]): string {
  if (slugs.length === 1) {
    return `Toeslagen contract - ${slugs[0]}`;
  }
  return `Toeslagen contract - ${slugs.join(", ")}`;
}

export function buildToeslagenTaskTitles(slugs: SubsidySlug[]): string[] {
  const tasks: string[] = [];
  tasks.push("Confirm service authorization consent");

  for (const key of uniqueDocKeys(slugs)) {
    tasks.push(`Upload document: ${key}`);
  }

  tasks.push("Operations review and submission");
  return tasks;
}

