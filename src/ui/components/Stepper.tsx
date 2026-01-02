"use client";

import * as React from "react";
import { cn } from "@/ui/cn";

export type StepperStep = {
  key: string;
  title: string;
  description?: string;
};

type Props = {
  steps: ReadonlyArray<StepperStep>;
  activeKey: string;
  onStepChange?: (key: string) => void;
  className?: string;
};

export function Stepper({ steps, activeKey, onStepChange, className }: Props) {
  const activeIndex = Math.max(0, steps.findIndex((s) => s.key === activeKey));

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-fh-muted">Progreso</div>
        <div className="text-xs text-fh-muted">
          Paso {Math.min(activeIndex + 1, steps.length)} / {steps.length}
        </div>
      </div>

      <div className="space-y-2">
        {steps.map((s, idx) => {
          const isActive = idx === activeIndex;
          const isDone = idx < activeIndex;

          return (
            <button
              key={s.key}
              type="button"
              onClick={() => onStepChange?.(s.key)}
              className={cn(
                "w-full rounded-2xl border p-4 text-left transition",
                "border-fh-border bg-fh-surface hover:bg-fh-surface-2",
                "focus:outline-none focus:ring-2 focus:ring-fh-focus/60",
                isActive ? "border-fh-primary/70 bg-fh-primary/10" : ""
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "mt-0.5 flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold",
                    "border-fh-border bg-fh-surface-2 text-fh-text",
                    isDone ? "border-fh-primary/70 bg-fh-primary/20 text-fh-text" : "",
                    isActive ? "border-fh-primary/70 bg-fh-primary/20" : ""
                  )}
                >
                  {isDone ? "✓" : idx + 1}
                </div>

                <div className="min-w-0">
                  <div className="text-sm font-semibold text-fh-text">{s.title}</div>
                  {s.description ? <div className="mt-1 text-xs text-fh-muted">{s.description}</div> : null}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
