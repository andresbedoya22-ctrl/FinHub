import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return NextResponse.json({ ok: false, error: "Supabase env missing" }, { status: 500 });

  const cookieStore = await cookies();
  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll() {},
    },
  });

  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const row = await supabase
    .from("finny_user_settings")
    .select("tier_override,quiet_hours_enabled,quiet_start_hour,quiet_end_hour,timezone")
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (row.error) return NextResponse.json({ ok: false, error: row.error.message }, { status: 500 });
  return NextResponse.json({
    ok: true,
    settings: row.data ?? {
      tier_override: null,
      quiet_hours_enabled: false,
      quiet_start_hour: 22,
      quiet_end_hour: 7,
      timezone: "Europe/Amsterdam",
    },
  });
}

export async function PATCH(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return NextResponse.json({ ok: false, error: "Supabase env missing" }, { status: 500 });

  const cookieStore = await cookies();
  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll() {},
    },
  });

  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const raw = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!raw) return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });

  const quietHoursEnabled = raw.quietHoursEnabled === true;
  const quietStartHour = Math.max(0, Math.min(23, Math.floor(Number(raw.quietStartHour ?? 22))));
  const quietEndHour = Math.max(0, Math.min(23, Math.floor(Number(raw.quietEndHour ?? 7))));
  const timezone = typeof raw.timezone === "string" && raw.timezone.trim() ? raw.timezone.trim().slice(0, 64) : "Europe/Amsterdam";

  const upsert = await supabase
    .from("finny_user_settings")
    .upsert(
      {
        user_id: auth.user.id,
        quiet_hours_enabled: quietHoursEnabled,
        quiet_start_hour: quietStartHour,
        quiet_end_hour: quietEndHour,
        timezone,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )
    .select("tier_override,quiet_hours_enabled,quiet_start_hour,quiet_end_hour,timezone")
    .single();

  if (upsert.error || !upsert.data) {
    return NextResponse.json({ ok: false, error: upsert.error?.message ?? "Failed to update settings" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, settings: upsert.data });
}
