import { NextRequest, NextResponse } from "next/server";
import { UpdateProjectRequest } from "@contracts/api-specs/schema";
import { requireSession } from "@/lib/auth/session";
import { withTenant } from "@/lib/db/pool";
import { serializeProject } from "@/lib/db/serializers";
import { errorResponse, withErrorHandling } from "@/lib/api/route-helpers";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  return withErrorHandling(async () => {
    const session = await requireSession();
    const { projectId } = await params;
    const project = await withTenant(session.tenantId, async (client) => {
      const { rows } = await client.query(
        "SELECT * FROM projects WHERE tenant_id = $1 AND id = $2",
        [session.tenantId, projectId]
      );
      return rows[0];
    });
    if (!project) return errorResponse(404, "Project not found");
    return NextResponse.json(serializeProject(project));
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  return withErrorHandling(async () => {
    const session = await requireSession();
    const { projectId } = await params;
    const body = UpdateProjectRequest.safeParse(await req.json().catch(() => undefined));
    if (!body.success) {
      return errorResponse(400, "Invalid request body");
    }

    const project = await withTenant(session.tenantId, async (client) => {
      const { rows } = await client.query(
        `UPDATE projects
         SET name = COALESCE($3, name),
             updated_at = now()
         WHERE tenant_id = $1 AND id = $2
         RETURNING *`,
        [session.tenantId, projectId, body.data.name ?? null]
      );
      return rows[0];
    });
    if (!project) return errorResponse(404, "Project not found");
    return NextResponse.json(serializeProject(project));
  });
}
