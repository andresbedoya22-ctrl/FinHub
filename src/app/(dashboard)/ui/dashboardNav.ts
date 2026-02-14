export type NavItem = {
  href: string;
  label: string;
  section?: string;
  keywords?: string[];
};

export const DASHBOARD_NAV: NavItem[] = [
  { href: "/app/finances", label: "Finanzas", section: "Core", keywords: ["dashboard", "overview"] },
  { href: "/app/finances/transactions", label: "Transacciones", section: "Core", keywords: ["ledger", "inbox"] },
  { href: "/app/taxes", label: "Taxes Pro", section: "Core", keywords: ["tax", "belasting"] },
  { href: "/app/documents", label: "Documentos", section: "Operacion", keywords: ["ocr", "vault"] },
  { href: "/app/cases", label: "Casos", section: "Operacion", keywords: ["workflow"] },
  { href: "/app/mortgage", label: "Mortgage", section: "LeadGen", keywords: ["home", "loan"] },
  { href: "/app/credit", label: "Credit", section: "LeadGen", keywords: ["loan", "credit"] },
  { href: "/app/insurance", label: "Insurance", section: "LeadGen", keywords: ["policy", "risk"] },
  { href: "/app/profile", label: "Perfil", section: "Cuenta", keywords: ["account", "settings"] },
  { href: "/app/admin", label: "Admin", section: "Admin", keywords: ["users", "ops"] },
];

export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/app") return pathname === "/app";
  if (href === "/app/finances") return pathname === "/app/finances" || pathname.startsWith("/app/finances/");
  return pathname === href || pathname.startsWith(href + "/");
}

export type HeaderMeta = {
  title: string;
  subtitle?: string;
};

export function getHeaderMeta(pathname: string): HeaderMeta {
  if (pathname === "/app/finances") return { title: "Finanzas", subtitle: "Command center" };
  if (pathname.startsWith("/app/finances/transactions/new")) return { title: "Nueva transaccion", subtitle: "Registro manual" };
  if (pathname.startsWith("/app/finances/transactions/")) return { title: "Detalle de transaccion", subtitle: "Edicion P0 + splits" };
  if (pathname.startsWith("/app/finances/transactions")) return { title: "Transacciones", subtitle: "Inbox + acciones rapidas" };
  if (pathname.startsWith("/app/taxes")) return { title: "Taxes Pro", subtitle: "Intake + checklist + autorizacion" };
  if (pathname.startsWith("/app/documents")) return { title: "Documentos", subtitle: "Vault + OCR review" };
  if (pathname.startsWith("/app/cases")) return { title: "Casos", subtitle: "Flujos y etapas" };
  if (pathname.startsWith("/app/mortgage")) return { title: "Mortgage", subtitle: "Lead intake v1" };
  if (pathname.startsWith("/app/credit")) return { title: "Credit", subtitle: "Lead intake v1" };
  if (pathname.startsWith("/app/insurance")) return { title: "Insurance", subtitle: "Lead intake v1" };
  if (pathname.startsWith("/app/profile")) return { title: "Perfil", subtitle: "Cuenta y preferencias" };
  if (pathname.startsWith("/app/admin")) return { title: "Admin", subtitle: "Operacion interna" };
  if (pathname.startsWith("/app")) return { title: "Dashboard", subtitle: "FinHub" };
  return { title: "Dashboard", subtitle: "FinHub" };
}
