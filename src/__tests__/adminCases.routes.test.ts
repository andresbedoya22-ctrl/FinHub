import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminMock = vi.fn();

vi.mock("@/app/api/admin/_lib/requireAdmin", () => ({
  requireAdmin: () => requireAdminMock(),
}));

vi.mock("../app/api/admin/_lib/requireAdmin", () => ({
  requireAdmin: () => requireAdminMock(),
}));

vi.mock("@/features/cases/adminCasesSla", () => ({
  computeSlaBucket: () => "ok",
}));

vi.mock("../features/cases/adminCasesSla", () => ({
  computeSlaBucket: () => "ok",
}));

function createAwaitableResult<T>(result: T) {
  return {
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    then(onFulfilled: (value: T) => unknown, onRejected?: (reason: unknown) => unknown) {
      return Promise.resolve(result).then(onFulfilled, onRejected);
    },
  };
}

describe("admin cases routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET /api/admin/cases returns 401 when admin auth fails", async () => {
    const { GET } = await import("../app/api/admin/cases/route");
    requireAdminMock.mockResolvedValueOnce({ ok: false, status: 401, error: "Unauthorized" });

    const res = await GET(new Request("http://localhost/api/admin/cases"));
    expect(res.status).toBe(401);

    const body = (await res.json()) as { ok: boolean; error: string };
    expect(body.ok).toBe(false);
    expect(body.error).toBe("Unauthorized");
  });

  it("GET /api/admin/cases returns filtered rows", async () => {
    const { GET } = await import("../app/api/admin/cases/route");

    const query = createAwaitableResult({
      data: [
        {
          id: "case-1",
          type: "toeslagen",
          title: "Alpha case",
          status: "created",
          step_key: "intake",
          authorization_status: "received",
          updated_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
        {
          id: "case-2",
          type: "taxes",
          title: "Beta case",
          status: "created",
          step_key: "intake",
          authorization_status: "not_started",
          updated_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
      ],
      error: null,
    });

    const supabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table !== "cases") throw new Error(`Unexpected table: ${table}`);
        return {
          select: vi.fn().mockReturnValue(query),
        };
      }),
    };

    requireAdminMock.mockResolvedValueOnce({ ok: true, supabase });

    const res = await GET(new Request("http://localhost/api/admin/cases?q=alpha"));
    expect(res.status).toBe(200);

    const body = (await res.json()) as { ok: boolean; rows: Array<{ id: string; sla_bucket: string }> };
    expect(body.ok).toBe(true);
    expect(body.rows).toHaveLength(1);
    expect(body.rows[0]?.id).toBe("case-1");
    expect(typeof body.rows[0]?.sla_bucket).toBe("string");
  });

  it("PATCH /api/admin/cases/[id]/tasks/[taskId] validates status", async () => {
    const { PATCH } = await import("../app/api/admin/cases/[id]/tasks/[taskId]/route");
    requireAdminMock.mockResolvedValueOnce({ ok: true, supabase: { from: vi.fn() } });

    const res = await PATCH(
      new Request("http://localhost/api/admin/cases/case-1/tasks/task-1", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "invalid" }),
      }),
      { params: Promise.resolve({ id: "case-1", taskId: "task-1" }) }
    );

    expect(res.status).toBe(400);
    const body = (await res.json()) as { ok: boolean; error: string };
    expect(body.ok).toBe(false);
    expect(body.error).toMatch(/invalid status/i);
  });

  it("PATCH /api/admin/cases/[id]/tasks/[taskId] updates task for valid status", async () => {
    const { PATCH } = await import("../app/api/admin/cases/[id]/tasks/[taskId]/route");

    const taskBuilder = {
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: "task-1",
          case_id: "case-1",
          title: "Task",
          status: "done",
          due_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        error: null,
      }),
    };

    const supabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table !== "case_tasks") throw new Error(`Unexpected table: ${table}`);
        return {
          update: vi.fn().mockReturnValue(taskBuilder),
        };
      }),
    };

    requireAdminMock.mockResolvedValueOnce({ ok: true, supabase });

    const res = await PATCH(
      new Request("http://localhost/api/admin/cases/case-1/tasks/task-1", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "done" }),
      }),
      { params: Promise.resolve({ id: "case-1", taskId: "task-1" }) }
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; task: { status: string } };
    expect(body.ok).toBe(true);
    expect(body.task.status).toBe("done");
  });
});

