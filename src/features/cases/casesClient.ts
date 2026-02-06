import type { CaseEntity, CaseType } from "./casesTypes";
import { createCase as apiCreateCase, listCases } from "./casesApi";

export async function listMyCases(): Promise<CaseEntity[]> {
  return await listCases();
}

export async function createCase(type: CaseType, title?: string, productSlug?: string): Promise<string> {
  const created = await apiCreateCase({ type, title, productSlug });
  return created.id;
}
