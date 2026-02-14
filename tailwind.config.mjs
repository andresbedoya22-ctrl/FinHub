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
        lg: "12px",
        xl: "16px",
        "2xl": "20px",
      },
      boxShadow: {
        soft: "0 12px 34px rgba(8,20,29,0.18)",
        glass: "0 8px 26px rgba(8,20,29,0.12)",
      },
      fontFamily: {
        sans: ["Segoe UI", "Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
