import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { withTenant } from "@/lib/db/pool";
import { serializeTenant } from "@/lib/db/serializers";
import { errorResponse, withErrorHandling } from "@/lib/api/route-helpers";

export async function GET() {
  return withErrorHandling(async () => {
    const session = await requireSession();
    const tenant = await withTenant(session.tenantId, async (client) => {
      const { rows } = await client.query("SELECT * FROM tenants WHERE id = $1", [session.tenantId]);
      return rows[0];
    });
    if (!tenant) return errorResponse(404, "Tenant not found");
    return NextResponse.json(serializeTenant(tenant));
  });
}
