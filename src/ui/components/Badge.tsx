import { cn } from "@/ui/cn";

type Variant = "neutral" | "success" | "warning" | "danger";

const styles: Record<Variant, string> = {
  neutral: "bg-fh-surface-2 text-fh-text border-fh-border",
  success: "bg-[rgba(76,175,80,0.15)] text-fh-text border-[rgba(76,175,80,0.35)]",
  warning: "bg-[rgba(245,158,11,0.15)] text-fh-text border-[rgba(245,158,11,0.35)]",
  danger: "bg-[rgba(239,68,68,0.15)] text-fh-text border-[rgba(239,68,68,0.35)]",
};

export function Badge({
  children,
  variant = "neutral",
  className,
}: {
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
        styles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
