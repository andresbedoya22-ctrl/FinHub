export type FinnyLang = "es" | "en";

export type FinnyFaq = {
  id: string;
  triggers: string[];
  answerMd: Record<FinnyLang, string>;
};

const faqs: FinnyFaq[] = [
  {
    id: "what-is-machtiging",
    triggers: ["machtiging", "machtigingsregistratie", "autorización", "authorization"],
    answerMd: {
      es: "La *machtigingsregistratie* es una autorización para que un asesor/intermediario pueda actuar en tu nombre en procesos fiscales. En FinHub puedes subir la carta, revisar los datos extraídos y enviarla a revisión.",
      en: "A *machtigingsregistratie* is an authorization that allows an advisor/intermediary to act on your behalf in tax processes. In FinHub you can upload the letter, review extracted data, and send it for review.",
    },
  },
  {
    id: "privacy",
    triggers: ["privacidad", "gdpr", "datos", "privacy"],
    answerMd: {
      es: "Tus datos se usan solo para prestar el servicio y mejorar tu caso. Registramos acciones (auditoría) y aplicamos controles de acceso. Si necesitas, puedo indicarte qué datos se guardan y por cuánto tiempo (según la política de la app).",
      en: "Your data is used only to provide the service and improve your case. We log actions (audit) and enforce access controls. If needed, I can explain what data is stored and for how long (per the app policy).",
    },
  },
  {
    id: "documents",
    triggers: ["documento", "documentos", "subir", "upload", "ocr"],
    answerMd: {
      es: "Puedes subir documentos en la sección *Documentos*. Si el documento es compatible con OCR, lo procesamos, extraemos campos y luego puedes revisarlos antes de enviarlo a verificación.",
      en: "You can upload documents in the *Documents* section. If the document supports OCR, we process it, extract fields, and then you can review them before verification.",
    },
  },
];

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

export function normalizeLang(v?: string): FinnyLang {
  const x = (v ?? "").toString().trim().toLowerCase();
  if (x.startsWith("en")) return "en";
  return "es";
}

export function matchFinnyFaq(message: string): FinnyFaq | null {
  const m = normalize(message);
  if (m.length < 2) return null;

  for (const f of faqs) {
    for (const t of f.triggers) {
      const tt = normalize(t);
      if (tt && m.includes(tt)) return f;
    }
  }
  return null;
}

export function getFaqAnswer(faq: FinnyFaq, lang: FinnyLang): string {
  return (faq.answerMd[lang] ?? faq.answerMd.es ?? "").toString();
}
