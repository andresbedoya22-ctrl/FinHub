import Link from "next/link";
import { Screen } from "@/ui/components/Screen";
import { Header } from "@/ui/components/Header";
import { Card } from "@/ui/components/Card";
import { InfoBox } from "@/ui/components/InfoBox";
import FinnyWidget from "@/features/assistant/finny/ui/FinnyWidget";
import { HubDiagram } from "./ui/HubDiagram";
import LandingLeadForm from "./ui/LandingLeadForm";

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
  nav: { privacy: string; terms: string; login: string; create: string };
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
  legal: { byUsing: string; terms: string; and: string; privacy: string };
  footer: { note: string };
};

function getLangFromHeaders(): Lang {
  // Fallback EN server-side. (En F01 ya tenemos i18n; aquí mantenemos simple y seguro.)
  return "en";
}

const COPY: Record<Lang, LandingCopy> = {
  en: {
    nav: { privacy: "Privacy", terms: "Terms", login: "Login", create: "Create account" },
    hero: {
      title: "One place to control your money in the Netherlands.",
      subtitle:
        "A finance hub for migrants: personal finance control + guided flows for taxes, toeslagen, loans, mortgages, and insurance.",
      bullets: [
        "Track income, bills, and goals in minutes.",
        "Guided flows for the moments that matter.",
        "Human review when it matters — beta-friendly.",
      ],
      ctaPrimary: "Create account",
      ctaSecondary: "Get updates",
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
        { t: "Create an account", d: "Start with the essentials — no friction." },
        { t: "Follow guided flows", d: "We guide you step-by-step. Upload documents only when needed." },
        { t: "Get an outcome", d: "Clear next steps. Human review when it matters." },
      ],
    },
    pricing: {
      title: "Pricing (Beta)",
      subtitle: "Beta is free while we validate product-market fit. Pricing will be announced later.",
      tiers: [
        { t: "Subscription", p: "€0", d: "Unlimited access during beta." },
        { t: "Pay-per-case", p: "€0", d: "Start a case and get guided support." },
      ],
    },
    faq: {
      title: "FAQ + Finny Lite",
      subtitle: "Quick answers + a lightweight assistant to help you navigate.",
      items: [
        { q: "Is FinHub only for migrants?", a: "FinHub is designed for migrants in NL, but anyone can benefit." },
        { q: "Do I need to upload documents?", a: "Only when needed. The goal is to reduce paperwork, not increase it." },
        { q: "Is there human support?", a: "Yes — human review is available when the flow requires it." },
        { q: "What areas does FinHub cover?", a: "Personal finance, taxes, toeslagen, mortgages, personal loans, insurance, and document flows." },
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
    legal: { byUsing: "By using FinHub you accept the", terms: "Terms", and: "and", privacy: "Privacy Policy" },
    footer: { note: "FinHub is in beta. Content may change." },
  },

  es: {
    nav: { privacy: "Privacidad", terms: "Términos", login: "Login", create: "Crear cuenta" },
    hero: {
      title: "Un solo lugar para controlar tus finanzas en Países Bajos.",
      subtitle:
        "Un hub financiero para migrantes: control de finanzas personales + flujos guiados para impuestos, toeslagen, créditos, hipotecas y seguros.",
      bullets: [
        "Controla ingresos, gastos y metas en minutos.",
        "Flujos guiados para lo que realmente importa.",
        "Revisión humana cuando aplica — en beta.",
      ],
      ctaPrimary: "Crear cuenta",
      ctaSecondary: "Recibir novedades",
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
        { t: "Crea una cuenta", d: "Empieza por lo esencial, sin fricción." },
        { t: "Sigue flujos guiados", d: "Te guiamos paso a paso. Solo subes documentos si hace falta." },
        { t: "Obtén un resultado", d: "Próximos pasos claros. Revisión humana cuando aplica." },
      ],
    },
    pricing: {
      title: "Precios (Beta)",
      subtitle: "La beta es gratis mientras validamos el producto. Los precios se anunciarán más adelante.",
      tiers: [
        { t: "Suscripción", p: "€0", d: "Acceso ilimitado durante beta." },
        { t: "Pago por caso", p: "€0", d: "Inicia un caso y recibe guía." },
      ],
    },
    faq: {
      title: "FAQ + Finny Lite",
      subtitle: "Respuestas rápidas + un asistente ligero para navegar FinHub.",
      items: [
        { q: "¿FinHub es solo para migrantes?", a: "Está diseñado para migrantes en NL, pero cualquiera puede beneficiarse." },
        { q: "¿Tengo que subir documentos?", a: "Solo cuando haga falta. La idea es reducir papeleo, no aumentarlo." },
        { q: "¿Hay soporte humano?", a: "Sí — hay revisión humana cuando el flujo lo requiere." },
        { q: "¿Qué cubre FinHub?", a: "Finanzas personales, impuestos, toeslagen, hipotecas, créditos personales, seguros y flujos de documentos." },
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
    legal: { byUsing: "Al usar FinHub aceptas los", terms: "Términos", and: "y la", privacy: "Política de Privacidad" },
    footer: { note: "FinHub está en beta. El contenido puede cambiar." },
  },

  pl: {
    nav: { privacy: "Prywatnosc", terms: "Warunki", login: "Login", create: "Utwórz konto" },
    hero: {
      title: "Jedno miejsce do kontroli finansów w Holandii.",
      subtitle:
        "Hub finansowy dla migrantów: finanse osobiste + prowadzone procesy: podatki, toeslagen, pozyczki, hipoteki i ubezpieczenia.",
      bullets: [
        "Kontroluj dochody, wydatki i cele w kilka minut.",
        "Prowadzone kroki, gdy to naprawde wazne.",
        "W razie potrzeby — weryfikacja przez czlowieka (beta).",
      ],
      ctaPrimary: "Utwórz konto",
      ctaSecondary: "Otrzymuj aktualizacje",
    },
    hub: {
      title: "FinHub Core: Finanse osobiste",
      subtitle: "Wszystko zaczyna sie od klarownosci. Z bazy finansów przechodzisz do potrzebnych procesów.",
      infoTitle: "Dlaczego taka struktura?",
      infoBody:
        "Finanse osobiste daja klarownosc. Potem uruchamiasz tylko potrzebne procesy — podatki, toeslagen, hipoteki, pozyczki, ubezpieczenia.",
    },
    how: {
      title: "Jak to dziala",
      steps: [
        { t: "Utwórz konto", d: "Start od podstaw — bez tarcia." },
        { t: "Korzystaj z prowadzenia", d: "Krok po kroku. Dokumenty tylko gdy to konieczne." },
        { t: "Otrzymaj wynik", d: "Jasne nastepne kroki. W razie potrzeby — weryfikacja." },
      ],
    },
    pricing: {
      title: "Cennik (Beta)",
      subtitle: "Beta jest darmowa, dopóki walidujemy produkt. Ceny pózniej.",
      tiers: [
        { t: "Subskrypcja", p: "€0", d: "Nielimitowany dostep w becie." },
        { t: "Oplata za sprawe", p: "€0", d: "Rozpocznij sprawe i otrzymaj prowadzenie." },
      ],
    },
    faq: {
      title: "FAQ + Finny Lite",
      subtitle: "Szybkie odpowiedzi + lekki asystent do nawigacji.",
      items: [
        { q: "Czy FinHub jest tylko dla migrantów?", a: "Projektowany dla migrantów w NL, ale kazdy moze skorzystac." },
        { q: "Czy musze przesylac dokumenty?", a: "Tylko gdy potrzeba. Celem jest mniej papierologii." },
        { q: "Czy jest wsparcie czlowieka?", a: "Tak — gdy proces tego wymaga." },
        { q: "Co obejmuje FinHub?", a: "Finanse osobiste, podatki, toeslagen, hipoteki, pozyczki, ubezpieczenia i dokumenty." },
      ],
    },
    lead: {
      title: "Otrzymuj aktualizacje (beta)",
      subtitle: "Zostaw dane i wybierz zainteresowania — ustalimy priorytety.",
      name: "Imie i nazwisko",
      email: "Email",
      phone: "Telefon (opcjonalnie)",
      interests: "Interesuje mnie",
      consent: "Zgadzam sie na kontakt w sprawie aktualizacji i dostepu do bety FinHub.",
      submit: "Wyslij",
      successTitle: "Dziekujemy — jestes na liscie.",
      successBody: "Skontaktujemy sie, gdy Twój proces bedzie gotowy. Mozesz tez utworzyc konto.",
      fail: "Uzupelnij wymagane pola i wybierz min. 1 zainteresowanie.",
      ctaCreateAccount: "Utwórz konto",
      interestLabels: {
        personal_finance: "Finanse osobiste",
        taxes: "Podatki (IB)",
        voorlopige_aanslag: "Zaliczka podatkowa",
        toeslagen: "Toeslagen",
        mortgage: "Hipoteki",
        personal_loan: "Pozyczki",
        insurance: "Ubezpieczenia",
      },
    },
    legal: { byUsing: "Korzystajac z FinHub akceptujesz", terms: "Warunki", and: "oraz", privacy: "Polityke prywatnosci" },
    footer: { note: "FinHub jest w becie. Tresc moze sie zmieniac." },
  },

  ro: {
    nav: { privacy: "Confidentialitate", terms: "Termeni", login: "Login", create: "Creeaza cont" },
    hero: {
      title: "Un singur loc pentru controlul finantelor în Olanda.",
      subtitle:
        "Hub financiar pentru migranti: finante personale + fluxuri ghidate pentru taxe, toeslagen, credite, ipoteci si asigurari.",
      bullets: [
        "Controlezi venituri, cheltuieli si obiective în minute.",
        "Fluxuri ghidate pentru momentele importante.",
        "Revizuire umana când este necesar (beta).",
      ],
      ctaPrimary: "Creeaza cont",
      ctaSecondary: "Primeste noutati",
    },
    hub: {
      title: "FinHub Core: Control finante personale",
      subtitle: "Totul începe cu claritate. Din nucleul financiar activezi fluxurile de care ai nevoie.",
      infoTitle: "De ce aceasta structura?",
      infoBody:
        "Finantele personale îti dau claritate. Apoi activezi doar fluxurile necesare — taxe, toeslagen, ipoteci, credite, asigurari.",
    },
    how: {
      title: "Cum functioneaza",
      steps: [
        { t: "Creeaza un cont", d: "Începi cu esentialul, fara frictiune." },
        { t: "Urmeaza fluxurile ghidate", d: "Pas cu pas. Documente doar când e nevoie." },
        { t: "Primesti un rezultat", d: "Pasi urmatori clari. Revizuire umana când aplica." },
      ],
    },
    pricing: {
      title: "Preturi (Beta)",
      subtitle: "Beta este gratuita cât timp validam produsul. Preturile vor fi anuntate ulterior.",
      tiers: [
        { t: "Abonament", p: "€0", d: "Acces nelimitat în beta." },
        { t: "Plata per caz", p: "€0", d: "Pornesti un caz si primesti ghidare." },
      ],
    },
    faq: {
      title: "FAQ + Finny Lite",
      subtitle: "Raspunsuri rapide + un asistent usor pentru navigare.",
      items: [
        { q: "FinHub este doar pentru migranti?", a: "Este proiectat pentru migranti în NL, dar poate fi folosit de oricine." },
        { q: "Trebuie sa încarc documente?", a: "Doar când este necesar. Scopul este sa reducem birocratia." },
        { q: "Exista suport uman?", a: "Da — când fluxul o cere." },
        { q: "Ce acopera FinHub?", a: "Finante personale, taxe, toeslagen, ipoteci, credite, asigurari si documente." },
      ],
    },
    lead: {
      title: "Primeste noutati (beta)",
      subtitle: "Lasa datele si alege interesele — prioritizam în functie de cerere.",
      name: "Nume complet",
      email: "Email",
      phone: "Telefon (optional)",
      interests: "Sunt interesat de",
      consent: "Sunt de acord sa fiu contactat pentru actualizari si acces beta FinHub.",
      submit: "Trimite",
      successTitle: "Multumim — esti pe lista.",
      successBody: "Te contactam când fluxul tau este gata. Poti crea cont acum.",
      fail: "Completeaza câmpurile obligatorii si alege cel putin 1 interes.",
      ctaCreateAccount: "Creeaza cont",
      interestLabels: {
        personal_finance: "Control finante personale",
        taxes: "Taxe (IB)",
        voorlopige_aanslag: "Evaluare provizorie",
        toeslagen: "Toeslagen",
        mortgage: "Ipoteci",
        personal_loan: "Credite",
        insurance: "Asigurari",
      },
    },
    legal: { byUsing: "Folosind FinHub accepti", terms: "Termenii", and: "si", privacy: "Politica de confidentialitate" },
    footer: { note: "FinHub este în beta. Continutul se poate schimba." },
  },
};

export default function LandingPage() {
  const lang = getLangFromHeaders();
  const c = COPY[lang];

  return (
    <Screen className="space-y-8">
      <Header
        title="FinHub"
        subtitle={c.hero.subtitle}
        right={
          <div className="flex items-center gap-3">
            <Link href="/privacy" className="text-sm underline opacity-80 hover:opacity-100">
              {c.nav.privacy}
            </Link>
            <Link href="/terms" className="text-sm underline opacity-80 hover:opacity-100">
              {c.nav.terms}
            </Link>
            <Link
              href="/register"
              className="rounded-xl border border-fh-border bg-fh-primary px-3 py-2 text-sm text-fh-primaryFg hover:opacity-90"
            >
              {c.nav.create}
            </Link>
          </div>
        }
      />

      <Card className="overflow-hidden">
        <div className="grid gap-6 p-6 md:grid-cols-2 md:items-center">
          <div className="space-y-4">
            <h1 className="text-2xl md:text-4xl font-semibold tracking-tight">{c.hero.title}</h1>

            <ul className="space-y-2 text-sm opacity-85">
              {c.hero.bullets.map((b) => (
                <li key={b} className="flex gap-2">
                  <span className="mt-1 inline-block h-2 w-2 rounded-full bg-[#4CAF50]" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap gap-3 pt-2">
              <Link href="/register" className="rounded-xl bg-[#0D1B2A] px-4 py-2 text-sm text-white hover:opacity-95">
                {c.hero.ctaPrimary}
              </Link>
              <a href="#lead" className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50">
                {c.hero.ctaSecondary}
              </a>
            </div>

            <div className="text-xs opacity-60">{c.footer.note}</div>
          </div>

          <div className="rounded-2xl border bg-white p-3">
            <HubDiagram />
          </div>
        </div>
      </Card>

      <Card className="space-y-2">
        <div className="text-xl font-semibold">{c.hub.title}</div>
        <div className="text-sm opacity-75">{c.hub.subtitle}</div>
        <InfoBox title={c.hub.infoTitle} variant="info">
          {c.hub.infoBody}
        </InfoBox>
      </Card>

      <Card className="space-y-4">
        <div className="text-xl font-semibold">{c.how.title}</div>
        <div className="grid gap-3 md:grid-cols-3">
          {c.how.steps.map((s) => (
            <div key={s.t} className="rounded-2xl border bg-white p-4">
              <div className="font-semibold">{s.t}</div>
              <div className="text-sm opacity-75 mt-1">{s.d}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="space-y-4">
        <div className="text-xl font-semibold">{c.pricing.title}</div>
        <div className="text-sm opacity-75">{c.pricing.subtitle}</div>
        <div className="grid gap-3 md:grid-cols-2">
          {c.pricing.tiers.map((t) => (
            <div key={t.t} className="rounded-2xl border bg-white p-5 flex items-center justify-between">
              <div>
                <div className="font-semibold">{t.t}</div>
                <div className="text-sm opacity-75">{t.d}</div>
              </div>
              <div className="text-2xl font-semibold">{t.p}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="space-y-4">
        <div className="text-xl font-semibold">{c.faq.title}</div>
        <div className="text-sm opacity-75">{c.faq.subtitle}</div>
        <div className="grid gap-3 md:grid-cols-2">
          {c.faq.items.map((it) => (
            <div key={it.q} className="rounded-2xl border bg-white p-4">
              <div className="font-semibold">{it.q}</div>
              <div className="text-sm opacity-75 mt-1">{it.a}</div>
            </div>
          ))}
        </div>
      </Card>

      <div id="lead" className="scroll-mt-20">
        <LandingLeadForm strings={c.lead} />
      </div>

      <div className="text-xs opacity-70">
        {c.legal.byUsing}{" "}
        <Link className="underline" href="/terms">
          {c.legal.terms}
        </Link>{" "}
        {c.legal.and}{" "}
        <Link className="underline" href="/privacy">
          {c.legal.privacy}
        </Link>
        .
      </div>

      <FinnyWidget />
    </Screen>
  );
}
