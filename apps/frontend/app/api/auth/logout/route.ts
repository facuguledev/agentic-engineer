// apps/frontend/app/api/auth/logout/route.ts
// Not part of contracts/api-specs/schema.ts (that contract only defines
// resource endpoints), but a login without a logout is half a feature —
// added for real usability, same shape convention as the rest of /api.
import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth/session";

export async function POST() {
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
