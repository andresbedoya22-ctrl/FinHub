import { describe, expect, it } from "vitest";

import { inferDirectionFromAmount, toSignedAmountCents } from "./transactionsAmount";

describe("transactionsAmount helpers", () => {
  it("converts positive absolute amount to signed by direction", () => {
    expect(toSignedAmountCents(12345, "income")).toBe(12345);
    expect(toSignedAmountCents(12345, "expense")).toBe(-12345);
  });

  it("infers direction from stored signed amount", () => {
    expect(inferDirectionFromAmount(1)).toBe("income");
    expect(inferDirectionFromAmount(0)).toBe("income");
    expect(inferDirectionFromAmount(-1)).toBe("expense");
  });
});
