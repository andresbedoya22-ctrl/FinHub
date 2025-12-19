import Link from "next/link";

export default function Login() {
  return (
    <main className="min-h-screen p-6">
      <h1 className="text-2xl font-semibold">Login (placeholder)</h1>
      <p className="mt-2 max-w-prose">Se implementa Auth real en Sprint 1 (fase siguiente).</p>
      <div className="mt-6">
        <Link className="underline" href="/app">Ir al Dashboard</Link>
      </div>
    </main>
  );
}
