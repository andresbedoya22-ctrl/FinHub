import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const cookieHeader = req.headers.get("cookie");
  const store = await cookies();
  const all = store.getAll().map((c) => ({ name: c.name, valuePreview: c.value.slice(0, 12) + "..." }));
  return NextResponse.json({
    cookieHeaderPreview: cookieHeader ? cookieHeader.slice(0, 200) + "..." : null,
    cookiesCount: all.length,
    cookies: all,
  });
}