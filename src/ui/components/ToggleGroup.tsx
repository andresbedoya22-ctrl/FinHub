"use client";

import * as React from "react";
import { cn } from "@/ui/cn";

export type ToggleOption<T extends string> = {
  value: T;
  label: string;
  description?: string;
};

type Props<T extends string> = {
  label?: string;
  options: ReadonlyArray<ToggleOption<T>>;
  value?: T;
  defaultValue?: T;
  onValueChange?: (value: T) => void;
  disabled?: boolean;
  className?: string;
};

export function ToggleGroup<T extends string>({
  label,
  options,
  value,
  defaultValue,
  onValueChange,
  disabled = false,
  className,
}: Props<T>) {
  const isControlled = value !== undefined;
  const [internal, setInternal] = React.useState<T | undefined>(defaultValue);

  const current = (isControlled ? value : internal) ?? options[0]?.value;

  function setNext(v: T) {
    if (disabled) return;
    if (!isControlled) setInternal(v);
    onValueChange?.(v);
  }

  return (
    <div className={cn("space-y-2", className)}>
      {label ? <div className="text-sm font-medium text-fh-muted">{label}</div> : null}

      <div role="group" className="grid gap-2 md:grid-cols-2">
        {options.map((o) => {
          const active = o.value === current;
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={active}
              disabled={disabled}
              onClick={() => setNext(o.value)}
              className={cn(
                "rounded-2xl border px-4 py-3 text-left transition",
                "border-fh-border bg-fh-surface hover:bg-fh-surface-2",
                "focus:outline-none focus:ring-2 focus:ring-fh-focus/60",
                disabled ? "opacity-60 cursor-not-allowed" : "",
                active ? "border-fh-primary/70 bg-fh-primary/10" : ""
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-fh-text">{o.label}</div>
                  {o.description ? <div className="mt-1 text-xs text-fh-muted">{o.description}</div> : null}
                </div>
                <div className={cn("text-xs", active ? "text-fh-primary" : "text-fh-muted")}>
                  {active ? "●" : "○"}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
