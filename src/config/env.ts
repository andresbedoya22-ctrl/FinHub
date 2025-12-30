type EnvKey =
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  | "SUPABASE_SERVICE_ROLE_KEY"
  | "STRIPE_SECRET_KEY"
  | "STRIPE_WEBHOOK_SECRET"
  | "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY";

function missingKeys(keys: EnvKey[]) {
  return keys.filter((k) => !process.env[k] || String(process.env[k]).trim() === "");
}

/**
 * Supabase server-side usage (service role).
 * WARNING: SUPABASE_SERVICE_ROLE_KEY must never be used on the client.
 */
export function assertSupabaseServerEnv() {
  const required: EnvKey[] = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
  ];
  const missing = missingKeys(required);
  if (missing.length) {
    throw new Error(
      `Missing required Supabase env vars: ${missing.join(", ")}. Check .env.local / deployment config.`
    );
  }
}

/**
 * Stripe server-side usage for checkout creation.
 */
export function assertStripeCheckoutEnv() {
  const required: EnvKey[] = ["STRIPE_SECRET_KEY"];
  const missing = missingKeys(required);
  if (missing.length) {
    throw new Error(
      `Missing required Stripe env vars (checkout): ${missing.join(", ")}. Check .env.local / deployment config.`
    );
  }
}

/**
 * Stripe server-side usage for webhook verification.
 */
export function assertStripeWebhookEnv() {
  const required: EnvKey[] = ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"];
  const missing = missingKeys(required);
  if (missing.length) {
    throw new Error(
      `Missing required Stripe env vars (webhook): ${missing.join(", ")}. Check .env.local / deployment config.`
    );
  }
}

/**
 * Centralized accessors (use with the appropriate assert above).
 */
export const env = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY!,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET!,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
};
