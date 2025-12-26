import * as React from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

function cx(...classes: Array<string | undefined | null | false>) {
  return classes.filter(Boolean).join(" ");
}

const base =
  "inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-fh-accent text-white hover:opacity-90",
  secondary: "border border-fh-border bg-fh-surface hover:bg-fh-surface-2",
  ghost: "hover:bg-fh-surface-2",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cx(base, variants[variant], className)}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";