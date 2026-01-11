export type NavItem = {
  href: string;
  label: string;
  section?: string;
  keywords?: string[];
};

export const DASHBOARD_NAV: NavItem[] = [
  { href: "/app/finances", label: "Finanzas", section: "Core", keywords: ["dashboard", "overview"] },
  { href: "/app/finances/transactions", label: "Transacciones", section: "Core", keywords: ["ledger", "inbox"] },
  { href: "/app/documents", label: "Documentos", section: "Operación", keywords: ["ocr", "vault"] },
  { href: "/app/cases", label: "Casos", section: "Operación", keywords: ["workflow"] },
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
  if (pathname.startsWith("/app/finances/transactions/new")) return { title: "Nueva transacción", subtitle: "Registro manual" };
  if (pathname.startsWith("/app/finances/transactions/")) return { title: "Detalle de transacción", subtitle: "Edición P0 + splits" };
  if (pathname.startsWith("/app/finances/transactions")) return { title: "Transacciones", subtitle: "Inbox + acciones rápidas" };
  if (pathname.startsWith("/app/documents")) return { title: "Documentos", subtitle: "Vault + OCR review" };
  if (pathname.startsWith("/app/cases")) return { title: "Casos", subtitle: "Flujos y etapas" };
  if (pathname.startsWith("/app/profile")) return { title: "Perfil", subtitle: "Cuenta y preferencias" };
  if (pathname.startsWith("/app/admin")) return { title: "Admin", subtitle: "Operación interna" };
  if (pathname.startsWith("/app")) return { title: "Dashboard", subtitle: "FinHub" };
  return { title: "Dashboard", subtitle: "FinHub" };
}