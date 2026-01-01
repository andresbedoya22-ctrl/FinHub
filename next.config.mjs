import { withSentryConfig } from "@sentry/nextjs";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin(); // usa src/i18n/request.ts por defecto

/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true
};

const sentryWebpackPluginOptions = {
  org: "finhub-l7",
  project: "javascript-nextjs",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  webpack: {
    automaticVercelMonitors: true,
    treeshake: {
      removeDebugLogging: true
    }
  }
};

export default withSentryConfig(withNextIntl(nextConfig), sentryWebpackPluginOptions);
