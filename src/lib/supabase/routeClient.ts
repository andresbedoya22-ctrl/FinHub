import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

type NextCookieOptions = {
  domain?: string;
  expires?: Date;
  httpOnly?: boolean;
  maxAge?: number;
  path?: string;
  sameSite?: "lax" | "strict" | "none";
  secure?: boolean;
};

function toNextCookieOptions(options?: CookieOptions): NextCookieOptions | undefined {
  if (!options) return undefined;

  const { sameSite, ...rest } = options;

  const normalizedSameSite: NextCookieOptions["sameSite"] | undefined =
    sameSite === true ? "lax" : sameSite === false ? undefined : sameSite;

  return {
    ...rest,
    ...(normalizedSameSite ? { sameSite: normalizedSameSite } : {}),
  };
}

type CookieStore = Awaited<ReturnType<typeof cookies>>;

function getCookieValue(store: CookieStore, name: string): string | undefined {
  const getter = (store as unknown as { get?: (n: string) => { value?: string } | undefined }).get;
  return getter?.(name)?.value;
}

function setCookie(store: CookieStore, name: string, value: string, options?: CookieOptions) {
  const setter = (store as unknown as {
    set?: (cookie: { name: string; value: string } & NextCookieOptions) => void;
  }).set;

  if (!setter) return;

  const nextOpts = toNextCookieOptions(options);
  setter({ name, value, ...(nextOpts ?? {}) });
}

export async function supabaseRouteClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      get(name) {
        return getCookieValue(cookieStore, name);
      },
      set(name, value, options) {
        setCookie(cookieStore, name, value, options);
      },
      remove(name, options) {
        // Remove = overwrite con maxAge=0 (y sin sameSite boolean)
        setCookie(cookieStore, name, "", { ...(options ?? {}), maxAge: 0 });
      },
    },
  });
}