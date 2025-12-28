"use client";

import React, { useMemo, useRef, useState } from "react";
import { finnyChat } from "@/features/assistant/finny/finnyApiClient";
import { AppLang, normalizeLang, pickLangForText } from "@/features/i18n/lang";

type Msg = { role: "user" | "assistant"; text: string; mode?: "faq" | "llm" | "error" };

function detectActiveLang(): AppLang {
  // 1) <html lang="...">
  const htmlLang = typeof document !== "undefined" ? document.documentElement.getAttribute("lang") : null;
  const l1 = normalizeLang(htmlLang ?? "", "es");

  // 2) localStorage fallback (si tu selector lo guarda)
  let ls: string | null = null;
  try {
    ls = typeof window !== "undefined" ? window.localStorage.getItem("fh_lang") : null;
  } catch {
    ls = null;
  }
  const l2 = normalizeLang(ls ?? "", l1);

  // 3) si no es ES/EN, cae a EN (por ahora)
  return pickLangForText(l2);
}

function uiText(lang: AppLang) {
  if (lang === "es") {
    return {
      title: "Finny",
      subtitle: "FAQ + IA (cuando aplique)",
      hello: "Hola, soy Finny. Puedo ayudarte a navegar FinHub y resolver dudas frecuentes. ¿Qué necesitas?",
      close: "Cerrar",
      placeholder: "Escribe tu pregunta…",
      send: "Enviar",
      sending: "…",
      fail: "No pude procesar tu mensaje.",
      faqTag: "Respuesta automática",
      llmTag: "IA",
      errTag: "Error",
    };
  }
  return {
    title: "Finny",
    subtitle: "FAQ + AI (when applicable)",
    hello: "Hi, I'm Finny. I can help you navigate FinHub and answer common questions. What do you need?",
    close: "Close",
    placeholder: "Type your question…",
    send: "Send",
    sending: "…",
    fail: "I could not process your message.",
    faqTag: "Auto answer",
    llmTag: "AI",
    errTag: "Error",
  };
}

export default function FinnyWidget() {
  const lang = useMemo(() => detectActiveLang(), []);
  const t = useMemo(() => uiText(lang), [lang]);

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
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
      const json = await finnyChat(msg, lang);

      if (!json.ok) {
        const err = (json.error ?? t.fail).toString();
        setMessages((m) => [...m, { role: "assistant", text: err, mode: "error" }]);
      } else {
        const mode = json.mode ?? "llm";
        const answer = (json.answer ?? "").toString().trim() || t.fail;
        setMessages((m) => [...m, { role: "assistant", text: answer, mode }]);
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
    <div className="fixed bottom-4 left-4 z-50">
      {open ? (
        <div className="w-[340px] max-w-[90vw] rounded-2xl border bg-white shadow-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-[#0D1B2A] text-white flex items-center justify-center text-sm font-semibold">
                F
              </div>
              <div className="leading-tight">
                <div className="text-sm font-semibold">{t.title}</div>
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
                    <div className="mt-1 text-[11px] opacity-70">
                      {m.mode === "faq" ? t.faqTag : m.mode === "llm" ? t.llmTag : t.errTag}
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
              {busy ? t.sending : t.send}
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
