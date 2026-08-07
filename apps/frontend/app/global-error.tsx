"use client";

import * as Sentry from "@sentry/nextjs";
import NextError from "next/error";
import { useEffect } from "react";

// Captures errors that occur anywhere in the App Router tree (outside what
// individual route-level error.tsx boundaries would catch). Required
// separately from instrumentation.ts's onRequestError — this one handles
// client-side render errors, that one handles server-side request errors.
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        {/* NextError is Next's default error page component. Its type
        requires a statusCode prop, but the App Router doesn't expose HTTP
        status codes for client-side errors, so 0 renders a generic message. */}
        <NextError statusCode={0} />
      </body>
    </html>
  );
}
