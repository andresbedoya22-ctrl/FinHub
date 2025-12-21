import { cn } from "@/ui/cn";

type Variant = "info" | "warning" | "danger";

const styles: Record<Variant, string> = {
  info: "border-fh-border bg-fh-surface-2 text-fh-text",
  warning:
    "border-[rgba(245,158,11,0.35)] bg-[rgba(245,158,11,0.12)] text-fh-text",
  danger:
    "border-[rgba(239,68,68,0.35)] bg-[rgba(239,68,68,0.12)] text-fh-text",
};

export function InfoBox({
  title,
  children,
  variant = "info",
  className,
}: {
  title?: string;
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border p-4", styles[variant], className)}>
      {title ? <p className="font-semibold">{title}</p> : null}
      <div className={cn(title ? "mt-1" : "", "text-sm text-fh-muted")}>
        {children}
      </div>
    </div>
  );
}
