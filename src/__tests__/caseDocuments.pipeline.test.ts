import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createCaseDocument, updateCaseDocument } from "../features/cases/casesService";
import { validateDocument } from "../features/documents/documentPipelineService";

const requiredEnv = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];

const missingEnv = requiredEnv.filter((key) => !process.env[key]);
const hasEnv = missingEnv.length === 0;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!hasEnv) {
  describe("case documents pipeline", () => {
    it.skip(`requires Supabase env vars: ${missingEnv.join(", ")}`, () => {});
  });
} else {
  describe("case documents pipeline", () => {
    let admin: SupabaseClient;
    let user: { id: string; email: string; password: string };
    let userClient: SupabaseClient;

    const createdCaseIds: string[] = [];
    const createdDocumentIds: string[] = [];
    const storagePaths: string[] = [];

    const prevProvider = process.env.FINHUB_OCR_PROVIDER;
    const prevMinConfidence = process.env.FINHUB_OCR_MIN_CONFIDENCE;

    beforeAll(async () => {
      admin = createClient(url as string, serviceRoleKey as string, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const seed = Date.now();
      user = await createTestUser(admin, `doc_pipeline_${seed}@example.com`);

      userClient = createClient(url as string, anonKey as string, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const login = await userClient.auth.signInWithPassword({ email: user.email, password: user.password });
      if (login.error) throw login.error;
    });

    afterAll(async () => {
      process.env.FINHUB_OCR_PROVIDER = prevProvider;
      process.env.FINHUB_OCR_MIN_CONFIDENCE = prevMinConfidence;

      if (userClient && storagePaths.length) {
        await userClient.storage.from("vault").remove(storagePaths);
      }

      if (admin && createdDocumentIds.length) {
        await admin.from("case_documents").delete().in("document_id", createdDocumentIds);
        await admin.from("documents").delete().in("id", createdDocumentIds);
      }

      if (admin && createdCaseIds.length) {
        await admin.from("cases").delete().in("id", createdCaseIds);
      }

      if (admin && user?.id) {
        await admin.from("profiles").delete().eq("id", user.id);
        await admin.auth.admin.deleteUser(user.id);
      }
    });

    it("validates a document successfully", async () => {
      process.env.FINHUB_OCR_PROVIDER = "mock";
      process.env.FINHUB_OCR_MIN_CONFIDENCE = "0.4";

      const { data: caseRow, error: caseErr } = await userClient
        .from("cases")
        .insert({
          user_id: user.id,
          type: "toeslagen",
          product_slug: "huurtoeslag",
          title: "Pipeline case",
          status: "created",
          step_key: "documents",
        })
        .select("id")
        .single();

      expect(caseErr).toBeNull();
      expect(caseRow?.id).toBeTruthy();
      if (caseRow?.id) createdCaseIds.push(caseRow.id);

      const storagePath = `${user.id}/pipeline_${Date.now()}.pdf`;
      storagePaths.push(storagePath);

      const upload = await userClient.storage
        .from("vault")
        .upload(storagePath, new Uint8Array([1, 2, 3, 4]), { contentType: "application/pdf", upsert: true });
      expect(upload.error).toBeNull();

      const { data: docRow, error: docErr } = await userClient
        .from("documents")
        .insert({
          user_id: user.id,
          file_name: "pipeline.pdf",
          type: "other",
          status: "uploaded",
          storage_path: storagePath,
        })
        .select("id")
        .single();

      expect(docErr).toBeNull();
      expect(docRow?.id).toBeTruthy();
      if (docRow?.id) createdDocumentIds.push(docRow.id);

      const caseDoc = await createCaseDocument(userClient, caseRow?.id ?? "", {
        documentId: docRow?.id ?? "",
        status: "uploaded",
      });

      const validation = await validateDocument(userClient, user.id, docRow?.id ?? "");
      expect(validation.status).toBe("validated");

      const updated = await updateCaseDocument(userClient, caseRow?.id ?? "", caseDoc.id, {
        status: validation.status,
        validationReason: validation.reason,
        validationMeta: validation.meta,
      });

      expect(updated.status).toBe("validated");
      expect(updated.validatedAt).toBeTruthy();
    });

    it("rejects a document with low OCR confidence", async () => {
      process.env.FINHUB_OCR_PROVIDER = "mock";
      process.env.FINHUB_OCR_MIN_CONFIDENCE = "0.95";

      const { data: caseRow, error: caseErr } = await userClient
        .from("cases")
        .insert({
          user_id: user.id,
          type: "taxes",
          product_slug: "ib",
          title: "Pipeline reject",
          status: "created",
          step_key: "documents",
        })
        .select("id")
        .single();

      expect(caseErr).toBeNull();
      expect(caseRow?.id).toBeTruthy();
      if (caseRow?.id) createdCaseIds.push(caseRow.id);

      const storagePath = `${user.id}/pipeline_reject_${Date.now()}.pdf`;
      storagePaths.push(storagePath);

      const upload = await userClient.storage
        .from("vault")
        .upload(storagePath, new Uint8Array([5, 6, 7, 8]), { contentType: "application/pdf", upsert: true });
      expect(upload.error).toBeNull();

      const { data: docRow, error: docErr } = await userClient
        .from("documents")
        .insert({
          user_id: user.id,
          file_name: "pipeline_reject.pdf",
          type: "other",
          status: "uploaded",
          storage_path: storagePath,
        })
        .select("id")
        .single();

      expect(docErr).toBeNull();
      expect(docRow?.id).toBeTruthy();
      if (docRow?.id) createdDocumentIds.push(docRow.id);

      const caseDoc = await createCaseDocument(userClient, caseRow?.id ?? "", {
        documentId: docRow?.id ?? "",
        status: "uploaded",
      });

      const validation = await validateDocument(userClient, user.id, docRow?.id ?? "");
      expect(validation.status).toBe("rejected");
      expect(validation.reason).toBe("ocr_low_confidence");

      const updated = await updateCaseDocument(userClient, caseRow?.id ?? "", caseDoc.id, {
        status: validation.status,
        validationReason: validation.reason,
        validationMeta: validation.meta,
      });

      expect(updated.status).toBe("rejected");
      expect(updated.rejectedAt).toBeTruthy();
    });
  });
}

async function createTestUser(admin: SupabaseClient, email: string) {
  const password = "Test1234!";
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error || !created.data.user) throw created.error ?? new Error("User creation failed");

  const user = created.data.user;
  const profile = await admin.from("profiles").insert({ id: user.id, preferred_language: "EN" });
  if (profile.error) throw profile.error;

  return { id: user.id, email, password };
}