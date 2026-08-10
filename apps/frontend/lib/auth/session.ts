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

export async function createSessionCookie(payload: SessionPayload): Promise<void> {
  const token = await new SignJWT(payload)
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
    return { sub: payload.sub, tenantId: payload.tenantId as string, role: payload.role as "admin" | "member" };
  } catch {
    throw new UnauthenticatedError();
  }
}
