"use client";

import type { ReactNode } from "react";

import { Button } from "./Button";

type SheetProps = {
  open: boolean;
  title: string;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
};

export function Sheet({ open, title, onOpenChange, children }: SheetProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className="absolute inset-0 bg-black/50" onClick={() => onOpenChange(false)} aria-label={title} />
      <aside className="absolute left-0 top-0 h-dvh w-[88vw] max-w-[320px] overflow-y-auto border-r border-fh-border bg-fh-surface p-3 shadow-soft">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-base font-semibold">{title}</div>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} aria-label={title}>x</Button>
        </div>
        {children}
      </aside>
    </div>
  );
}
