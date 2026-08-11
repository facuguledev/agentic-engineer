// Minimal marketing footer, scoped to /pulse only — distinct from the
// tenant-aware app <Nav> in components/Nav.tsx, which is not reused here
// since it fetches tenant data via useTenant() and this route is static.
// Links per content-brief.md §2 "Footer": producto, docs, changelog,
// contacto — no newsletter signup (explicitly out of scope for this phase).
// Accent token used sparingly as an interactive-only hover signal on the
// nav links (ADR-0001: accent reserved for interactive-only affordances).
import Link from "next/link";

const links = [
  { label: "Producto", href: "#" },
  { label: "Docs", href: "#" },
  { label: "Changelog", href: "#" },
  { label: "Contacto", href: "#" },
];

export function PulseFooter() {
  return (
    <footer className="border-t border-black pt-6 flex flex-wrap items-center justify-between gap-4">
      <p className="font-mono text-label uppercase tracking-[0.08em]">© 26 — pulse</p>
      <nav aria-label="Footer" className="flex gap-6 font-mono text-label uppercase tracking-[0.08em]">
        {links.map((link) => (
          <Link
            key={link.label}
            href={link.href}
            className="hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </footer>
  );
}
