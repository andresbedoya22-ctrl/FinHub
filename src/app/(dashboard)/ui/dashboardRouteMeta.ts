export type Breadcrumb = { href: string; label: string };

export type RouteMeta = {
  title: string;
  breadcrumbs: Breadcrumb[];
};

function mk(title: string, breadcrumbs: Breadcrumb[]): RouteMeta {
  return { title, breadcrumbs };
}

function byPathname(pathname: string): RouteMeta {
  if (!pathname.startsWith("/app")) {
    return mk("Dashboard", [{ href: "/app/finances", label: "Finanzas" }]);
  }

  // Finanzas
  if (pathname === "/app/finances") {
    return mk("Finanzas", [{ href: "/app/finances", label: "Finanzas" }]);
  }

  if (pathname === "/app/finances/transactions") {
    return mk("Transacciones", [
      { href: "/app/finances", label: "Finanzas" },
      { href: "/app/finances/transactions", label: "Transacciones" },
    ]);
  }

  if (pathname === "/app/finances/transactions/new") {
    return mk("Nueva transacción", [
      { href: "/app/finances", label: "Finanzas" },
      { href: "/app/finances/transactions", label: "Transacciones" },
      { href: "/app/finances/transactions/new", label: "Nueva" },
    ]);
  }

  if (pathname.startsWith("/app/finances/transactions/")) {
    return mk("Detalle de transacción", [
      { href: "/app/finances", label: "Finanzas" },
      { href: "/app/finances/transactions", label: "Transacciones" },
      { href: pathname, label: "Detalle" },
    ]);
  }

  // Documentos
  if (pathname === "/app/documents") {
    return mk("Documentos", [
      { href: "/app/finances", label: "Finanzas" },
      { href: "/app/documents", label: "Documentos" },
    ]);
  }

  if (pathname.startsWith("/app/documents/")) {
    return mk("Documentos", [
      { href: "/app/finances", label: "Finanzas" },
      { href: "/app/documents", label: "Documentos" },
      { href: pathname, label: "Detalle" },
    ]);
  }

  // Casos
  if (pathname === "/app/cases") {
    return mk("Casos", [
      { href: "/app/finances", label: "Finanzas" },
      { href: "/app/cases", label: "Casos" },
    ]);
  }

  if (pathname.startsWith("/app/cases/")) {
    return mk("Caso", [
      { href: "/app/finances", label: "Finanzas" },
      { href: "/app/cases", label: "Casos" },
      { href: pathname, label: "Detalle" },
    ]);
  }

  // Perfil / Admin
  if (pathname === "/app/profile") {
    return mk("Perfil", [
      { href: "/app/finances", label: "Finanzas" },
      { href: "/app/profile", label: "Perfil" },
    ]);
  }

  if (pathname === "/app/admin") {
    return mk("Admin", [
      { href: "/app/finances", label: "Finanzas" },
      { href: "/app/admin", label: "Admin" },
    ]);
  }

  if (pathname.startsWith("/app/admin/")) {
    return mk("Admin", [
      { href: "/app/finances", label: "Finanzas" },
      { href: "/app/admin", label: "Admin" },
      { href: pathname, label: "Detalle" },
    ]);
  }

  return mk("Dashboard", [{ href: "/app/finances", label: "Finanzas" }]);
}

export function getDashboardRouteMeta(pathname: string): RouteMeta {
  return byPathname(pathname);
}

// Alias defensivo por compatibilidad
export function getRouteMeta(pathname: string): RouteMeta {
  return byPathname(pathname);
}