import { getSubsidyBySlug } from "@/domain/subsidies/registry";

export type Breadcrumb = { href: string; label: string };

export type RouteMeta = {
  title: string;
  breadcrumbs: Breadcrumb[];
};

type TranslateFn = (key: string) => string;

function mk(title: string, breadcrumbs: Breadcrumb[]): RouteMeta {
  return { title, breadcrumbs };
}

function byPathname(pathname: string, t: TranslateFn): RouteMeta {
  if (!pathname.startsWith("/app")) {
    return mk(t("route.dashboard"), [{ href: "/app/finances", label: t("route.finances") }]);
  }

  // Finanzas
  if (pathname === "/app/finances") {
    return mk(t("route.finances"), [{ href: "/app/finances", label: t("route.finances") }]);
  }

  if (pathname === "/app/finances/transactions") {
    return mk(t("route.transactions"), [
      { href: "/app/finances", label: t("route.finances") },
      { href: "/app/finances/transactions", label: t("route.transactions") },
    ]);
  }

  if (pathname === "/app/finances/transactions/new") {
    return mk(t("route.newTransaction"), [
      { href: "/app/finances", label: t("route.finances") },
      { href: "/app/finances/transactions", label: t("route.transactions") },
      { href: "/app/finances/transactions/new", label: t("route.new") },
    ]);
  }

  if (pathname.startsWith("/app/finances/transactions/")) {
    return mk(t("route.transactionDetail"), [
      { href: "/app/finances", label: t("route.finances") },
      { href: "/app/finances/transactions", label: t("route.transactions") },
      { href: pathname, label: t("route.detail") },
    ]);
  }

  // Subsidios
  if (pathname === "/app/subsidies") {
    return mk(t("route.subsidies"), [
      { href: "/app/finances", label: t("route.finances") },
      { href: "/app/subsidies", label: t("route.subsidies") },
    ]);
  }

  if (pathname === "/app/subsidies/applications") {
    return mk(t("route.subsidyApplications"), [
      { href: "/app/finances", label: t("route.finances") },
      { href: "/app/subsidies", label: t("route.subsidies") },
      { href: "/app/subsidies/applications", label: t("route.subsidyApplications") },
    ]);
  }

  if (pathname.startsWith("/app/subsidies/applications/")) {
    return mk(t("route.subsidyApplications"), [
      { href: "/app/finances", label: t("route.finances") },
      { href: "/app/subsidies", label: t("route.subsidies") },
      { href: "/app/subsidies/applications", label: t("route.subsidyApplications") },
      { href: pathname, label: t("route.detail") },
    ]);
  }

  const subsidyMatch = pathname.match(/^\/app\/subsidies\/([^/]+)(?:\/(wizard|result|checkout))?$/);
  const subsidySlug = subsidyMatch?.[1];
  if (subsidySlug) {
    const subsidy = getSubsidyBySlug(subsidySlug);
    if (subsidy) {
      const subsidyLabel = t(subsidy.catalog.titleKey);
      const baseBreadcrumbs = [
        { href: "/app/finances", label: t("route.finances") },
        { href: "/app/subsidies", label: t("route.subsidies") },
        { href: `/app/subsidies/${subsidy.slug}`, label: subsidyLabel },
      ];

      const step = subsidyMatch?.[2];
      if (!step) {
        return mk(subsidyLabel, baseBreadcrumbs);
      }

      if (step === "wizard") {
        return mk(t("route.subsidyWizard"), [
          ...baseBreadcrumbs,
          { href: pathname, label: t("route.subsidyWizard") },
        ]);
      }

      if (step === "result") {
        return mk(t("route.subsidyResult"), [
          ...baseBreadcrumbs,
          { href: pathname, label: t("route.subsidyResult") },
        ]);
      }

      if (step === "checkout") {
        return mk(t("route.subsidyCheckout"), [
          ...baseBreadcrumbs,
          { href: pathname, label: t("route.subsidyCheckout") },
        ]);
      }
    }
  }

  if (pathname.startsWith("/app/subsidies/")) {
    return mk(t("route.subsidyDetail"), [
      { href: "/app/finances", label: t("route.finances") },
      { href: "/app/subsidies", label: t("route.subsidies") },
      { href: pathname, label: t("route.detail") },
    ]);
  }

  // Documentos
  if (pathname === "/app/documents") {
    return mk(t("route.documents"), [
      { href: "/app/finances", label: t("route.finances") },
      { href: "/app/documents", label: t("route.documents") },
    ]);
  }

  if (pathname.startsWith("/app/documents/")) {
    return mk(t("route.documents"), [
      { href: "/app/finances", label: t("route.finances") },
      { href: "/app/documents", label: t("route.documents") },
      { href: pathname, label: t("route.detail") },
    ]);
  }

  // Casos
  if (pathname === "/app/cases") {
    return mk(t("route.cases"), [
      { href: "/app/finances", label: t("route.finances") },
      { href: "/app/cases", label: t("route.cases") },
    ]);
  }

  if (pathname.startsWith("/app/cases/")) {
    return mk(t("route.case"), [
      { href: "/app/finances", label: t("route.finances") },
      { href: "/app/cases", label: t("route.cases") },
      { href: pathname, label: t("route.detail") },
    ]);
  }

  // Perfil / Admin
  if (pathname === "/app/profile") {
    return mk(t("route.profile"), [
      { href: "/app/finances", label: t("route.finances") },
      { href: "/app/profile", label: t("route.profile") },
    ]);
  }

  if (pathname === "/app/admin") {
    return mk(t("route.admin"), [
      { href: "/app/finances", label: t("route.finances") },
      { href: "/app/admin", label: t("route.admin") },
    ]);
  }

  if (pathname.startsWith("/app/admin/")) {
    return mk(t("route.admin"), [
      { href: "/app/finances", label: t("route.finances") },
      { href: "/app/admin", label: t("route.admin") },
      { href: pathname, label: t("route.detail") },
    ]);
  }

  return mk(t("route.dashboard"), [{ href: "/app/finances", label: t("route.finances") }]);
}

export function getDashboardRouteMeta(pathname: string, t: TranslateFn): RouteMeta {
  return byPathname(pathname, t);
}

// Alias defensivo por compatibilidad
export function getRouteMeta(pathname: string, t: TranslateFn): RouteMeta {
  return byPathname(pathname, t);
}
