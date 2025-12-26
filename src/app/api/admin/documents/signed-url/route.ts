import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServerClient";

export const dynamic = "force-dynamic";

type Body = {
  bucket?: string;
  path?: string;
  expiresIn?: number;
};

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();

    // Auth user
    const { data: userData, error: userError } = await supabase.auth.getUser();
    const user = userData?.user ?? null;
    if (userError || !user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // Must be admin
    const { data: isAdminData, error: isAdminError } = await supabase.rpc("is_admin");
    if (isAdminError || !isAdminData) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const body = (await req.json().catch(() => ({}))) as Body;
    const bucket = (body.bucket ?? "vault").trim();
    const path = (body.path ?? "").trim();
    const expiresIn = Math.max(60, Math.min(60 * 60, Number(body.expiresIn ?? 300))); // 60s..3600s

    if (!path) {
      return NextResponse.json({ ok: false, error: "Missing path" }, { status: 400 });
    }

    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, url: data.signedUrl });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
