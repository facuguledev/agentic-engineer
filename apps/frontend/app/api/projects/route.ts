import { NextRequest, NextResponse } from "next/server";
import { CreateProjectRequest } from "@contracts/api-specs/schema";
import { requireSession } from "@/lib/auth/session";
import { withTenant } from "@/lib/db/pool";
import { serializeProject } from "@/lib/db/serializers";
import { errorResponse, withErrorHandling } from "@/lib/api/route-helpers";

export async function GET() {
  return withErrorHandling(async () => {
    const session = await requireSession();
    const projects = await withTenant(session.tenantId, async (client) => {
      const { rows } = await client.query(
        "SELECT * FROM projects WHERE tenant_id = $1 ORDER BY created_at",
        [session.tenantId]
      );
      return rows;
    });
    return NextResponse.json(projects.map(serializeProject));
  });
}

export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    const session = await requireSession();
    const body = CreateProjectRequest.safeParse(await req.json().catch(() => undefined));
    if (!body.success) {
      return errorResponse(400, "Invalid request body");
    }

    // createdBy is server-derived from the session, never client-supplied
    // — matches contracts/api-specs/schema.ts's comment on
    // CreateProjectRequest explicitly omitting that field.
    const project = await withTenant(session.tenantId, async (client) => {
      const { rows } = await client.query(
        `INSERT INTO projects (tenant_id, name, created_by)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [session.tenantId, body.data.name, session.sub]
      );
      return rows[0];
    });
    return NextResponse.json(serializeProject(project), { status: 201 });
  });
}
