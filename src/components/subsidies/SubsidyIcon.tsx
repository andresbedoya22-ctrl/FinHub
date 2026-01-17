import { cn } from "@/ui/cn";
import type { SubsidyIcon as SubsidyIconName } from "@/domain/subsidies/registry";

export function SubsidyIcon({
  name,
  className,
}: {
  name: SubsidyIconName;
  className?: string;
}) {
  const base = cn("h-5 w-5 text-fh-text", className);

  switch (name) {
    case "home":
      return (
        <svg className={base} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M4 11.5L12 5l8 6.5V20a1 1 0 0 1-1 1h-5v-5h-4v5H5a1 1 0 0 1-1-1v-8.5z" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
    case "health":
      return (
        <svg className={base} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 5.5-7 10-7 10z" stroke="currentColor" strokeWidth="1.5" />
          <path d="M9.5 12h5M12 9.5v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "kids":
      return (
        <svg className={base} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M7 13a5 5 0 1 0 10 0" stroke="currentColor" strokeWidth="1.5" />
          <path d="M5 21a7 7 0 0 1 14 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M9 7a3 3 0 1 1 6 0" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
    case "childcare":
      return (
        <svg className={base} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M4 10h16v9H4v-9z" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.5" />
          <path d="M12 13v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    default:
      return null;
  }
}
