"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type Lang = "es" | "en";
type Msg = { role: "user" | "assistant"; text: string; mode?: "faq" | "llm" | "error" };

function normalizeLang(v?: string): Lang {
  const x = (v ?? "").toString().trim().toLowerCase();
  if (x.startsWith("en")) return "en";
  return "es";
}

const i18n = {
  es: {
    name: "Finny",
    subtitle: "FAQ + IA (cuando aplique)",
    close: "Cerrar",
    open: "Abrir Finny",
    placeholder: "Escribe tu pregunta…",
    send: "Enviar",
    busy: "…",
    auto: "Respuesta automática",
    ai: "IA",
    err: "Error",
    greet: "Hola, soy Finny. Puedo ayudarte a navegar FinHub y resolver dudas frecuentes. ¿Qué necesitas?",
    fail: "No pude procesar tu mensaje.",
    llmFallback: "No pude generar una respuesta útil. Intenta reformular.",
    unknown: "Error desconocido",
  },
  en: {
    name: "Finny",
    subtitle: "FAQ + AI (when applicable)",
    close: "Close",
    open: "Open Finny",
    placeholder: "Type your question…",
    send: "Send",
    busy: "…",
    auto: "Auto answer",
    ai: "AI",
    err: "Error",
    greet: "Hi, I’m Finny. I can help you navigate FinHub and answer common questions. What do you need?",
    fail: "I couldn’t process your message.",
    llmFallback: "I could not generate a useful answer. Please try rephrasing.",
    unknown: "Unknown error",
  },
} as const;

export default function FinnyWidget() {
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<Lang>("es");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);

  const t = i18n[lang];
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const l = normalizeLang(document?.documentElement?.lang || navigator.language);
    setLang(l);
    setMessages([{ role: "assistant", text: i18n[l].greet, mode: "faq" }]);
  }, []);

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
        body: JSON.stringify({ message: msg, lang }),
      });

      type ApiOk = { ok: true; mode?: "faq" | "llm"; answer?: string };
      type ApiErr = { ok?: false; error?: string };
      type ApiResp = ApiOk | ApiErr | null;

      const json = (await res.json().catch(() => null)) as ApiResp;

      if (!res.ok || !json?.ok) {
        const err = (() => {
          if (json && typeof json === "object") {
            const r = json as Record<string, unknown>;
            const e = r.error;
            if (typeof e === "string" && e.trim().length > 0) return e;
          }
          return t.fail;
        })();
        setMessages((m) => [...m, { role: "assistant", text: err, mode: "error" }]);
      } else {
        const mode = (json.mode ?? "llm") as "faq" | "llm";
        const answer = (json.answer ?? "").toString().trim() || t.llmFallback;
        setMessages((m) => [...m, { role: "assistant", text: answer, mode }]);
      }
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : t.unknown;
      setMessages((m) => [...m, { role: "assistant", text: err, mode: "error" }]);
    } finally {
      setBusy(false);
      requestAnimationFrame(() => {
        if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
      });
    }
  }

  function modeLabel(m?: Msg["mode"]) {
    if (!m) return null;
    if (m === "faq") return t.auto;
    if (m === "llm") return t.ai;
    return t.err;
  }

  return (
    <div className="fixed bottom-4 left-4 z-50">
      {open ? (
        <div className="w-[340px] max-w-[90vw] rounded-2xl border bg-white shadow-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-[#0D1B2A] text-white flex items-center justify-center text-sm font-semibold">
                F
              </div>
              <div className="leading-tight">
                <div className="text-sm font-semibold">{t.name}</div>
                <div className="text-xs text-gray-500">{t.subtitle}</div>
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
                    <div className="mt-1 text-[11px] opacity-70">{modeLabel(m.mode)}</div>
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
              {busy ? t.busy : t.send}
            </button>
          </div>
        </div>
      ) : null}

      {!open ? (
        <button
          className="h-14 w-14 rounded-full bg-[#0D1B2A] text-white shadow-lg flex items-center justify-center text-lg font-semibold"
          onClick={() => setOpen(true)}
          aria-label={t.open}
          title={t.open}
        >
          F
        </button>
      ) : null}
    </div>
  );
}



