import Link from "next/link";

const navItems = [
  { href: "/app", label: "Inicio" },
  { href: "/app/documents", label: "Documentos" },
  { href: "/app/profile", label: "Perfil" },
  { href: "/app/ui-kit", label: "UI Kit" },
];

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm hover:bg-fh-surface-2"
    >
      {label}
    </Link>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-fh-bg">
      {/* Topbar */}
      <header className="sticky top-0 z-10 border-b border-fh-border bg-fh-bg/90 backdrop-blur">
        <div className="fh-container flex items-center justify-between gap-4">
          <Link href="/app" className="text-sm font-semibold tracking-tight">
            FinHub
          </Link>

          <nav className="hidden md:flex items-center gap-2">
            {navItems.map((it) => (
              <NavLink key={it.href} href={it.href} label={it.label} />
            ))}
          </nav>

          {/* Mobile quick access */}
          <div className="md:hidden flex items-center gap-2">
            <NavLink href="/app/profile" label="Perfil" />
          </div>
        </div>

        {/* Mobile nav row */}
        <div className="md:hidden border-t border-fh-border">
          <div className="fh-container flex items-center gap-2 overflow-x-auto py-3">
            {navItems.map((it) => (
              <NavLink key={it.href} href={it.href} label={it.label} />
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="fh-container py-6">{children}</div>
    </div>
  );
}
