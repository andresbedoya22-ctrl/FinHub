export type SlaBucket = "ok" | "warning" | "overdue";

export function computeSlaBucket(updatedAtIso: string, nowMs = Date.now()): SlaBucket {
  const ageMs = nowMs - new Date(updatedAtIso).getTime();
  const ageHours = ageMs / (1000 * 60 * 60);
  if (ageHours > 72) return "overdue";
  if (ageHours > 24) return "warning";
  return "ok";
}
