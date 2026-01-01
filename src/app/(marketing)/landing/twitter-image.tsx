import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 1200, height: 600 };
export const contentType = "image/png";

export default async function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "600px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "72px",
          background: "linear-gradient(135deg, #0D1B2A 0%, rgba(13,27,42,0.86) 100%)",
          color: "white",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 820 }}>
          <div style={{ fontSize: 28, fontWeight: 700, opacity: 0.95 }}>FinHub</div>
          <div style={{ fontSize: 60, fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1.06 }}>
            Personal finance clarity.
          </div>
          <div style={{ fontSize: 24, opacity: 0.85, lineHeight: 1.35 }}>
            Built for migrants in the Netherlands. Guided flows when you need them.
          </div>
        </div>
        <div style={{ width: 220, height: 220, borderRadius: 44, background: "#4CAF50" }} />
      </div>
    ),
    size
  );
}
