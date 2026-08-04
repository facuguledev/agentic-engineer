import type { Config } from "tailwindcss";

// Design tokens — citation authority: docs/decisions/0001-agent02-brutalist-design-pivot.md
// (supersedes docs/research/design-audit-noth-en.md; that file is historical
// only and is NOT cited here per the ADR).
//
// OPEN ITEMS carried over from the ADR, not resolved by this config:
//   1. Typeface: ADR leaves font family unresolved pending an explicit
//      decision — this ships the neutral fallback stack named in the ADR.
//   2. Accent color: ADR calls for "a single saturated interactive-only
//      accent" but does not specify a hex value. `--accent` below is a
//      PLACEHOLDER (electric orange) and ships with a code comment flag;
//      per HARD CONSTRAINTS ("no color token without citation or explicit
//      user override") this needs an explicit user decision before it's
//      treated as final.
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        black: "#000000",
        white: "#FFFFFF",
        // PLACEHOLDER — see file header. Not yet user-approved.
        accent: "#FF3B00",
      },
      fontFamily: {
        // ADR-0001 open item: neutral variable grotesk stack pending an
        // explicit typeface decision.
        grotesk: [
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
        // Fluid clamp-based oversized type per ADR-0001. Named by role, not
        // a fixed numeric scale.
        display: ["clamp(3rem, 4vw + 2rem, 9rem)", { lineHeight: "0.92", letterSpacing: "-0.02em" }],
        h1: ["clamp(2.25rem, 2.5vw + 1.5rem, 5rem)", { lineHeight: "0.96", letterSpacing: "-0.01em" }],
        h2: ["clamp(1.75rem, 1.5vw + 1.25rem, 3rem)", { lineHeight: "1.02" }],
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
