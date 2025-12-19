import Link from "next/link";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b p-4">
        <nav className="flex items-center gap-4">
          <Link className="font-semibold" href="/app">FinHub</Link>
          <Link className="underline" href="/app/documents">Documents</Link>
          <Link className="underline" href="/app/profile">Profile</Link>
        </nav>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
