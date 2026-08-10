import { NextRequest, NextResponse } from "next/server";
import { CreateTaskRequest } from "@contracts/api-specs/schema";
import { requireSession } from "@/lib/auth/session";
import { withTenant } from "@/lib/db/pool";
import { serializeTask } from "@/lib/db/serializers";
import { errorResponse, withErrorHandling } from "@/lib/api/route-helpers";

export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    const session = await requireSession();
    const body = CreateTaskRequest.safeParse(await req.json().catch(() => undefined));
    if (!body.success) {
      return errorResponse(400, "Invalid request body");
    }

    // The tasks_tenant_id_project_id_fkey and tasks_tenant_id_assignee_id_fkey
    // composite FKs (0001_init.sql) structurally reject a projectId/assigneeId
    // from another tenant even if this check were skipped — this 400 is a
    // friendlier error than letting that surface as a raw FK-violation 500.
    const task = await withTenant(session.tenantId, async (client) => {
      const { rows } = await client.query(
        `INSERT INTO tasks (tenant_id, project_id, assignee_id, title, status)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          session.tenantId,
          body.data.projectId,
          body.data.assigneeId ?? null,
          body.data.title,
          body.data.status,
        ]
      );
      return rows[0];
    });
    return NextResponse.json(serializeTask(task), { status: 201 });
  });
}
