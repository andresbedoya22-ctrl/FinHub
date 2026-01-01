import {NextResponse} from "next/server";

const SUPPORTED = new Set(["en", "es", "pl", "ro"]);

export async function POST(req: Request) {
  let next = "en";

  const body = await req.json().catch(() => null);
  const v = String((body as { locale?: unknown } | null)?.locale ?? "").toLowerCase();
  if (SUPPORTED.has(v)) next = v;

  const res = NextResponse.json({ok: true, locale: next});
  const maxAge = 60 * 60 * 24 * 180; // 180 días

  res.cookies.set("locale", next, {path: "/", maxAge, sameSite: "lax"});
  res.cookies.set("NEXT_LOCALE", next, {path: "/", maxAge, sameSite: "lax"});

  return res;
}
