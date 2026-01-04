import { NextResponse } from "next/server";

import { supabaseRouteClient } from "@/lib/supabase/routeClient";

type FixedBudgetDTO = {
  id: string;
  label: string;
  monthlyCents: number;
  isActive: boolean;
};

type PlanDTO = {
  projectedIncomeMonthlyCents: number;
  fixedBudgets: FixedBudgetDTO[];
};

type RulesDTO = {
  version: 1;
  safeToSpendMode: "income-expense-fixedRemaining";
};

type BootstrapDTO = {
  plan: PlanDTO;
  rules: RulesDTO;
};

const DEFAULT_BUDGETS: FixedBudgetDTO[] = [
  { id: "fb_rent", label: "Alquiler", monthlyCents: 110000, isActive: true },
  { id: "fb_insurance", label: "Seguros", monthlyCents: 20000, isActive: true },
  { id: "fb_utilities", label: "Servicios", monthlyCents: 18000, isActive: true },
];

function normalizePlan(input: unknown): { ok: true; plan: PlanDTO; rules: RulesDTO } | { ok: false; error: string } {
  if (!input || typeof input !== "object") return { ok: false, error: "Body inválido" };

  const body = input as Record<string, unknown>;
  const plan = body.plan as Record<string, unknown> | undefined;
  const rules = body.rules as Record<string, unknown> | undefined;

  const projected = Number(plan?.projectedIncomeMonthlyCents ?? 0);
  if (!Number.isFinite(projected) || projected < 0) return { ok: false, error: "projectedIncomeMonthlyCents inválido" };

  const fixedBudgets = Array.isArray(plan?.fixedBudgets) ? (plan!.fixedBudgets as unknown[]) : [];
  const mapped: FixedBudgetDTO[] = fixedBudgets.map((x) => {
    const o = (x ?? {}) as Record<string, unknown>;
    return {
      id: String(o.id ?? crypto.randomUUID()),
      label: String(o.label ?? "Sin nombre"),
      monthlyCents: Number(o.monthlyCents ?? 0),
      isActive: Boolean(o.isActive ?? true),
    };
  }).filter((b) => Number.isFinite(b.monthlyCents) && b.monthlyCents >= 0);

  const safeToSpendMode = (rules?.safeToSpendMode ?? "income-expense-fixedRemaining") as RulesDTO["safeToSpendMode"];
  if (safeToSpendMode !== "income-expense-fixedRemaining") return { ok: false, error: "rules.safeToSpendMode inválido" };

  return {
    ok: true,
    plan: { projectedIncomeMonthlyCents: projected, fixedBudgets: mapped },
    rules: { version: 1, safeToSpendMode: "income-expense-fixedRemaining" },
  };
}

export async function GET() {
  const supabase = supabaseRouteClient();
  const { data: authData, error: authErr } = await supabase.auth.getUser();

  if (authErr || !authData?.user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const userId = authData.user.id;

  // 1) Plan
  const { data: planRow, error: planErr } = await supabase
    .from("finance_user_plans")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  // 2) Budgets
  const { data: budgetRows, error: budgetErr } = await supabase
    .from("finance_fixed_budgets")
    .select("*")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true });

  // 3) Rules
  const { data: rulesRow, error: rulesErr } = await supabase
    .from("finance_rules_v1")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (planErr || budgetErr || rulesErr) {
    return NextResponse.json(
      { error: "DB_ERROR", details: [planErr?.message, budgetErr?.message, rulesErr?.message].filter(Boolean) },
      { status: 500 }
    );
  }

  // Seed defaults if missing
  if (!planRow) {
    await supabase.from("finance_user_plans").insert({
      user_id: userId,
      projected_income_monthly_cents: 0,
      currency: "EUR",
    });
  }

  if (!budgetRows || budgetRows.length === 0) {
    await supabase.from("finance_fixed_budgets").insert(
      DEFAULT_BUDGETS.map((b, i) => ({
        user_id: userId,
        id: b.id, // stable ids for UX
        label: b.label,
        monthly_cents: b.monthlyCents,
        is_active: b.isActive,
        sort_order: i,
      }))
    );
  }

  if (!rulesRow) {
    await supabase.from("finance_rules_v1").insert({
      user_id: userId,
      version: 1,
      safe_to_spend_mode: "income-expense-fixedRemaining",
    });
  }

  // Re-read after seed (simple and safe)
  const { data: plan2 } = await supabase
    .from("finance_user_plans")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  const { data: budgets2 } = await supabase
    .from("finance_fixed_budgets")
    .select("*")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true });

  const { data: rules2 } = await supabase
    .from("finance_rules_v1")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  const dto: BootstrapDTO = {
    plan: {
      projectedIncomeMonthlyCents: Number(plan2?.projected_income_monthly_cents ?? 0),
      fixedBudgets: (budgets2 ?? []).map((r: any) => ({
        id: String(r.id),
        label: String(r.label),
        monthlyCents: Number(r.monthly_cents ?? 0),
        isActive: Boolean(r.is_active ?? true),
      })),
    },
    rules: {
      version: 1,
      safeToSpendMode: (rules2?.safe_to_spend_mode ?? "income-expense-fixedRemaining") as RulesDTO["safeToSpendMode"],
    },
  };

  return NextResponse.json(dto, { status: 200 });
}

export async function POST(req: Request) {
  const supabase = supabaseRouteClient();
  const { data: authData, error: authErr } = await supabase.auth.getUser();

  if (authErr || !authData?.user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const userId = authData.user.id;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const parsed = normalizePlan(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const { plan, rules } = parsed;

  // Plan upsert
  const upPlan = await supabase.from("finance_user_plans").upsert(
    {
      user_id: userId,
      projected_income_monthly_cents: plan.projectedIncomeMonthlyCents,
      currency: "EUR",
    },
    { onConflict: "user_id" }
  );

  if (upPlan.error) return NextResponse.json({ error: upPlan.error.message }, { status: 500 });

  // Replace budgets (simple v1)
  const delBudgets = await supabase.from("finance_fixed_budgets").delete().eq("user_id", userId);
  if (delBudgets.error) return NextResponse.json({ error: delBudgets.error.message }, { status: 500 });

  if (plan.fixedBudgets.length) {
    const insBudgets = await supabase.from("finance_fixed_budgets").insert(
      plan.fixedBudgets.map((b, i) => ({
        user_id: userId,
        id: b.id,
        label: b.label,
        monthly_cents: b.monthlyCents,
        is_active: b.isActive,
        sort_order: i,
      }))
    );
    if (insBudgets.error) return NextResponse.json({ error: insBudgets.error.message }, { status: 500 });
  }

  // Rules upsert
  const upRules = await supabase.from("finance_rules_v1").upsert(
    {
      user_id: userId,
      version: 1,
      safe_to_spend_mode: rules.safeToSpendMode,
    },
    { onConflict: "user_id" }
  );

  if (upRules.error) return NextResponse.json({ error: upRules.error.message }, { status: 500 });

  return NextResponse.json({ ok: true }, { status: 200 });
}