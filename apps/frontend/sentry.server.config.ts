// Server-side Sentry init, imported conditionally by instrumentation.ts.
// See instrumentation-client.ts for the DSN-unset-is-safe note — same
// applies here.
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
});
