import { describe, expect, it } from "vitest";

import { resolveUserTenantScope } from "./tenantService";

describe("tenantService", () => {
  it("returns null scope when tenant schema is missing", async () => {
    const supabase = {
      from() {
        return {
          select() {
            return {
              eq() {
                return {
                  eq() {
                    return {
                      order() {
                        return {
                          order() {
                            return {
                              limit() {
                                return {
                                  maybeSingle: async () => ({
                                    data: null,
                                    error: {
                                      code: "PGRST205",
                                      message:
                                        "Could not find the table 'public.tenant_members' in the schema cache",
                                    },
                                  }),
                                };
                              },
                            };
                          },
                        };
                      },
                    };
                  },
                };
              },
            };
          },
        };
      },
    };

    const scope = await resolveUserTenantScope(supabase as never, "u1");
    expect(scope).toEqual({ tenantId: null, role: null });
  });

  it("returns first active tenant scope", async () => {
    const supabase = {
      from() {
        return {
          select() {
            return {
              eq() {
                return {
                  eq() {
                    return {
                      order() {
                        return {
                          order() {
                            return {
                              limit() {
                                return {
                                  maybeSingle: async () => ({
                                    data: {
                                      tenant_id: "t-1",
                                      role: "admin",
                                      status: "active",
                                      is_default: true,
                                      created_at: "2026-01-01T00:00:00.000Z",
                                    },
                                    error: null,
                                  }),
                                };
                              },
                            };
                          },
                        };
                      },
                    };
                  },
                };
              },
            };
          },
        };
      },
    };

    const scope = await resolveUserTenantScope(supabase as never, "u2");
    expect(scope).toEqual({ tenantId: "t-1", role: "admin" });
  });
});
