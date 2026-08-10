// apps/frontend/lib/api/route-helpers.ts
//
// Shared plumbing for app/api/** route handlers: consistent error envelope
// (matches contracts/api-specs/schema.ts's ErrorResponse — never a stack
// trace or raw DB error message in the response body, per the same "global
// error middleware" contract note that shaped the original schema), and a
// thin wrapper that turns UnauthenticatedError into a real 401 instead of
// an unhandled 500.
import { NextResponse } from "next/server";
import { UnauthenticatedError } from "@/lib/auth/session";

export function errorResponse(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Wraps a route handler body: catches UnauthenticatedError -> 401, and any
 * other thrown error -> 500 with a generic message (the real error is
 * still logged server-side via console.error, just never sent to the
 * client — same reasoning Sentry's server config already documents for
 * apps/frontend).
 */
export async function withErrorHandling(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof UnauthenticatedError) {
      return errorResponse(401, "Not authenticated");
    }
    // Postgres unique-violation (e.g. users_tenant_id_email_unique) -> 409,
    // not a generic 500. Duck-typed on the `code` field pg's driver
    // attaches, rather than importing pg's error class, to keep this file
    // dependency-light.
    if (typeof e === "object" && e !== null && "code" in e && (e as { code: unknown }).code === "23505") {
      return errorResponse(409, "A record with that value already exists");
    }
    console.error(e);
    return errorResponse(500, "Internal error");
  }
}
