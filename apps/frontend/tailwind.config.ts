import type { Config } from "tailwindcss";

// Design tokens — citation authority: docs/decisions/0001-agent02-brutalist-design-pivot.md
// (supersedes docs/research/design-audit-noth-en.md; that file is historical
// only and is NOT cited here per the ADR).
//
// Both ADR-0001 open items are now resolved by explicit user decision
// (2026-08-11):
//   1. Typeface: Space Grotesk, loaded via next/font/google in app/layout.tsx
//      as the --font-space-grotesk CSS variable. The system-ui stack below
//      is kept only as the font-load-failure fallback, not the primary face.
//   2. Accent color: #FF3B00 confirmed as final. Also expanded from
//      "interactive/hover-only" to limited static use (numerals, dividers,
//      one quote mark) per user request — still not a background/body color.
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        black: "#000000",
        white: "#FFFFFF",
        accent: "#FF3B00",
      },
      fontFamily: {
        grotesk: [
          "var(--font-space-grotesk)",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      fontSize: {
        // Fluid clamp-based type per ADR-0001, sizes reduced 2026-08-11 per
        // explicit user request (originals topped out at 9rem/5rem/3rem —
        // too dominant at desktop widths). Named by role, not a fixed
        // numeric scale.
        display: ["clamp(2.5rem, 2.5vw + 1.75rem, 4.5rem)", { lineHeight: "0.95", letterSpacing: "-0.02em" }],
        h1: ["clamp(2rem, 1.75vw + 1.5rem, 3.5rem)", { lineHeight: "0.98", letterSpacing: "-0.01em" }],
        h2: ["clamp(1.5rem, 1vw + 1.15rem, 2.25rem)", { lineHeight: "1.05" }],
        body: ["clamp(1rem, 0.3vw + 0.9rem, 1.25rem)", { lineHeight: "1.4" }],
        label: ["clamp(0.75rem, 0.15vw + 0.7rem, 0.875rem)", { lineHeight: "1.2", letterSpacing: "0.08em" }],
      },
      borderRadius: {
        // Zero-radius rule across all interactive components (ADR-0001 §3,
        // replaces the superseded pill-radius system).
        none: "0px",
        DEFAULT: "0px",
      },
      gridTemplateColumns: {
        // Symmetric 12-track grid — asymmetry is a placement property
        // (grid-column spans in components), not a track-definition one.
        12: "repeat(12, minmax(0, 1fr))",
      },
      boxShadow: {
        none: "none",
      },
      transitionDuration: {
        DEFAULT: "300ms",
      },
    },
  },
  plugins: [],
} satisfies Config;
