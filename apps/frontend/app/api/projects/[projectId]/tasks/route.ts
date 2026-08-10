import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { withTenant } from "@/lib/db/pool";
import { serializeTask } from "@/lib/db/serializers";
import { withErrorHandling } from "@/lib/api/route-helpers";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  return withErrorHandling(async () => {
    const session = await requireSession();
    const { projectId } = await params;
    const tasks = await withTenant(session.tenantId, async (client) => {
      const { rows } = await client.query(
        "SELECT * FROM tasks WHERE tenant_id = $1 AND project_id = $2 ORDER BY created_at",
        [session.tenantId, projectId]
      );
      return rows;
    });
    return NextResponse.json(tasks.map(serializeTask));
  });
}
