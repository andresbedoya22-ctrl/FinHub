import * as React from "react";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string;
};

function cx(...classes: Array<string | undefined | null | false>) {
  return classes.filter(Boolean).join(" ");
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, hint, error, id, ...props }, ref) => {
    const autoId = React.useId();
    const inputId = id ?? autoId;

    return (
      <div className="space-y-1">
        {label ? (
          <label htmlFor={inputId} className="text-sm font-medium">
            {label}
          </label>
        ) : null}

        <input
          ref={ref}
          id={inputId}
          className={cx(
            "w-full rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm outline-none",
            "focus:border-fh-accent focus:ring-2 focus:ring-fh-accent/20",
            error ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : "",
            className
          )}
          {...props}
        />

        {error ? (
          <div className="text-xs text-red-600">{error}</div>
        ) : hint ? (
          <div className="text-xs opacity-70">{hint}</div>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";