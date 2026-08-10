// apps/frontend/app/api/auth/login/route.ts
//
// Email-only login — no password (see lib/auth/session.ts header for why
// this is a deliberate v1 scope cut, not an oversight). Looks the email up
// via the identity pool (bypasses RLS — this is the one legitimate reason
// to do that, see lib/db/pool.ts), because which tenant an email belongs
// to is exactly what RLS can't answer without already knowing the tenant.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getIdentityPool } from "@/lib/db/pool";
import { createSessionCookie } from "@/lib/auth/session";
import { serializeUser } from "@/lib/db/serializers";
import { errorResponse, withErrorHandling } from "@/lib/api/route-helpers";

const LoginRequest = z.object({ email: z.string().email() });

export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    const body = LoginRequest.safeParse(await req.json().catch(() => undefined));
    if (!body.success) {
      return errorResponse(400, "email is required and must be a valid email address");
    }

    const { rows } = await getIdentityPool().query(
      "SELECT id, tenant_id, email, name, role, created_at, updated_at FROM users WHERE email = $1 LIMIT 1",
      [body.data.email]
    );
    const user = rows[0];
    if (!user) {
      // Same generic message whether the email doesn't exist or something
      // else went wrong — never confirm/deny account existence to an
      // unauthenticated caller.
      return errorResponse(401, "Invalid credentials");
    }

    await createSessionCookie({ sub: user.id, tenantId: user.tenant_id, role: user.role });
    return NextResponse.json(serializeUser(user));
  });
}
