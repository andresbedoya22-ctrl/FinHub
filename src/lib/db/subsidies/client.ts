import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type {
  SubsidyAdminNote,
  SubsidyApplication,
  SubsidyDocument,
  SubsidyDocumentStatus,
} from "@/domain/subsidies/types";

type ApplicationRow = {
  id: string;
  user_id: string;
  slug: string;
  status: string;
  eligibility_snapshot: unknown | null;
  intake_data: Record<string, unknown> | null;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
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

type NoteRow = {
  id: string;
  application_id: string;
  author_user_id: string;
  message: string;
  created_at: string;
};

function toApplication(row: ApplicationRow): SubsidyApplication {
  return {
    id: row.id,
    userId: row.user_id,
    slug: row.slug as SubsidyApplication["slug"],
    status: row.status as SubsidyApplication["status"],
    eligibilitySnapshot: (row.eligibility_snapshot ?? null) as SubsidyApplication["eligibilitySnapshot"],
    intakeData: row.intake_data ?? null,
    stripeCheckoutSessionId: row.stripe_checkout_session_id ?? null,
    stripePaymentIntentId: row.stripe_payment_intent_id ?? null,
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
    status: row.status as SubsidyDocumentStatus,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toNote(row: NoteRow): SubsidyAdminNote {
  return {
    id: row.id,
    applicationId: row.application_id,
    authorUserId: row.author_user_id,
    message: row.message,
    createdAt: row.created_at,
  };
}

export async function listMySubsidyApplications(): Promise<SubsidyApplication[]> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("subsidies_applications")
    .select(
      "id,user_id,slug,status,eligibility_snapshot,intake_data,stripe_checkout_session_id,stripe_payment_intent_id,created_at,updated_at,paid_at"
    )
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => toApplication(row as ApplicationRow));
}

export async function getMySubsidyApplication(applicationId: string): Promise<SubsidyApplication | null> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("subsidies_applications")
    .select(
      "id,user_id,slug,status,eligibility_snapshot,intake_data,stripe_checkout_session_id,stripe_payment_intent_id,created_at,updated_at,paid_at"
    )
    .eq("id", applicationId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return toApplication(data as ApplicationRow);
}

export async function listSubsidyDocuments(applicationId: string): Promise<SubsidyDocument[]> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("subsidies_documents")
    .select("id,application_id,doc_key,file_path,status,notes,created_at,updated_at")
    .eq("application_id", applicationId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => toDocument(row as DocumentRow));
}

export async function updateSubsidyDocument(
  documentId: string,
  patch: Partial<{ status: SubsidyDocumentStatus; filePath: string | null; notes: string | null }>
): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.status) update.status = patch.status;
  if ("filePath" in patch) update.file_path = patch.filePath;
  if ("notes" in patch) update.notes = patch.notes;
  const { error } = await supabase.from("subsidies_documents").update(update).eq("id", documentId);
  if (error) throw new Error(error.message);
}

export async function listSubsidyNotes(applicationId: string): Promise<SubsidyAdminNote[]> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("subsidies_admin_notes")
    .select("id,application_id,author_user_id,message,created_at")
    .eq("application_id", applicationId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => toNote(row as NoteRow));
}

export async function uploadSubsidyDocument(args: {
  applicationId: string;
  documentId: string;
  file: File;
}): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw new Error(userErr.message);
  if (!userData.user) throw new Error("No authenticated user");

  const safeName = args.file.name.trim().replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${userData.user.id}/${args.applicationId}/${Date.now()}_${safeName}`;

  const up = await supabase.storage.from("subsidies").upload(storagePath, args.file, { upsert: false });
  if (up.error) throw new Error(up.error.message);

  await updateSubsidyDocument(args.documentId, { status: "uploaded", filePath: storagePath });
}
