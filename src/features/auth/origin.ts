export function getRequestOrigin(req: Request): string {
  const h = req.headers;
  const proto = (h.get("x-forwarded-proto") ?? "http").split(",")[0]?.trim() || "http";
  const host = (h.get("x-forwarded-host") ?? h.get("host") ?? "").split(",")[0]?.trim();
  return host ? `${proto}://${host}` : "http://localhost:3000";
}