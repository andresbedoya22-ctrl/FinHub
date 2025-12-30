import { NextRequest, NextResponse } from "next/server";
import { updateSession } from "./lib/supabase/middleware";

function setSecurityHeaders(response: NextResponse) {
  // Baseline seguro sin romper integraciones comunes.
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=()"
  );
  // Preferimos CSP frame-ancestors a X-Frame-Options (más moderno).
  // Nota: no definimos CSP completa aquí para evitar romper scripts/styles en Next.
  response.headers.set("Content-Security-Policy", "frame-ancestors 'none'");

  // HSTS solo cuando sabemos que estamos en HTTPS (no en localhost/dev).
  // En Vercel/Render/etc suele venir x-forwarded-proto=https.
  // Nota: en algunos despliegues este header no estará presente; en ese caso no setear HSTS.
  const proto = response.headers.get("x-forwarded-proto");
  if (proto === "https") {
    response.headers.set("Strict-Transport-Security", "max-age=15552000; includeSubDomains");
  }
}

export async function middleware(request: NextRequest) {
  const response = await updateSession(request);
  setSecurityHeaders(response);
  return response;
}

// Excluir assets internos. Aplicar a todo lo demás (incluye API).
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
