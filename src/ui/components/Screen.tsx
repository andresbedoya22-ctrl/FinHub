import { cn } from "@/ui/cn";

export function Screen({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <main className={cn("fh-container", className)}>{children}</main>;
}
