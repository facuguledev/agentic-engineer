import { NextRequest, NextResponse } from "next/server";
import { UpdateUserRequest } from "@contracts/api-specs/schema";
import { requireSession } from "@/lib/auth/session";
import { withTenant } from "@/lib/db/pool";
import { serializeUser } from "@/lib/db/serializers";
import { errorResponse, withErrorHandling } from "@/lib/api/route-helpers";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  return withErrorHandling(async () => {
    const session = await requireSession();
    const { userId } = await params;
    const user = await withTenant(session.tenantId, async (client) => {
      const { rows } = await client.query(
        "SELECT * FROM users WHERE tenant_id = $1 AND id = $2",
        [session.tenantId, userId]
      );
      return rows[0];
    });
    if (!user) return errorResponse(404, "User not found");
    return NextResponse.json(serializeUser(user));
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  return withErrorHandling(async () => {
    const session = await requireSession();
    const { userId } = await params;
    const body = UpdateUserRequest.safeParse(await req.json().catch(() => undefined));
    if (!body.success) {
      return errorResponse(400, "Invalid request body");
    }

    const user = await withTenant(session.tenantId, async (client) => {
      const { rows } = await client.query(
        `UPDATE users
         SET name = COALESCE($3, name),
             role = COALESCE($4, role),
             updated_at = now()
         WHERE tenant_id = $1 AND id = $2
         RETURNING *`,
        [session.tenantId, userId, body.data.name ?? null, body.data.role ?? null]
      );
      return rows[0];
    });
    if (!user) return errorResponse(404, "User not found");
    return NextResponse.json(serializeUser(user));
  });
}
