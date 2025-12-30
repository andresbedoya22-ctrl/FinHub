"use client";

import React, { useMemo, useRef, useState } from "react";
import { normalizeLang, pickLangForText, type AppLang } from "@/features/i18n/lang";

type Msg = { role: "user" | "assistant"; text: string; mode?: "faq" | "llm" | "error" };

type ApiOk = { ok: true; mode: "faq" | "llm"; lang: AppLang; answer: string };
function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

function readString(x: unknown, key: string): string | null {
  if (!isRecord(x)) return null;
  const v = x[key];
  return typeof v === "string" ? v : null;
}

function getActiveLang(): AppLang {
  // Fuente mínima: <html lang="...">
  const htmlLang = typeof document !== "undefined" ? document.documentElement.lang : "";
  return normalizeLang(htmlLang, "es");
}

const UI = {
  es: {
    hello: "Hola, soy Finny. Puedo ayudarte a navegar FinHub y resolver dudas frecuentes. ¿Qué necesitas?",
    badge: "FAQ + IA (cuando aplique)",
    close: "Cerrar",
    back: "Volver",
    placeholder: "Escribe tu pregunta…",
    send: "Enviar",
    fail: "No pude procesar tu mensaje.",
    retry: "No pude generar una respuesta útil. Intenta reformular.",
  },
  en: {
    hello: "Hi, I'm Finny. I can help you navigate FinHub and answer common questions. What do you need?",
    badge: "FAQ + AI (when applicable)",
    close: "Close",
    back: "Back",
    placeholder: "Type your question…",
    send: "Send",
    fail: "I couldn't process your message.",
    retry: "I couldn't generate a useful answer. Please rephrase.",
  },
} as const;

export default function FinnyWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  const activeLang = getActiveLang();
  const textLang = pickLangForText(activeLang);
  const t = textLang === "es" ? UI.es : UI.en;

  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", text: t.hello, mode: "faq" },
  ]);

  const listRef = useRef<HTMLDivElement | null>(null);

  const canSend = useMemo(() => input.trim().length >= 2 && !busy, [input, busy]);

  async function send() {
    const msg = input.trim();
    if (!msg || busy) return;

    setInput("");
    setBusy(true);
    setMessages((m) => [...m, { role: "user", text: msg }]);

    try {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: msg, lang: activeLang }),
      });

      const jsonUnknown = (await res.json().catch(() => null)) as unknown;

      if (!res.ok) {
        const err = readString(jsonUnknown, "error") ?? t.fail;
        setMessages((m) => [...m, { role: "assistant", text: err, mode: "error" }]);
      } else {
        // ok-path: validamos shape mínimo sin any
        const ok = isRecord(jsonUnknown) && jsonUnknown.ok === true;
        if (!ok) {
          const err = readString(jsonUnknown, "error") ?? t.fail;
          setMessages((m) => [...m, { role: "assistant", text: err, mode: "error" }]);
        } else {
          const answer = (readString(jsonUnknown, "answer") ?? t.retry).toString().trim();
          const mode = (readString(jsonUnknown, "mode") ?? "llm") as ApiOk["mode"];
          setMessages((m) => [...m, { role: "assistant", text: answer, mode }]);
        }
      }
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : t.fail;
      setMessages((m) => [...m, { role: "assistant", text: err, mode: "error" }]);
    } finally {
      setBusy(false);
      requestAnimationFrame(() => {
        if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
      });
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {open ? (
        <div className="w-[340px] max-w-[90vw] rounded-2xl border bg-white shadow-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-[#0D1B2A] text-white flex items-center justify-center text-sm font-semibold">
                F
              </div>
              <div className="leading-tight">
                <div className="text-sm font-semibold">Finny</div>
                <div className="text-xs text-gray-500">{t.badge}</div>
              </div>
            </div>
            <button
              className="text-sm px-2 py-1 rounded-md border hover:bg-gray-50"
              onClick={() => setOpen(false)}
              aria-label={t.close}
            >
              {t.close}
            </button>
          </div>

          <div ref={listRef} className="max-h-[360px] overflow-auto px-4 py-3 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={[
                    "max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap",
                    m.role === "user" ? "bg-[#4CAF50] text-white" : "bg-gray-100 text-gray-900",
                  ].join(" ")}
                >
                  {m.text}
                  {m.role === "assistant" && m.mode ? (
                    <div className="mt-1 text-[11px] opacity-70">
                      {m.mode === "faq" ? (textLang === "es" ? "Respuesta automática" : "Auto reply") : m.mode === "llm" ? (textLang === "es" ? "IA" : "AI") : (textLang === "es" ? "Error" : "Error")}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t p-3 flex gap-2">
            <input
              className="flex-1 rounded-xl border px-3 py-2 text-sm"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t.placeholder}
              onKeyDown={(e) => {
                if (e.key === "Enter") send();
              }}
              disabled={busy}
            />
            <button
              className="rounded-xl px-3 py-2 text-sm bg-[#0D1B2A] text-white disabled:opacity-50"
              onClick={send}
              disabled={!canSend}
            >
              {busy ? "…" : t.send}
            </button>
          </div>
        </div>
      ) : null}

      {!open ? (
        <button
          className="h-14 w-14 rounded-full bg-[#0D1B2A] text-white shadow-lg flex items-center justify-center text-lg font-semibold"
          onClick={() => setOpen(true)}
          aria-label="Abrir Finny"
          title="Abrir Finny"
        >
          F
        </button>
      ) : null}
    </div>
  );
}


