// Client-side Sentry init. Next.js 15+ App Router with Turbopack loads this
// file automatically from the project root — see
// https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/
//
// NEXT_PUBLIC_SENTRY_DSN is unset until a real Sentry project exists (see
// docs/ci-cd-required-secrets.md, item 4). Sentry.init() with an empty/
// undefined dsn no-ops rather than throwing, so local dev and any build
// without the DSN configured still work — this just doesn't report errors
// anywhere until the DSN is set.
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Error monitoring only for now — no session replay, logs, or user
  // feedback widget. Keeps the initial integration minimal; each of those
  // is an opt-in follow-up once basic error tracking is confirmed working
  // against a real project.
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
