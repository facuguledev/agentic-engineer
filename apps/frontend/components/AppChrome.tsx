// Scopes the tenant-app chrome (Nav + default content padding) to app
// routes only. /pulse (and any future marketing route under the same
// prefix) renders full-bleed with no app Nav — the Nav calls useTenant(),
// which has no session on a public marketing page, and its "Projects/Users"
// links are meaningless there. CustomCursor stays global (ADR-0001: cursor
// is a site-wide primitive, not app-scoped).
//
// Implemented as a pathname check rather than a route group
// (app/(app)/...) to avoid moving existing route files.
"use client";

import { usePathname } from "next/navigation";
import { CustomCursor } from "@/components/CustomCursor";
import { Nav } from "@/components/Nav";

const MARKETING_PREFIXES = ["/pulse"];

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMarketing = MARKETING_PREFIXES.some((prefix) => pathname?.startsWith(prefix));

  return (
    <>
      <CustomCursor />
      {!isMarketing && <Nav />}
      {isMarketing ? children : <main className="px-6 py-10">{children}</main>}
    </>
  );
}
