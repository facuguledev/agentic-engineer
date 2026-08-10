import { NextRequest, NextResponse } from "next/server";
import { CreateUserRequest } from "@contracts/api-specs/schema";
import { requireSession } from "@/lib/auth/session";
import { withTenant } from "@/lib/db/pool";
import { serializeUser } from "@/lib/db/serializers";
import { errorResponse, withErrorHandling } from "@/lib/api/route-helpers";

export async function GET() {
  return withErrorHandling(async () => {
    const session = await requireSession();
    const users = await withTenant(session.tenantId, async (client) => {
      const { rows } = await client.query(
        "SELECT * FROM users WHERE tenant_id = $1 ORDER BY created_at",
        [session.tenantId]
      );
      return rows;
    });
    return NextResponse.json(users.map(serializeUser));
  });
}

export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    const session = await requireSession();
    const body = CreateUserRequest.safeParse(await req.json().catch(() => undefined));
    if (!body.success) {
      return errorResponse(400, "Invalid request body");
    }

    const user = await withTenant(session.tenantId, async (client) => {
      const { rows } = await client.query(
        `INSERT INTO users (tenant_id, email, name, role)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [session.tenantId, body.data.email, body.data.name, body.data.role]
      );
      return rows[0];
    });
    return NextResponse.json(serializeUser(user), { status: 201 });
  });
}
