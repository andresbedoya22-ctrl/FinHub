import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        fh: {
          bg: "var(--fh-bg)",
          surface: "var(--fh-surface)",
          surface2: "var(--fh-surface-2)",
          text: "var(--fh-text)",
          muted: "var(--fh-muted)",
          border: "var(--fh-border)",
          primary: "var(--fh-primary)",
          primaryFg: "var(--fh-primary-fg)",
          danger: "var(--fh-danger)",
          dangerFg: "var(--fh-danger-fg)",
          focus: "var(--fh-focus)",
        },
      },
      borderRadius: {
        xl: "14px",
        "2xl": "18px",
      },
      boxShadow: {
        soft: "0 10px 30px rgba(0,0,0,0.25)",
      },
    },
  },
  plugins: [],
} satisfies Config;
