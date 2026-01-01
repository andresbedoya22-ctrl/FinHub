import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          background: "linear-gradient(135deg, #0D1B2A 0%, #0D1B2A 55%, rgba(13,27,42,0.75) 100%)",
          color: "white",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "#4CAF50" }} />
          <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em" }}>FinHub</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ fontSize: 64, fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1.05 }}>
            Control your money in NL.
          </div>
          <div style={{ fontSize: 26, opacity: 0.85, lineHeight: 1.35, maxWidth: 920 }}>
            Personal finance control + guided flows for taxes, toeslagen, mortgages, loans, and insurance.
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, opacity: 0.9 }}>
          {["Personal finance", "Taxes", "Toeslagen", "Mortgages", "Loans", "Insurance"].map((x) => (
            <div
              key={x}
              style={{
                padding: "10px 14px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.25)",
                fontSize: 18,
              }}
            >
              {x}
            </div>
          ))}
        </div>
      </div>
    ),
    size
  );
}
