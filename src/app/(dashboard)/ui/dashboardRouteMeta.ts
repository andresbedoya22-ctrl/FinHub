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

function byPathname(pathname: string, shellT: TranslateFn, subsT: TranslateFn): RouteMeta {
  if (!pathname.startsWith("/app")) {
    return mk(shellT("route.dashboard"), [{ href: "/app/finances", label: shellT("route.finances") }]);
  }

  // Finanzas
  if (pathname === "/app/finances") {
    return mk(shellT("route.finances"), [{ href: "/app/finances", label: shellT("route.finances") }]);
  }

  if (pathname === "/app/finances/transactions") {
    return mk(shellT("route.transactions"), [
      { href: "/app/finances", label: shellT("route.finances") },
      { href: "/app/finances/transactions", label: shellT("route.transactions") },
    ]);
  }

  if (pathname === "/app/finances/transactions/new") {
    return mk(shellT("route.newTransaction"), [
      { href: "/app/finances", label: shellT("route.finances") },
      { href: "/app/finances/transactions", label: shellT("route.transactions") },
      { href: "/app/finances/transactions/new", label: shellT("route.new") },
    ]);
  }

  if (pathname.startsWith("/app/finances/transactions/")) {
    return mk(shellT("route.transactionDetail"), [
      { href: "/app/finances", label: shellT("route.finances") },
      { href: "/app/finances/transactions", label: shellT("route.transactions") },
      { href: pathname, label: shellT("route.detail") },
    ]);
  }

  // Subsidios
  if (pathname === "/app/subsidies") {
    return mk(shellT("route.subsidies"), [
      { href: "/app/finances", label: shellT("route.finances") },
      { href: "/app/subsidies", label: shellT("route.subsidies") },
    ]);
  }

  if (pathname === "/app/subsidies/applications") {
    return mk(shellT("route.subsidyApplications"), [
      { href: "/app/finances", label: shellT("route.finances") },
      { href: "/app/subsidies", label: shellT("route.subsidies") },
      { href: "/app/subsidies/applications", label: shellT("route.subsidyApplications") },
    ]);
  }

  if (pathname.startsWith("/app/subsidies/applications/")) {
    return mk(shellT("route.subsidyApplications"), [
      { href: "/app/finances", label: shellT("route.finances") },
      { href: "/app/subsidies", label: shellT("route.subsidies") },
      { href: "/app/subsidies/applications", label: shellT("route.subsidyApplications") },
      { href: pathname, label: shellT("route.detail") },
    ]);
  }

  const subsidyMatch = pathname.match(/^\/app\/subsidies\/([^/]+)(?:\/(wizard|result|checkout))?$/);
  const subsidySlug = subsidyMatch?.[1];
  if (subsidySlug) {
    const subsidy = getSubsidyBySlug(subsidySlug);
    if (subsidy) {
      const subsidyLabel = subsT(subsidy.catalog.titleKey);
      const baseBreadcrumbs = [
        { href: "/app/finances", label: shellT("route.finances") },
        { href: "/app/subsidies", label: shellT("route.subsidies") },
        { href: `/app/subsidies/${subsidy.slug}`, label: subsidyLabel },
      ];

      const step = subsidyMatch?.[2];
      if (!step) {
        return mk(subsidyLabel, baseBreadcrumbs);
      }

      if (step === "wizard") {
        return mk(shellT("route.subsidyWizard"), [
          ...baseBreadcrumbs,
          { href: pathname, label: shellT("route.subsidyWizard") },
        ]);
      }

      if (step === "result") {
        return mk(shellT("route.subsidyResult"), [
          ...baseBreadcrumbs,
          { href: pathname, label: shellT("route.subsidyResult") },
        ]);
      }

      if (step === "checkout") {
        return mk(shellT("route.subsidyCheckout"), [
          ...baseBreadcrumbs,
          { href: pathname, label: shellT("route.subsidyCheckout") },
        ]);
      }
    }
  }

  if (pathname.startsWith("/app/subsidies/")) {
    return mk(shellT("route.subsidyDetail"), [
      { href: "/app/finances", label: shellT("route.finances") },
      { href: "/app/subsidies", label: shellT("route.subsidies") },
      { href: pathname, label: shellT("route.detail") },
    ]);
  }

  // Taxes + Leadgen verticales
  if (pathname === "/app/taxes") {
    return mk(shellT("route.taxes"), [
      { href: "/app/finances", label: shellT("route.finances") },
      { href: "/app/taxes", label: shellT("route.taxes") },
    ]);
  }

  if (pathname === "/app/mortgage") {
    return mk(shellT("route.mortgage"), [
      { href: "/app/finances", label: shellT("route.finances") },
      { href: "/app/mortgage", label: shellT("route.mortgage") },
    ]);
  }

  if (pathname === "/app/credit") {
    return mk(shellT("route.credit"), [
      { href: "/app/finances", label: shellT("route.finances") },
      { href: "/app/credit", label: shellT("route.credit") },
    ]);
  }

  if (pathname === "/app/insurance") {
    return mk(shellT("route.insurance"), [
      { href: "/app/finances", label: shellT("route.finances") },
      { href: "/app/insurance", label: shellT("route.insurance") },
    ]);
  }

  if (pathname.startsWith("/app/insurance/")) {
    return mk(shellT("route.insurance"), [
      { href: "/app/finances", label: shellT("route.finances") },
      { href: "/app/insurance", label: shellT("route.insurance") },
      { href: pathname, label: shellT("route.detail") },
    ]);
  }

  // Documentos
  if (pathname === "/app/documents") {
    return mk(shellT("route.documents"), [
      { href: "/app/finances", label: shellT("route.finances") },
      { href: "/app/documents", label: shellT("route.documents") },
    ]);
  }

  if (pathname.startsWith("/app/documents/")) {
    return mk(shellT("route.documents"), [
      { href: "/app/finances", label: shellT("route.finances") },
      { href: "/app/documents", label: shellT("route.documents") },
      { href: pathname, label: shellT("route.detail") },
    ]);
  }

  // Casos
  if (pathname === "/app/cases") {
    return mk(shellT("route.cases"), [
      { href: "/app/finances", label: shellT("route.finances") },
      { href: "/app/cases", label: shellT("route.cases") },
    ]);
  }

  if (pathname.startsWith("/app/cases/")) {
    return mk(shellT("route.case"), [
      { href: "/app/finances", label: shellT("route.finances") },
      { href: "/app/cases", label: shellT("route.cases") },
      { href: pathname, label: shellT("route.detail") },
    ]);
  }

  // Perfil / Admin
  if (pathname === "/app/profile") {
    return mk(shellT("route.profile"), [
      { href: "/app/finances", label: shellT("route.finances") },
      { href: "/app/profile", label: shellT("route.profile") },
    ]);
  }

  if (pathname === "/app/admin") {
    return mk(shellT("route.admin"), [
      { href: "/app/finances", label: shellT("route.finances") },
      { href: "/app/admin", label: shellT("route.admin") },
    ]);
  }

  if (pathname.startsWith("/app/admin/")) {
    return mk(shellT("route.admin"), [
      { href: "/app/finances", label: shellT("route.finances") },
      { href: "/app/admin", label: shellT("route.admin") },
      { href: pathname, label: shellT("route.detail") },
    ]);
  }

  return mk(shellT("route.dashboard"), [{ href: "/app/finances", label: shellT("route.finances") }]);
}

export function getDashboardRouteMeta(pathname: string, shellT: TranslateFn, subsT: TranslateFn): RouteMeta {
  return byPathname(pathname, shellT, subsT);
}

// Alias defensivo por compatibilidad
export function getRouteMeta(pathname: string, shellT: TranslateFn, subsT: TranslateFn): RouteMeta {
  return byPathname(pathname, shellT, subsT);
}
