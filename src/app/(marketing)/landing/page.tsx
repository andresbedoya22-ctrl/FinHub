import Link from "next/link";
import LandingLeadForm from "./ui/LandingLeadForm";
import LandingNavbar from "./LandingNavbar";
import { getI18nRequestContext } from "@/i18n/request";

type Lang = "en" | "es" | "pl" | "ro";

type HowStep = { t: string; d: string };
type PricingTier = { t: string; p: string; d: string };
type FaqItem = { q: string; a: string };

type LeadInterestKey =
  | "personal_finance"
  | "taxes"
  | "voorlopige_aanslag"
  | "toeslagen"
  | "mortgage"
  | "personal_loan"
  | "insurance";

type LeadStrings = {
  title: string;
  subtitle: string;
  name: string;
  email: string;
  phone: string;
  interests: string;
  consent: string;
  submit: string;
  successTitle: string;
  successBody: string;
  fail: string;
  ctaCreateAccount: string;
  interestLabels: Record<LeadInterestKey, string>;
};

type LandingCopy = {
  hero: {
    title: string;
    subtitle: string;
    bullets: string[];
    ctaPrimary: string;
    ctaSecondary: string;
  };
  hub: { title: string; subtitle: string; infoTitle: string; infoBody: string };
  how: { title: string; steps: HowStep[] };
  pricing: { title: string; subtitle: string; tiers: PricingTier[] };
  faq: { title: string; subtitle: string; items: FaqItem[] };
  lead: LeadStrings;
  trust: string[];
  legal: { byUsing: string; terms: string; and: string; privacy: string };
  footer: { note: string };
};

const COPY: Record<Lang, LandingCopy> = {
  en: {
    hero: {
      title: "Your finances in the Netherlands, in your language.",
      subtitle:
        "Control your money, check toeslagen eligibility, upload documents and get guided – all in one place.",
      bullets: [
        "Built for the Netherlands",
        "We never ask for your DigiD",
        "Human review when needed",
        "GDPR-grade privacy",
      ],
      ctaPrimary: "Create free account",
      ctaSecondary: "Check toeslagen eligibility",
    },
    hub: {
      title: "FinHub Core: Personal Finance Control",
      subtitle: "Everything starts with clarity. From your core finances, you unlock the flows you actually need.",
      infoTitle: "Why this structure?",
      infoBody:
        "Core personal finance gives you clarity. From there, you activate only the flows you need — taxes, toeslagen, mortgages, loans, insurance.",
    },
    how: {
      title: "How it works",
      steps: [
        { t: "1. Create an account", d: "Start with the essentials — no friction." },
        { t: "2. Tell us your goals", d: "Are you an employee, self-employed, or both?" },
        { t: "3. Follow guided flows", d: "We guide you step-by-step. Upload documents only when needed." },
        { t: "4. Get an outcome", d: "Clear next steps. Human review when it matters." },
      ],
    },
    pricing: {
      title: "Pricing",
      subtitle: "Start for free.",
      tiers: [
        { t: "Free", p: "€0", d: "Basic money management and beta access." },
        { t: "Premium", p: "Coming soon", d: "Advanced features and dedicated human support." },
      ],
    },
    faq: {
      title: "FAQ",
      subtitle: "Quick answers to common questions.",
      items: [
        { q: "Do you need my DigiD?", a: "No, we never ask for your DigiD." },
        { q: "Is FinHub only for migrants?", a: "FinHub is designed for migrants in NL, but anyone can benefit." },
        { q: "Do I need to upload documents?", a: "Only when needed. The goal is to reduce paperwork, not increase it." },
        { q: "Is there human support?", a: "Yes — human review is available when the flow requires it." },
      ],
    },
    lead: {
      title: "Get updates (beta)",
      subtitle: "Leave your details and what you're interested in — we'll prioritize accordingly.",
      name: "Full name",
      email: "Email",
      phone: "Phone (optional)",
      interests: "I'm interested in",
      consent: "I agree to be contacted about FinHub updates and beta access.",
      submit: "Submit",
      successTitle: "Thanks — you're on the list.",
      successBody: "We'll reach out when your flow is ready. You can also create an account now.",
      fail: "Please complete all required fields and select at least 1 interest.",
      ctaCreateAccount: "Create account",
      interestLabels: {
        personal_finance: "Personal finance control",
        taxes: "Taxes (IB)",
        voorlopige_aanslag: "Provisional assessment",
        toeslagen: "Toeslagen",
        mortgage: "Mortgages",
        personal_loan: "Personal loans",
        insurance: "Insurance",
      },
    },
    trust: ["Built for the Netherlands", "Never ask for DigiD", "Human review when needed", "GDPR-grade privacy"],
    legal: { byUsing: "By using FinHub you accept the", terms: "Terms", and: "and", privacy: "Privacy Policy" },
    footer: { note: "FinHub is in beta. Content may change." },
  },

  es: {
    hero: {
      title: "Tus finanzas en Países Bajos, en tu idioma.",
      subtitle:
        "Controla tu dinero, revisa toeslagen, sube documentos y recibe guía — todo en un solo lugar.",
      bullets: [
        "Pensado para Países Bajos",
        "Nunca pedimos DigiD",
        "Revisión humana cuando sea necesario",
        "Privacidad tipo GDPR",
      ],
      ctaPrimary: "Crear cuenta gratis",
      ctaSecondary: "Ver elegibilidad de toeslagen",
    },
    hub: {
      title: "FinHub Core: Control de Finanzas Personales",
      subtitle: "Todo empieza con claridad. Desde tu núcleo financiero, accedes a los flujos que realmente necesitas.",
      infoTitle: "¿Por qué esta estructura?",
      infoBody:
        "El núcleo de finanzas personales te da claridad. Desde ahí activas solo los flujos que necesitas — impuestos, toeslagen, hipotecas, créditos, seguros.",
    },
    how: {
      title: "Cómo funciona",
      steps: [
        { t: "1. Crea una cuenta", d: "Empieza por lo esencial, sin fricción." },
        { t: "2. Cuéntanos tus metas", d: "¿Eres empleado, autónomo (ZZP) o ambos?" },
        { t: "3. Sigue flujos guiados", d: "Te guiamos paso a paso. Solo subes documentos si hace falta." },
        { t: "4. Obtén un resultado", d: "Próximos pasos claros. Revisión humana cuando aplica." },
      ],
    },
    pricing: {
      title: "Precios",
      subtitle: "Comienza gratis.",
      tiers: [
        { t: "Gratis", p: "€0", d: "Gestión básica de dinero y acceso a beta." },
        { t: "Premium", p: "Próximamente", d: "Funciones avanzadas y soporte humano dedicado." },
      ],
    },
    faq: {
      title: "FAQ",
      subtitle: "Respuestas rápidas a preguntas comunes.",
      items: [
        { q: "¿Necesitan mi DigiD?", a: "No, nunca pedimos tu DigiD." },
        { q: "¿FinHub es solo para migrantes?", a: "Está diseñado para migrantes en NL, pero cualquiera puede beneficiarse." },
        { q: "¿Tengo que subir documentos?", a: "Solo cuando haga falta. La idea es reducir papeleo, no aumentarlo." },
        { q: "¿Hay soporte humano?", a: "Sí — hay revisión humana cuando el flujo lo requiere." },
      ],
    },
    lead: {
      title: "Recibir novedades (beta)",
      subtitle: "Déjanos tus datos y lo que te interesa — priorizamos según demanda.",
      name: "Nombre completo",
      email: "Email",
      phone: "Teléfono (opcional)",
      interests: "Me interesa",
      consent: "Acepto que me contacten sobre novedades y acceso a la beta de FinHub.",
      submit: "Enviar",
      successTitle: "Gracias — ya estás en la lista.",
      successBody: "Te contactaremos cuando tu flujo esté listo. También puedes crear cuenta ahora.",
      fail: "Completa los campos obligatorios y elige al menos 1 interés.",
      ctaCreateAccount: "Crear cuenta",
      interestLabels: {
        personal_finance: "Control de finanzas personales",
        taxes: "Impuestos (IB)",
        voorlopige_aanslag: "Voorlopige aanslag",
        toeslagen: "Toeslagen",
        mortgage: "Hipotecas",
        personal_loan: "Créditos personales",
        insurance: "Seguros",
      },
    },
    trust: ["Pensado para Países Bajos", "Nunca pedimos DigiD", "Revisión humana cuando sea necesario", "Privacidad tipo GDPR"],
    legal: { byUsing: "Al usar FinHub aceptas los", terms: "Términos", and: "y la", privacy: "Política de Privacidad" },
    footer: { note: "FinHub está en beta. El contenido puede cambiar." },
  },

  pl: {
    hero: {
      title: "Twoje finanse w Holandii, w Twoim języku.",
      subtitle:
        "Kontroluj pieniądze, sprawdzaj toeslagen, przesyłaj dokumenty i otrzymuj wsparcie — wszystko w jednym miejscu.",
      bullets: [
        "Zbudowane dla Holandii",
        "Nigdy nie prosimy o DigiD",
        "Pomoc ludzka w razie potrzeby",
        "Prywatność klasy GDPR",
      ],
      ctaPrimary: "Załóż darmowe konto",
      ctaSecondary: "Sprawdź toeslagen",
    },
    hub: {
      title: "FinHub Core: Finanse osobiste",
      subtitle: "Wszystko zaczyna się od klarowności. Z bazy finansów przechodzisz do potrzebnych procesów.",
      infoTitle: "Dlaczego taka struktura?",
      infoBody:
        "Finanse osobiste dają klarowność. Potem uruchamiasz tylko potrzebne procesy — podatki, toeslagen, hipoteki, pożyczki, ubezpieczenia.",
    },
    how: {
      title: "Jak to działa",
      steps: [
        { t: "1. Utwórz konto", d: "Start od podstaw — bez tarcia." },
        { t: "2. Powiedz nam o celach", d: "Pracownik, własny biznes czy jedno i drugie?" },
        { t: "3. Korzystaj z prowadzenia", d: "Krok po kroku. Dokumenty tylko gdy to konieczne." },
        { t: "4. Otrzymaj wynik", d: "Jasne następne kroki. W razie potrzeby — weryfikacja." },
      ],
    },
    pricing: {
      title: "Cennik",
      subtitle: "Zacznij za darmo.",
      tiers: [
        { t: "Za darmo", p: "€0", d: "Podstawowe zarządzanie pieniędzmi i dostęp w becie." },
        { t: "Premium", p: "Wkrótce", d: "Zaawansowane funkcje i dedykowane wsparcie człowieka." },
      ],
    },
    faq: {
      title: "FAQ",
      subtitle: "Szybkie odpowiedzi na typowe pytania.",
      items: [
        { q: "Czy potrzebujecie mojego DigiD?", a: "Nie, nigdy nie prosimy o DigiD." },
        { q: "Czy FinHub jest tylko dla migrantów?", a: "Projektowany dla migrantów w NL, ale każdy może skorzystać." },
        { q: "Czy muszę przesyłać dokumenty?", a: "Tylko gdy potrzeba. Celem jest mniej papierologii." },
        { q: "Czy jest wsparcie człowieka?", a: "Tak — gdy proces tego wymaga." },
      ],
    },
    lead: {
      title: "Otrzymuj aktualizacje (beta)",
      subtitle: "Zostaw dane i wybierz zainteresowania — ustalimy priorytety.",
      name: "Imię i nazwisko",
      email: "Email",
      phone: "Telefon (opcjonalnie)",
      interests: "Interesuje mnie",
      consent: "Zgadzam się na kontakt w sprawie aktualizacji i dostępu do bety FinHub.",
      submit: "Wyślij",
      successTitle: "Dziękujemy — jesteś na liście.",
      successBody: "Skontaktujemy się, gdy Twój proces będzie gotowy. Możesz też utworzyć konto.",
      fail: "Uzupełnij wymagane pola i wybierz min. 1 zainteresowanie.",
      ctaCreateAccount: "Utwórz konto",
      interestLabels: {
        personal_finance: "Finanse osobiste",
        taxes: "Podatki (IB)",
        voorlopige_aanslag: "Zaliczka podatkowa",
        toeslagen: "Toeslagen",
        mortgage: "Hipoteki",
        personal_loan: "Pożyczki",
        insurance: "Ubezpieczenia",
      },
    },
    trust: ["Zbudowane dla Holandii", "Nigdy nie prosimy o DigiD", "Pomoc ludzka w razie potrzeby", "Prywatność klasy GDPR"],
    legal: { byUsing: "Korzystając z FinHub akceptujesz", terms: "Warunki", and: "oraz", privacy: "Politykę prywatności" },
    footer: { note: "FinHub jest w becie. Treść może się zmieniać." },
  },

  ro: {
    hero: {
      title: "Finanțele tale în Olanda, în limba ta.",
      subtitle:
        "Controlează banii, verifică toeslagen, încarcă documente și primește asistență — totul într-un singur loc.",
      bullets: [
        "Construit pentru Olanda",
        "Nu cerem niciodată DigiD",
        "Verificare umană când e nevoie",
        "Confidențialitate la nivel GDPR",
      ],
      ctaPrimary: "Creează cont gratuit",
      ctaSecondary: "Verifică toeslagen",
    },
    hub: {
      title: "FinHub Core: Control finanțe personale",
      subtitle: "Totul începe cu claritate. Din nucleul financiar activezi fluxurile de care ai nevoie.",
      infoTitle: "De ce această structură?",
      infoBody:
        "Finanțele personale îți dau claritate. Apoi activezi doar fluxurile necesare — taxe, toeslagen, ipoteci, credite, asigurări.",
    },
    how: {
      title: "Cum funcționează",
      steps: [
        { t: "1. Creează un cont", d: "Începi cu esențialul, fără fricțiune." },
        { t: "2. Spune-ne obiectivele", d: "Ești angajat, antreprenor sau ambele?" },
        { t: "3. Urmează fluxurile", d: "Pas cu pas. Documente doar când e nevoie." },
        { t: "4. Primești un rezultat", d: "Pași următori clari. Revizuire umană când se aplică." },
      ],
    },
    pricing: {
      title: "Prețuri",
      subtitle: "Ușor de început gratuit.",
      tiers: [
        { t: "Gratuit", p: "€0", d: "Gestiunea bazală a banilor și acces beta." },
        { t: "Premium", p: "În curând", d: "Servicii avansate cu asistență dedicată umană." },
      ],
    },
    faq: {
      title: "FAQ",
      subtitle: "Răspunsuri rapide la întrebări comune.",
      items: [
        { q: "Aveți nevoie de DigiD-ul meu?", a: "Nu, nu cerem niciodată DigiD." },
        { q: "FinHub este doar pentru migranți?", a: "Este proiectat pentru migranți în NL, dar poate fi folosit de oricine." },
        { q: "Trebuie să încarc documente?", a: "Doar când este necesar. Scopul este să reducem birocrația." },
        { q: "Există suport uman?", a: "Da — când fluxul o cere." },
      ],
    },
    lead: {
      title: "Primește noutăți (beta)",
      subtitle: "Lasă datele și alege interesele — prioritizăm în funcție de cerere.",
      name: "Nume complet",
      email: "Email",
      phone: "Telefon (opțional)",
      interests: "Sunt interesat de",
      consent: "Sunt de acord să fiu contactat pentru actualizări și acces beta FinHub.",
      submit: "Trimite",
      successTitle: "Mulțumim — ești pe listă.",
      successBody: "Te contactăm când fluxul tău este gata. Poți crea cont acum.",
      fail: "Completează câmpurile obligatorii și alege cel puțin 1 interes.",
      ctaCreateAccount: "Creează cont",
      interestLabels: {
        personal_finance: "Control finanțe personale",
        taxes: "Taxe (IB)",
        voorlopige_aanslag: "Evaluare provizorie",
        toeslagen: "Toeslagen",
        mortgage: "Ipoteci",
        personal_loan: "Credite",
        insurance: "Asigurări",
      },
    },
    trust: ["Construit pentru Olanda", "Nu cerem niciodată DigiD", "Verificare umană când e nevoie", "Confidențialitate la nivel GDPR"],
    legal: { byUsing: "Folosind FinHub accepți", terms: "Termenii", and: "și", privacy: "Politica de confidențialitate" },
    footer: { note: "FinHub este în beta. Conținutul se poate schimba." },
  },
};

export default async function LandingPage() {
  const { locale } = await getI18nRequestContext();
  const lang: Lang = (["en", "es", "pl", "ro"] as const).includes(locale as Lang) ? (locale as Lang) : "en";
  const c = COPY[lang];

  return (
    <div className="min-h-screen bg-[#0D1B2A] text-gray-100 selection:bg-[#4CAF50] selection:text-[#0D1B2A]">
      <LandingNavbar />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* HERO */}
        <section className="py-20 md:py-32">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl">
              {c.hero.title}
            </h1>
            <p className="mt-6 text-xl text-gray-300">
              {c.hero.subtitle}
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/register"
                className="w-full sm:w-auto rounded-xl bg-[#4CAF50] px-8 py-4 text-lg font-bold text-[#0D1B2A] hover:bg-[#4CAF50]/90 transition-all shadow-[0_0_20px_rgba(76,175,80,0.3)] hover:shadow-[0_0_30px_rgba(76,175,80,0.5)]"
              >
                {c.hero.ctaPrimary}
              </Link>
              <Link
                href="/register?flow=toeslagen"
                className="w-full sm:w-auto rounded-xl border border-gray-600 bg-transparent px-8 py-4 text-lg font-bold text-white hover:bg-white/5 transition-all"
              >
                {c.hero.ctaSecondary}
              </Link>
            </div>

            <div className="mt-12 flex flex-wrap justify-center gap-x-8 gap-y-4 text-sm font-medium text-gray-400">
              {c.trust.map((badge) => (
                <div key={badge} className="flex items-center gap-2">
                  <span className="text-[#4CAF50]">✓</span>
                  {badge}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* VALUE PROPS */}
        <section id="product" className="py-16">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-white">Value Props</h2>
            <p className="mt-4 text-gray-400">Features designed for your financial success in the Netherlands.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              { img: "📊", t: "Toeslagen Guide", d: "Check your 2026 eligibility easily." },
              { img: "👛", t: "Personal Finance", d: "Track budgets and transactions." },
              { img: "📄", t: "Smart OCR", d: "Scan and extract document info automatically." },
              { img: "🤖", t: "Finny AI", d: "Your intelligent finance assistant (Coming soon)." },
              { img: "🌍", t: "Multi-Language", d: "Support for EN, ES, PL, RO." },
              { img: "🔒", t: "Secure & Private", d: "GDPR grade privacy built-in." }
            ].map((prop, idx) => (
              <div key={idx} className="group rounded-2xl border border-white/10 bg-white/5 p-6 hover:bg-white/10 transition-colors">
                <div className="mb-4 text-4xl">{prop.img}</div>
                <h3 className="mb-2 text-lg font-semibold text-white">{prop.t}</h3>
                <p className="text-sm text-gray-400 group-hover:text-gray-300">{prop.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" className="py-16">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-white">{c.how.title}</h2>
          </div>
          <div className="grid gap-8 md:grid-cols-4">
            {c.how.steps.map((s, i) => (
              <div key={i} className="relative rounded-2xl border border-gray-800 bg-white/5 p-6">
                <div className="mb-4 text-[#4CAF50] font-mono text-xl">{s.t.split('.')[0]}</div>
                <h3 className="mb-2 font-semibold text-white">{s.t.split('.')[1]}</h3>
                <p className="text-sm text-gray-400">{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* SOCIAL PROOF */}
        <section className="py-16 text-center">
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-[#4CAF50]/5 p-12">
            <h2 className="text-2xl font-bold text-white mb-4">Be the first to experience FinHub</h2>
            <p className="text-gray-300 mb-8 max-w-2xl mx-auto">
              We are currently in Early Access Beta. Join hundreds of other migrants in taking control of their finances in the Netherlands.
            </p>
            <Link
              href="/register"
              className="rounded-xl bg-white px-6 py-3 text-sm font-bold text-[#0D1B2A] hover:bg-gray-200 transition-all"
            >
              Join Early Access
            </Link>
          </div>
        </section>

        {/* PRICING */}
        <section id="pricing" className="py-16">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-white">{c.pricing.title}</h2>
            <p className="mt-4 text-gray-400">{c.pricing.subtitle}</p>
          </div>
          <div className="mx-auto max-w-4xl grid gap-8 md:grid-cols-2">
            {c.pricing.tiers.map((t, i) => (
              <div key={i} className={`rounded-3xl border border-white/10 p-8 flex flex-col ${i === 1 ? 'bg-gradient-to-b from-white/10 to-transparent' : 'bg-white/5'}`}>
                <h3 className="text-xl font-semibold text-white mb-2">{t.t}</h3>
                <p className="text-gray-400 mb-8 flex-1">{t.d}</p>
                <div className="text-3xl font-bold text-white mb-8">{t.p}</div>
                <Link
                  href="/register"
                  className={`text-center rounded-xl px-6 py-3 font-semibold transition-all ${i === 0 ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-[#4CAF50] text-[#0D1B2A] hover:bg-[#4CAF50]/90 shadow-[0_0_15px_rgba(76,175,80,0.3)]'}`}
                >
                  {i === 0 ? 'Get Started' : 'Join Waitlist'}
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="py-16">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-white">{c.faq.title}</h2>
            <p className="mt-4 text-gray-400">{c.faq.subtitle}</p>
          </div>
          <div className="mx-auto max-w-3xl space-y-4">
            {c.faq.items.map((it, i) => (
              <details key={i} className="group rounded-2xl border border-white/10 bg-white/5 p-6 open:bg-white/10 transition-colors cursor-pointer">
                <summary className="font-semibold text-white list-none flex justify-between items-center">
                  {it.q}
                  <span className="text-[#4CAF50] group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="mt-4 text-gray-400">{it.a}</div>
              </details>
            ))}
          </div>
        </section>

        {/* LEAD CAPTURE */}
        <section id="lead" className="py-16 mb-16">
          <div className="rounded-3xl border border-white/10 bg-gradient-to-r from-white/5 via-[#4CAF50]/10 to-white/5 p-1">
            <div className="rounded-[23px] bg-[#0D1B2A] p-8 md:p-12">
              <LandingLeadForm />
            </div>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="border-t border-white/10 px-4 py-8 text-center text-sm text-gray-500">
        <p className="mb-4">{c.legal.byUsing} <Link href="/terms" className="underline hover:text-white">{c.legal.terms}</Link> and <Link href="/privacy" className="underline hover:text-white">{c.legal.privacy}</Link>.</p>
        <p>© 2026 FinHub. All rights reserved.</p>
      </footer>
    </div>
  );
}
