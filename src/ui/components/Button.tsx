import * as React from "react";
import { cn } from "@/ui/cn";

type ButtonVariant = "primary" | "secondary" | "ghost";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const base =
  "inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-medium transition-colors " +
  "disabled:pointer-events-none disabled:opacity-50 " +
  "focus:outline-none focus:ring-2 focus:ring-fh-focus/60 focus:ring-offset-0";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-fh-primary text-fh-primaryFg hover:opacity-90",
  secondary: "border border-fh-border bg-fh-surface text-fh-text hover:bg-fh-surface-2",
  ghost: "text-fh-text hover:bg-fh-surface-2",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", ...props }, ref) => {
    return (
      <button ref={ref} className={cn(base, variants[variant], className)} {...props} />
    );
  }
);

Button.displayName = "Button";
