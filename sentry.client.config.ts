import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Captura 10% das transações em produção — ajustar conforme volume
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Desativa em desenvolvimento para não poluir o Sentry com erros locais
  enabled: process.env.NODE_ENV === "production",
});
