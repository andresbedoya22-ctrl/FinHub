"use client";

import * as React from "react";

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string;
  containerClassName?: string;
  inputClassName?: string;
};

export function Input({
  label,
  hint,
  error,
  containerClassName = "",
  inputClassName = "",
  ...props
}: Props) {
  return (
    <label className={["block", containerClassName].join(" ")}>
      {label ? <div className="mb-1 text-sm font-medium text-fh-muted">{label}</div> : null}

      <input
        {...props}
        className={[
          "w-full rounded-xl border px-3 py-2 text-sm outline-none transition",
          "border-fh-border bg-fh-surface text-fh-text placeholder:text-fh-muted/60",
          "focus:ring-2 focus:ring-fh-primary/35 focus:border-fh-primary/60",
          error ? "border-fh-danger/60 focus:ring-fh-danger/25 focus:border-fh-danger/60" : "",
          inputClassName,
        ].join(" ")}
      />

      {error ? (
        <div className="mt-1 text-xs text-red-300">{error}</div>
      ) : hint ? (
        <div className="mt-1 text-xs text-fh-muted">{hint}</div>
      ) : null}
    </label>
  );
}
