// Next.js instrumentation hook — https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
// Registers the right Sentry config per runtime, and wires up
// onRequestError to capture errors from Server Components, middleware, and
// route handlers.
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
