// eslint.config.mjs
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import next from "@next/eslint-plugin-next";

export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/_archive_fix/**",
      "**/docs/~$*",
      "**/*.bak",
      "**/*.old",
      "**/.tmp/**",
      ".tmp/**",
      ".next/**",
    ],
  },
  // Reglas base de JS
  js.configs.recommended,

  // Reglas recomendadas para TypeScript (flat config)
  ...tseslint.configs.recommended,

  // Config base de entorno
  {
    files: ["**/*.{js,mjs,cjs,ts,tsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },

  // Next.js (Core Web Vitals) + React Hooks
  {
    files: ["**/*.{js,mjs,cjs,ts,tsx}"],
    plugins: {
      "@next/next": next,
      "react-hooks": reactHooks,
    },
    rules: {
      ...next.configs["core-web-vitals"].rules,
      ...reactHooks.configs.recommended.rules,
    },
  },

  // Ignorados
  {
    ignores: [
      ".next/**",
      "out/**",
      "dist/**",
      "node_modules/**",
      "**/.tmp/**",
      ".tmp/**",
      "**/.next/**",
    ],
  },
];
