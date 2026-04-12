import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
};

export default withSentryConfig(nextConfig, {
  // DSN usado pelo Sentry CLI para upload de source maps no build
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Silencia o output do Sentry Webpack plugin no terminal
  silent: !process.env.CI,

  // Upload de source maps apenas em produção
  widenClientFileUpload: true,
  sourcemaps: { disable: !process.env.SENTRY_DSN },

  // Desativa telemetria do Sentry
  telemetry: false,
});
