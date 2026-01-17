import { cn } from "@/ui/cn";

const ORDER = [
  "draft",
  "eligible_checked",
  "paid",
  "waiting_user",
  "under_review",
  "submitted",
  "decision",
  "done",
] as const;

export function SubsidyTimeline({
  status,
  labels,
}: {
  status: string;
  labels: Record<string, string>;
}) {
  const activeIndex = Math.max(0, ORDER.findIndex((s) => s === status));

  return (
    <div className="space-y-3">
      {ORDER.map((step, idx) => {
        const isDone = idx < activeIndex;
        const isActive = idx === activeIndex;
        return (
          <div key={step} className="flex items-start gap-3">
            <div
              className={cn(
                "mt-1 h-3 w-3 rounded-full border",
                isDone ? "border-fh-primary bg-fh-primary" : "",
                isActive ? "border-fh-primary bg-fh-primary/30" : "",
                !isDone && !isActive ? "border-fh-border bg-fh-surface" : ""
              )}
              aria-hidden="true"
            />
            <div>
              <div className={cn("text-sm", isActive ? "font-semibold text-fh-text" : "text-fh-muted")}>
                {labels[step] ?? step}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
