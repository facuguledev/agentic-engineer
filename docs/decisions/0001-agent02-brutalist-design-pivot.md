# ADR-0001: AGENT_02 design system pivot — noth.in audit → brutalist system

## Status

Accepted.

## Context

`agents/agent-02-frontend/system-prompt.md` originally sourced every design token from `docs/research/design-audit-noth-en.md`, cited by section number (§1 monochrome color, §2 PP Neue Montreal + IBM Plex Mono, §3 organic spacing, §4 pill/card radius, §5 no elevation, §7 GSAP ScrollTrigger ratios, §12 pill-button/text-link components). This produced a soft-monochrome, pill-radius, low-motion-ratio UI direction.

Directive received: replace this direction with a maximal-contrast brutalist system — fluid clamp-based oversized type, a 12-track grid with asymmetric item placement, binary `#000`/`#FFF` with a single saturated interactive-only accent, GSAP `SplitText` character-stagger reveals, and lerp-driven custom cursor tracking with `mix-blend-mode: difference`.

## Decision

`agents/agent-02-frontend/system-prompt.md` DESIGN SYSTEM RULES section is fully replaced. `docs/research/design-audit-noth-en.md` is superseded as AGENT_02's token source — it remains in the repo as historical record, no longer cited by the active system prompt. This ADR is the new citation authority for every token in the replacement.

Corrections applied against the source directive during drafting:
1. `grid-template-columns: repeat(12, 1fr)` defines a symmetric 12-track grid — the source directive mislabeled this "asymmetric grid configuration." Asymmetry is a placement property (`grid-column` spans), not a track-definition property. Corrected: symmetric grid, asymmetric composition rule.
2. GSAP `SplitText` and all other former Club GreenSock plugins have been 100% free, including commercial use, since April 2025 (Webflow's GreenSock acquisition). No licensing flag required, unlike the PP Neue Montreal commercial license flagged under the superseded system.
3. The superseded system's pill-radius component rule (§4: 100px/6.25rem radius) is incompatible with a brutalist direction and is replaced with a zero-radius rule across all interactive components.
4. The source directive specified no font family and no accessibility/motion-reduction behavior. Both are gaps in a production system prompt. Resolved: font family defaults to a neutral variable grotesk system stack pending explicit typeface decision (open item, below); `prefers-reduced-motion` handling and the existing Radix/Ark headless-primitive + `VALIDATE_A11Y` axe gate are retained unchanged — a visual pivot does not waive accessibility compliance.
5. Custom cursor tracking is scoped to `(pointer: fine)` — touch devices receive the system default; `mix-blend-mode: difference` never removes the default `:focus-visible` outline.

## Open item

Font family unresolved. Current default: `ui-sans-serif, system-ui` stack (Tailwind's default sans stack) until an explicit typeface is chosen. Does not block this ADR; tracked for a follow-up decision.

## Consequences

- Every component built under the prior direction (pill buttons, monochrome-with-near-black-accent surfaces) is non-conforming and must be rebuilt against the new tokens.
- `docs/research/design-audit-noth-en.md` retained for historical reference only; do not cite it in new AGENT_02 work.
- AGENT_02's `DATA CONTRACT`, `STACK` (minus animation library version note), and `PIPELINE` sections are unchanged by this ADR — only visual/design/motion tokens are superseded.
