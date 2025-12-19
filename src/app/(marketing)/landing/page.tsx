import Link from "next/link";

export default function Landing() {
  return (
    <main className="min-h-screen p-6">
      <h1 className="text-2xl font-semibold">Landing (placeholder)</h1>
      <p className="mt-2 max-w-prose">
        En Fase 2 se define el contenido completo (propuesta de valor, pricing, FAQs, etc.).
      </p>
      <div className="mt-6">
        <Link className="underline" href="/login">Ir a Login</Link>
      </div>
    </main>
  );
}
