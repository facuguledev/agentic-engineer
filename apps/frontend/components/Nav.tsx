"use client";

import Link from "next/link";
import { useTenant } from "@/lib/api/hooks";

export function Nav() {
  const { data: tenant } = useTenant();

  return (
    <nav className="border-b border-black flex items-center justify-between px-6 py-4">
      <Link
        href="/"
        className="font-grotesk text-h2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        {tenant?.name ?? "—"}
      </Link>
      <div className="flex gap-6 font-mono text-label uppercase tracking-[0.08em]">
        <Link href="/" className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
          Projects
        </Link>
        <Link href="/users" className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
          Users
        </Link>
      </div>
    </nav>
  );
}
