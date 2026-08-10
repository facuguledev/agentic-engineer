import { NextResponse } from "next/server";

// Liveness check for the deployed frontend artifact itself — confirms the
// Next.js server is up and actually serving requests after a deploy.
// Deliberately NOT a deep dependency check: apps/backend has no deployed
// HTTP server anywhere yet (see docs/ci-cd-required-secrets.md gap #7),
// so there is no database or downstream API to probe from here. Once a
// real backend exists, extend this to verify connectivity to it instead
// of just process liveness — don't silently leave it shallow forever.
//
// force-dynamic: this must reflect the live, running server on every
// request, not a value baked in at build time.
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "agentic-engineer-frontend",
    commitSha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    timestamp: new Date().toISOString(),
  });
}
