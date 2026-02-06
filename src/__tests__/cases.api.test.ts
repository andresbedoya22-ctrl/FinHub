import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// To run these RLS tests, start Supabase locally (e.g. `supabase start`) or use a hosted project,
// then set the required env vars (URL + anon key + service role key) in your shell or .env.local.
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
  describe("cases api", () => {
    it.skip(`requires Supabase env vars: ${missingEnv.join(", ")}`, () => {});
  });
} else {
  describe("cases api", () => {
    let admin: SupabaseClient;
    let userA: { id: string; email: string; password: string };
    let userB: { id: string; email: string; password: string };
    let userAClient: SupabaseClient;
    let userBClient: SupabaseClient;

    beforeAll(async () => {
      admin = createClient(url as string, serviceRoleKey as string, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const seed = Date.now();
      userA = await createTestUser(admin, `case_test_a_${seed}@example.com`);
      userB = await createTestUser(admin, `case_test_b_${seed}@example.com`);

      userAClient = createClient(url as string, anonKey as string, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      userBClient = createClient(url as string, anonKey as string, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const aLogin = await userAClient.auth.signInWithPassword({ email: userA.email, password: userA.password });
      if (aLogin.error) throw aLogin.error;
      const bLogin = await userBClient.auth.signInWithPassword({ email: userB.email, password: userB.password });
      if (bLogin.error) throw bLogin.error;
    });

    afterAll(async () => {
      if (!admin) return;
      if (userA?.id || userB?.id) {
        await admin.from("profiles").delete().in("id", [userA?.id ?? "", userB?.id ?? ""]);
      }
      if (userA?.id) await admin.auth.admin.deleteUser(userA.id);
      if (userB?.id) await admin.auth.admin.deleteUser(userB.id);
    });

    it("creates and lists cases", async () => {
      const insert = await userAClient
        .from("cases")
        .insert({
          user_id: userA.id,
          type: "toeslagen",
          product_slug: "huurtoeslag",
          title: "Case engine test",
          status: "created",
          step_key: "eligibility",
        })
        .select("id")
        .single();

      expect(insert.error).toBeNull();
      expect(insert.data?.id).toBeTruthy();

      const list = await userAClient.from("cases").select("id").eq("id", insert.data?.id ?? "");
      expect(list.error).toBeNull();
      expect(list.data?.length).toBe(1);

      if (insert.data?.id) {
        await admin.from("cases").delete().eq("id", insert.data.id);
      }
    });

    it("enforces RLS between users", async () => {
      const insert = await userAClient
        .from("cases")
        .insert({
          user_id: userA.id,
          type: "taxes",
          product_slug: "ib",
          title: "Case RLS test",
          status: "created",
          step_key: "intake",
        })
        .select("id")
        .single();

      expect(insert.error).toBeNull();
      expect(insert.data?.id).toBeTruthy();

      const other = await userBClient.from("cases").select("id").eq("id", insert.data?.id ?? "");
      expect(other.error).toBeNull();
      expect(other.data?.length ?? 0).toBe(0);

      if (insert.data?.id) {
        await admin.from("cases").delete().eq("id", insert.data.id);
      }
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