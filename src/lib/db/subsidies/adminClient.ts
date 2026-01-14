import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { SubsidyApplication, SubsidyDocument } from "@/domain/subsidies/types";

type ApplicationRow = {
  id: string;
  user_id: string;
  slug: string;
  status: string;
  eligibility_snapshot: unknown | null;
  intake_data: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  paid_at: string | null;
};

type DocumentRow = {
  id: string;
  application_id: string;
  doc_key: string;
  file_path: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

function toApplication(row: ApplicationRow): SubsidyApplication {
  return {
    id: row.id,
    userId: row.user_id,
    slug: row.slug as SubsidyApplication["slug"],
    status: row.status as SubsidyApplication["status"],
    eligibilitySnapshot: (row.eligibility_snapshot ?? null) as SubsidyApplication["eligibilitySnapshot"],
    intakeData: row.intake_data ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    paidAt: row.paid_at ?? null,
  };
}

function toDocument(row: DocumentRow): SubsidyDocument {
  return {
    id: row.id,
    applicationId: row.application_id,
    docKey: row.doc_key,
    filePath: row.file_path,
    status: row.status as SubsidyDocument["status"],
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listSubsidyApplicationsAdmin(): Promise<SubsidyApplication[]> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("subsidies_applications")
    .select("id,user_id,slug,status,eligibility_snapshot,intake_data,created_at,updated_at,paid_at")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => toApplication(row as ApplicationRow));
}

export async function listSubsidyDocumentsAdmin(applicationId: string): Promise<SubsidyDocument[]> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("subsidies_documents")
    .select("id,application_id,doc_key,file_path,status,notes,created_at,updated_at")
    .eq("application_id", applicationId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => toDocument(row as DocumentRow));
}
