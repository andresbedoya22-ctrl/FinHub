import { cn } from "@/ui/cn";

export function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-fh-border bg-fh-surface shadow-soft",
        "p-4 md:p-5",
        className
      )}
    >
      {children}
    </section>
  );
}
