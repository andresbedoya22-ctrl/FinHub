import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createCaseDocument, getCaseDetail, updateCaseDocument } from "../features/cases/casesService";
import {
  createDocumentForUpload,
  uploadToSignedUrl,
  validateDocument,
} from "../features/documents/documentPipelineService";

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
    it.skip(`requires Supabase env vars: ${missingEnv.join(", ")}. See docs/runbooks/A2_document_pipeline_v2.md`, () => {});
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

    it("uploads, validates, attaches, and reads case detail", async () => {
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

      const upload = await createDocumentForUpload(userClient, user.id, {
        fileName: "pipeline.pdf",
        type: "other",
      });

      expect(upload.doc.id).toBeTruthy();
      if (upload.doc.id) createdDocumentIds.push(upload.doc.id);
      if (upload.doc.storagePath) storagePaths.push(upload.doc.storagePath);

      const file = new File([new Uint8Array([1, 2, 3, 4])], "pipeline.pdf", { type: "application/pdf" });
      await uploadToSignedUrl(userClient, {
        bucket: upload.bucket,
        path: upload.path,
        token: upload.token,
        file,
      });

      const caseDoc = await createCaseDocument(userClient, caseRow?.id ?? "", {
        documentId: upload.doc.id,
        status: "uploaded",
      });

      await updateCaseDocument(userClient, caseRow?.id ?? "", caseDoc.id, { status: "validating" });

      const validation = await validateDocument(userClient, user.id, upload.doc.id);
      expect(validation.status).toBe("validated");
      expect(validation.meta.mime).toBe("application/pdf");
      expect(validation.meta.doc_type).toBe("other");
      expect(validation.meta.provider).toBe("mock");
      expect(typeof validation.meta.file_size).toBe("number");
      expect(typeof validation.meta.ocr_confidence).toBe("number");

      const updated = await updateCaseDocument(userClient, caseRow?.id ?? "", caseDoc.id, {
        status: validation.status,
        validationReason: validation.reason,
        validationMeta: validation.meta,
      });

      expect(updated.status).toBe("validated");
      expect(updated.validatedAt).toBeTruthy();

      const detail = await getCaseDetail(userClient, caseRow?.id ?? "");
      expect(detail).toBeTruthy();
      expect(detail?.documents.length).toBe(1);
      expect(detail?.documents[0]?.status).toBe("validated");
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

      const upload = await createDocumentForUpload(userClient, user.id, {
        fileName: "pipeline_reject.pdf",
        type: "other",
      });

      expect(upload.doc.id).toBeTruthy();
      if (upload.doc.id) createdDocumentIds.push(upload.doc.id);
      if (upload.doc.storagePath) storagePaths.push(upload.doc.storagePath);

      const file = new File([new Uint8Array([5, 6, 7, 8])], "pipeline_reject.pdf", { type: "application/pdf" });
      await uploadToSignedUrl(userClient, {
        bucket: upload.bucket,
        path: upload.path,
        token: upload.token,
        file,
      });

      const caseDoc = await createCaseDocument(userClient, caseRow?.id ?? "", {
        documentId: upload.doc.id,
        status: "uploaded",
      });

      await updateCaseDocument(userClient, caseRow?.id ?? "", caseDoc.id, { status: "validating" });

      const validation = await validateDocument(userClient, user.id, upload.doc.id);
      expect(validation.status).toBe("rejected");
      expect(validation.reason).toBe("ocr_low_confidence");
      expect(validation.meta.provider).toBe("mock");
      expect(typeof validation.meta.ocr_confidence).toBe("number");

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
