export type Breadcrumb = { label: string; href?: string };

export type RouteMeta = {
  section?: string;
  title: string;
  crumbs: Breadcrumb[];
};

function isPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(prefix + "/");
}

export function getRouteMeta(pathname: string): RouteMeta {
  // Finances
  if (isPrefix(pathname, "/app/finances/transactions/new")) {
    return {
      section: "Finanzas",
      title: "Nueva transacción",
      crumbs: [
        { label: "Finanzas", href: "/app/finances" },
        { label: "Transacciones", href: "/app/finances/transactions" },
        { label: "Nueva" },
      ],
    };
  }

  if (pathname.startsWith("/app/finances/transactions/")) {
    return {
      section: "Finanzas",
      title: "Detalle de transacción",
      crumbs: [
        { label: "Finanzas", href: "/app/finances" },
        { label: "Transacciones", href: "/app/finances/transactions" },
        { label: "Detalle" },
      ],
    };
  }

  if (isPrefix(pathname, "/app/finances/transactions")) {
    return {
      section: "Finanzas",
      title: "Transacciones",
      crumbs: [
        { label: "Finanzas", href: "/app/finances" },
        { label: "Transacciones" },
      ],
    };
  }

  if (isPrefix(pathname, "/app/finances")) {
    return {
      section: "Finanzas",
      title: "Finanzas",
      crumbs: [{ label: "Finanzas" }],
    };
  }

  // Documents
  if (pathname.startsWith("/app/documents/ocr-review/")) {
    return {
      section: "Documentos",
      title: "OCR review",
      crumbs: [
        { label: "Documentos", href: "/app/documents" },
        { label: "OCR review" },
      ],
    };
  }

  if (isPrefix(pathname, "/app/documents/ocr-review")) {
    return {
      section: "Documentos",
      title: "OCR review",
      crumbs: [{ label: "Documentos", href: "/app/documents" }, { label: "OCR review" }],
    };
  }

  if (isPrefix(pathname, "/app/documents")) {
    return {
      section: "Documentos",
      title: "Documentos",
      crumbs: [{ label: "Documentos" }],
    };
  }

  // Cases
  if (pathname.startsWith("/app/cases/new")) {
    return {
      section: "Casos",
      title: "Nuevo caso",
      crumbs: [{ label: "Casos", href: "/app/cases" }, { label: "Nuevo" }],
    };
  }

  if (pathname.startsWith("/app/cases/")) {
    return {
      section: "Casos",
      title: "Detalle de caso",
      crumbs: [{ label: "Casos", href: "/app/cases" }, { label: "Detalle" }],
    };
  }

  if (isPrefix(pathname, "/app/cases")) {
    return {
      section: "Casos",
      title: "Casos",
      crumbs: [{ label: "Casos" }],
    };
  }

  // Profile
  if (isPrefix(pathname, "/app/profile")) {
    return {
      section: "Cuenta",
      title: "Perfil",
      crumbs: [{ label: "Perfil" }],
    };
  }

  // Admin
  if (isPrefix(pathname, "/app/admin")) {
    return {
      section: "Admin",
      title: "Admin",
      crumbs: [{ label: "Admin" }],
    };
  }

  // Fallback
  return {
    title: "Dashboard",
    crumbs: [{ label: "Dashboard" }],
  };
}