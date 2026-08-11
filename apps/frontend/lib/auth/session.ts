// apps/frontend/lib/auth/session.ts
//
// Minimal real session mechanism: a signed JWT in an httpOnly cookie,
// carrying { sub: userId, tenantId, role }. No password — login is by
// email only (see app/api/auth/login/route.ts). That is a deliberate,
// documented scope cut for a v1 demo, not an oversight: there is exactly
// one seeded account (infra/neon/seed_production.sql) and no signup flow
// yet. What IS real: the token is signed (HS256, JWT_SECRET), verified on
// every request, httpOnly + sameSite=lax + secure in production, and its
// tenantId is what every RLS-scoped query trusts — never a client-supplied
// header or body field. See lib/db/pool.ts's withTenant().
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "session";
const ALG = "HS256";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

export type SessionPayload = {
  sub: string; // userId
  tenantId: string;
  role: "admin" | "member";
};

function getSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set. See docs/ci-cd-required-secrets.md.");
  }
  return new TextEncoder().encode(secret);
}

// Every preview deployment shares one PREVIEW_JWT_SECRET (see
// pr-checks.yml's "Deploy Vercel preview" step and docs/ci-cd-required-secrets.md's
// Gap #10 rationale — a deliberate simplification, not an oversight). AGENT_04's
// audit-2026-08-11-jwt-secret-blast-radius.md found this combines with
// infra/neon/seed_isolation_test.sql's identical fixed tenant/user UUIDs across
// every branch to produce a live cross-PR authentication bypass: a token minted
// on one PR's preview verifies — and resolves to real matching rows — on any
// other concurrently-open PR's preview. PR_NUMBER, injected alongside JWT_SECRET
// at preview-deploy time (pr-checks.yml), binds every token to the PR that
// minted it, closing the bypass without deriving a per-PR secret. Undefined in
// production (no PR_NUMBER there), so both the claim and the check below are
// no-ops outside of preview environments.
function getPrNumber(): string | undefined {
  return process.env.PR_NUMBER;
}

export async function createSessionCookie(payload: SessionPayload): Promise<void> {
  const prNumber = getPrNumber();
  const token = await new SignJWT({ ...payload, ...(prNumber ? { prNumber } : {}) })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(getSecretKey());

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE_SECONDS,
    path: "/",
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export class UnauthenticatedError extends Error {
  constructor() {
    super("Not authenticated");
    this.name = "UnauthenticatedError";
  }
}

/**
 * Reads and verifies the session cookie. Throws UnauthenticatedError
 * (never returns a fake/default session) if it's missing or invalid —
 * callers should catch this and return a 401 via the standard error
 * envelope, not let it surface as an unhandled 500.
 */
export async function requireSession(): Promise<SessionPayload> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) {
    throw new UnauthenticatedError();
  }
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (typeof payload.sub !== "string" || typeof payload.tenantId !== "string") {
      throw new UnauthenticatedError();
    }
    // Reject any token not minted for *this* PR's preview — closes the
    // cross-PR forgery from the shared PREVIEW_JWT_SECRET (see
    // createSessionCookie's comment above and
    // docs/incidents/audit-2026-08-11-jwt-secret-blast-radius.md). No-op in
    // production, where PR_NUMBER is never set.
    const currentPrNumber = getPrNumber();
    if (currentPrNumber && payload.prNumber !== currentPrNumber) {
      throw new UnauthenticatedError();
    }
    return { sub: payload.sub, tenantId: payload.tenantId as string, role: payload.role as "admin" | "member" };
  } catch {
    throw new UnauthenticatedError();
  }
}
