import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServerClient";

type Profile = { id: string; email: string | null; role: "user" | "admin" };

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: userData, error: userError } = await supabase.auth.getUser();
    const user = userData?.user ?? null;

    let profile: Profile | null = null;
    if (user) {
      const { data } = await supabase
        .from("profiles")
        .select("id,email,role")
        .eq("id", user.id)
        .maybeSingle();
      profile = (data as Profile | null) ?? null;
    }

    const { data: isAdminData } = await supabase.rpc("is_admin");

    return NextResponse.json({
      user: user ? { id: user.id, email: user.email ?? null } : null,
      userError: userError?.message ?? null,
      profile,
      isAdmin: Boolean(isAdminData),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}