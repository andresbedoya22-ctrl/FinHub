import { NextResponse } from "next/server";

import { supabaseRouteClient } from "@/lib/supabase/routeClient";
import type { FinanceRulesV1, FinancesBootstrap } from "@/features/finances/financesTypes";

type FixedBudgetDTO = {
  id: string;
  label: string;
  monthlyCents: number;
  isActive: boolean;
};

type PlanDTO = FinancesBootstrap["plan"];
type RulesDTO = FinanceRulesV1;

/**
 * Minimal row shapes (avoid "any" and no dependency on generated types).
 * Adjust column names if your DB differs.
 */
type FinanceUserPlanRow = {
  projected_income_monthly_cents: number | null;
};

type FinanceFixedBudgetRow = {
  id: string;
  label: string;
  monthly_cents: number | null;
  is_active: boolean | null;
  sort_order: number | null;
};

type FinanceRulesRow = {
  safe_to_spend_mode: string | null;
};

const DEFAULT_BUDGETS: FixedBudgetDTO[] = [
  { id: "fb_rent", label: "Alquiler", monthlyCents: 110000, isActive: true },
  { id: "fb_insurance", label: "Seguros", monthlyCents: 20000, isActive: true },
  { id: "fb_utilities", label: "Servicios", monthlyCents: 18000, isActive: true },
];

function normalizePlan(
  input: unknown
): { ok: true; plan: PlanDTO; rules: RulesDTO } | { ok: false; error: string } {
  if (!input || typeof input !== "object") return { ok: false, error: "Invalid body" };

  const body = input as Record<string, unknown>;
  const plan = body.plan as Record<string, unknown> | undefined;
  const rules = body.rules as Record<string, unknown> | undefined;

  const projected = Number(plan?.projectedIncomeMonthlyCents ?? 0);
  if (!Number.isFinite(projected) || projected < 0) {
    return { ok: false, error: "projectedIncomeMonthlyCents invalid" };
  }

  const fixedBudgets = Array.isArray(plan?.fixedBudgets) ? (plan!.fixedBudgets as unknown[]) : [];
  const mapped: FixedBudgetDTO[] = fixedBudgets
    .map((x) => {
      const o = (x ?? {}) as Record<string, unknown>;
      return {
        id: String(o.id ?? crypto.randomUUID()),
        label: String(o.label ?? "Unnamed"),
        monthlyCents: Number(o.monthlyCents ?? 0),
        isActive: Boolean(o.isActive ?? true),
      };
    })
    .filter((b) => Number.isFinite(b.monthlyCents) && b.monthlyCents >= 0);

  const safeToSpendMode = (rules?.safeToSpendMode ?? "income-expense-fixedRemaining") as RulesDTO["safeToSpendMode"];
  if (safeToSpendMode !== "income-expense-fixedRemaining") {
    return { ok: false, error: "rules.safeToSpendMode invalid" };
  }

  return {
    ok: true,
    plan: { projectedIncomeMonthlyCents: projected, fixedBudgets: mapped },
    rules: { version: 1, safeToSpendMode: "income-expense-fixedRemaining" },
  };
}

export async function GET() {
  const supabase = await supabaseRouteClient();
  const { data: authData, error: authErr } = await supabase.auth.getUser();

  if (authErr || !authData?.user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const userId = authData.user.id;

  const { data: planRow, error: planErr } = await supabase
    .from("finance_user_plans")
    .select("projected_income_monthly_cents")
    .eq("user_id", userId)
    .maybeSingle();

  const { data: budgetRows, error: budgetErr } = await supabase
    .from("finance_fixed_budgets")
    .select("id,label,monthly_cents,is_active,sort_order")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true });

  const { data: rulesRow, error: rulesErr } = await supabase
    .from("finance_rules_v1")
    .select("safe_to_spend_mode")
    .eq("user_id", userId)
    .maybeSingle();

  if (planErr || budgetErr || rulesErr) {
    return NextResponse.json(
      { error: "DB_ERROR", details: [planErr?.message, budgetErr?.message, rulesErr?.message].filter(Boolean) },
      { status: 500 }
    );
  }

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
        id: b.id,
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

  const { data: plan2 } = await supabase
    .from("finance_user_plans")
    .select("projected_income_monthly_cents")
    .eq("user_id", userId)
    .maybeSingle();

  const { data: budgets2 } = await supabase
    .from("finance_fixed_budgets")
    .select("id,label,monthly_cents,is_active,sort_order")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true });

  const { data: rules2 } = await supabase
    .from("finance_rules_v1")
    .select("safe_to_spend_mode")
    .eq("user_id", userId)
    .maybeSingle();

  const planTyped = (plan2 ?? null) as unknown as FinanceUserPlanRow | null;
  const budgetsTyped = (budgets2 ?? []) as unknown as FinanceFixedBudgetRow[];
  const rulesTyped = (rules2 ?? null) as unknown as FinanceRulesRow | null;

  const safeMode = (rulesTyped?.safe_to_spend_mode ?? "income-expense-fixedRemaining") as RulesDTO["safeToSpendMode"];
  const normalizedSafeMode: RulesDTO["safeToSpendMode"] =
    safeMode === "income-expense-fixedRemaining" ? "income-expense-fixedRemaining" : "income-expense-fixedRemaining";

  const dto: FinancesBootstrap = {
    plan: {
      projectedIncomeMonthlyCents: Number(planTyped?.projected_income_monthly_cents ?? 0),
      fixedBudgets: budgetsTyped.map((r) => ({
        id: String(r.id),
        label: String(r.label),
        monthlyCents: Number(r.monthly_cents ?? 0),
        isActive: Boolean(r.is_active ?? true),
      })),
    },
    rules: {
      version: 1,
      safeToSpendMode: normalizedSafeMode,
    },
  };

  return NextResponse.json(dto, { status: 200 });
}

export async function POST(req: Request) {
  const supabase = await supabaseRouteClient();
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

  const upPlan = await supabase.from("finance_user_plans").upsert(
    {
      user_id: userId,
      projected_income_monthly_cents: plan.projectedIncomeMonthlyCents,
      currency: "EUR",
    },
    { onConflict: "user_id" }
  );

  if (upPlan.error) return NextResponse.json({ error: upPlan.error.message }, { status: 500 });

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
