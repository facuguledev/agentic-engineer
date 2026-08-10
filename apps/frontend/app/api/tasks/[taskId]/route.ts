import { NextRequest, NextResponse } from "next/server";
import { UpdateTaskRequest } from "@contracts/api-specs/schema";
import { requireSession } from "@/lib/auth/session";
import { withTenant } from "@/lib/db/pool";
import { serializeTask } from "@/lib/db/serializers";
import { errorResponse, withErrorHandling } from "@/lib/api/route-helpers";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  return withErrorHandling(async () => {
    const session = await requireSession();
    const { taskId } = await params;
    const body = UpdateTaskRequest.safeParse(await req.json().catch(() => undefined));
    if (!body.success) {
      return errorResponse(400, "Invalid request body");
    }

    const task = await withTenant(session.tenantId, async (client) => {
      const { rows } = await client.query(
        `UPDATE tasks
         SET title = COALESCE($3, title),
             status = COALESCE($4, status),
             assignee_id = CASE WHEN $5 THEN $6 ELSE assignee_id END,
             updated_at = now()
         WHERE tenant_id = $1 AND id = $2
         RETURNING *`,
        [
          session.tenantId,
          taskId,
          body.data.title ?? null,
          body.data.status ?? null,
          // assigneeId is optional AND nullable in the contract (can be
          // explicitly set to null to unassign) — "was this key present in
          // the request at all" has to travel separately from its value,
          // since $6=null legitimately means "unassign", not "no change".
          Object.prototype.hasOwnProperty.call(body.data, "assigneeId"),
          body.data.assigneeId ?? null,
        ]
      );
      return rows[0];
    });
    if (!task) return errorResponse(404, "Task not found");
    return NextResponse.json(serializeTask(task));
  });
}
