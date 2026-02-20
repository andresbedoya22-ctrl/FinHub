"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { SUPPORTED_LOCALES, type SupportedLocale } from "@/i18n/config";
import { Button } from "@/ui/components/Button";

const LABELS: Record<SupportedLocale, string> = {
  en: "English",
  es: "Español",
  pl: "Polski",
  ro: "Română",
};

export function LanguageGate() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<SupportedLocale>("en");
  const [remember, setRemember] = useState(false);

  function handleContinue() {
    if (!selected) return;

    startTransition(() => {
      // Set the locale cookie
      const days = remember ? 365 : 1; // session-ish vs persistent
      document.cookie = `fh_locale=${selected};path=/;max-age=${days * 86400};samesite=lax`;

      // Redirect to the landing
      router.push("/landing");
      router.refresh();
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0D1B2A] px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-white/5 p-8 shadow-2xl backdrop-blur-sm border border-white/10">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-white">
            Choose your language
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            You can always change this later
          </p>
        </div>

        <div className="mt-8 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {SUPPORTED_LOCALES.map((loc) => (
              <button
                key={loc}
                onClick={() => setSelected(loc)}
                className={`flex items-center justify-center rounded-xl border px-4 py-6 text-lg font-medium transition-all ${selected === loc
                  ? "border-[#4CAF50] bg-[#4CAF50]/10 text-white shadow-[0_0_15px_rgba(76,175,80,0.3)]"
                  : "border-gray-700 bg-transparent text-gray-300 hover:border-gray-500 hover:bg-white/5"
                  }`}
              >
                {LABELS[loc]}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-center mt-6">
            <label className="flex items-center space-x-3 cursor-pointer group">
              <div className="relative flex items-center">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                <div className="h-5 w-5 rounded border border-gray-500 bg-transparent transition-colors peer-checked:border-[#4CAF50] peer-checked:bg-[#4CAF50] group-hover:border-[#4CAF50]"></div>
                <svg
                  className="absolute left-0.5 top-0.5 h-4 w-4 text-white opacity-0 transition-opacity peer-checked:opacity-100"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-sm text-gray-300 font-medium group-hover:text-white transition-colors">
                Remember my choice
              </span>
            </label>
          </div>

          <div className="pt-6">
            <Button
              onClick={handleContinue}
              disabled={!selected || isPending}
              className="w-full rounded-xl bg-[#4CAF50] py-4 text-lg font-semibold text-[#0D1B2A] hover:bg-[#4CAF50]/90 focus:ring-[#4CAF50] focus:ring-offset-[#0D1B2A] transition-all disabled:opacity-50"
            >
              Contact
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
