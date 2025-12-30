import { type AppLang } from "@/features/i18n/lang";

export type FinnyFaq = {
  id: string;
  triggers: string[];
  answerMd: string;
};

type FaqDef = {
  id: string;
  triggers: string[];
  answers: Partial<Record<AppLang, string>> & { es: string; en: string };
};

const faqs: FaqDef[] = [
  {
    id: "what-is-machtiging",
    triggers: ["machtiging", "machtigingsregistratie", "autorización", "authorization"],
    answers: {
      es: "La *machtigingsregistratie* es una autorización para que un asesor/intermediario actúe en tu nombre en procesos fiscales. En FinHub puedes subir la carta, revisar los datos extraídos y enviarla a revisión.",
      en: "A *machtigingsregistratie* is an authorization that allows an advisor/intermediary to act on your behalf in tax processes. In FinHub you can upload the letter, review extracted data, and send it for human review.",
    },
  },
  {
    id: "privacy",
    triggers: ["privacidad", "gdpr", "datos", "privacy"],
    answers: {
      es: "Tus datos se usan solo para prestar el servicio. Registramos acciones (auditoría) y aplicamos controles de acceso. Si lo necesitas, puedo decirte qué datos se guardan y por cuánto tiempo (según la política de la app).",
      en: "Your data is used only to provide the service. We log actions (audit trail) and enforce access controls. If needed, I can explain what data is stored and for how long (per the app policy).",
    },
  },
  {
    id: "documents",
    triggers: ["documento", "documentos", "subir", "upload", "ocr"],
    answers: {
      es: "Puedes subir documentos en *Documentos*. Si el documento es compatible con OCR, lo procesamos, extraemos campos y luego puedes revisarlos antes de enviarlo a verificación.",
      en: "You can upload documents in *Documents*. If the document supports OCR, we process it, extract fields, and you can review them before verification.",
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

export function matchFinnyFaq(message: string, lang: AppLang): FinnyFaq | null {
  const m = normalize(message);
  if (m.length < 2) return null;

  for (const f of faqs) {
    for (const t of f.triggers) {
      const tt = normalize(t);
      if (tt && m.includes(tt)) {
        const answerMd = (f.answers[lang] ?? f.answers.en).toString();
        return { id: f.id, triggers: f.triggers, answerMd };
      }
    }
  }
  return null;
}
