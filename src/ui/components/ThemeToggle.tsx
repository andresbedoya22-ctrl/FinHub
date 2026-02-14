"use client";

import { useEffect, useState } from "react";
import { Button } from "@/ui/components/Button";

export type ThemeMode = "light" | "dark";

type ThemeToggleProps = {
  initialTheme: ThemeMode;
  label: string;
  darkLabel: string;
  lightLabel: string;
};

function persistTheme(next: ThemeMode) {
  const maxAge = 60 * 60 * 24 * 180;
  document.cookie = `theme=${next}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}

function applyTheme(next: ThemeMode) {
  const html = document.documentElement;
  html.dataset.theme = next;
  if (next === "dark") html.classList.add("dark");
  else html.classList.remove("dark");
}

export function ThemeToggle({ initialTheme, label, darkLabel, lightLabel }: ThemeToggleProps) {
  const [theme, setTheme] = useState<ThemeMode>(initialTheme);

  useEffect(() => {
    applyTheme(initialTheme);
  }, [initialTheme]);

  return (
    <Button
      type="button"
      variant="secondary"
      className="h-10 px-3"
      aria-label={label}
      onClick={() => {
        const next: ThemeMode = theme === "dark" ? "light" : "dark";
        setTheme(next);
        applyTheme(next);
        persistTheme(next);
      }}
    >
      {theme === "dark" ? darkLabel : lightLabel}
    </Button>
  );
}
