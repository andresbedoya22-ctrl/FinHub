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
      {label ? <div className="mb-1 text-sm font-medium text-white/80">{label}</div> : null}

      <input
        {...props}
        className={[
          "w-full rounded-xl border px-3 py-2 text-sm outline-none transition",
          "border-white/10 bg-white/5 text-white placeholder:text-white/40",
          "focus:ring-2 focus:ring-[#4CAF50]/35 focus:border-[#4CAF50]/50",
          error ? "border-red-400/60 focus:ring-red-400/25" : "",
          inputClassName
        ].join(" ")}
      />

      {error ? (
        <div className="mt-1 text-xs text-red-300">{error}</div>
      ) : hint ? (
        <div className="mt-1 text-xs text-white/60">{hint}</div>
      ) : null}
    </label>
  );
}
