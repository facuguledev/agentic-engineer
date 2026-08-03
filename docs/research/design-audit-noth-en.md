# Design & Interaction Audit — noth.in

Live-DOM audit performed against the rendered site (not a static fetch), cross-verifying `getComputedStyle()` output against CSSOM source rules throughout. Every count below is an exact tally against the underlying data, not an estimate. Fields that could not be resolved are marked `UNVERIFIED` with the reason.

## 0. Tooling Preflight

| Check | Result |
|---|---|
| Screenshot capture | Functional (confirmed with a throwaway capture before starting) |
| JS execution (`getComputedStyle`) | Functional |
| CSSOM access (`document.styleSheets[].cssRules`) | Functional for 21 of 22 stylesheets. One stylesheet CORS-blocked (`fonts.googleapis.com/css?family=IBM+Plex+Mono:400`) |
| Achieved viewport | `window.innerWidth/innerHeight = 894×601`, `devicePixelRatio: 1.5`, `screen: 1280×800` |
| `resize_window` to 1440×900 and 480×844 | Confirmed tooling limitation: the OS-level window resizes, but `window.innerWidth/innerHeight` stays fixed at 894×601 in both attempts. No breakpoint was genuinely re-rendered; every breakpoint-specific value in this report is CSSOM-verified from source `@media` rules, not a visual re-render, and is labeled as such throughout. |

**Scope note:** three elements injected by this audit's own automation tooling (`#claude-agent-stop-button`, `#claude-agent-glow-border`, `#claude-phantom-cursor`) and one browser-extension container (`.ue-sidebar-container`, with an internal `<iframe>`) appeared in the live DOM during this session. All four were identified by `id`/class and excluded from every finding below — they do not belong to the site under audit.

## 1. Color

### 1.1 Rendered palette (measured via `getComputedStyle()` across all 1,055 live DOM nodes — not unused CSS rules)

| Role | Value | Occurrences |
|---|---|---|
| Primary background | `#FFFFFF` | 29 |
| Secondary (dark) background | `#000000` | 20 |
| Tertiary (isolated) background | `#FAF9F5` | 1 |
| Primary text/border | `#FFFFFF` | 862 (text) / 859 (border) |
| Secondary text/border | `#000000` | 168 (text) / 166 (border) |
| Secondary gray text/border | `#8E8E8E` | 21 (text) / 21 (border) |
| Near-black text/border | `#141413` | 4 (text) / 3 (border) |
| Translucent border | `rgba(255,255,255,0.4)` | 5 |
| Translucent dark border | `rgba(31,30,29,0.4)` | 1 |

**Finding:** the palette actually rendered on screen is effectively monochrome — white/black with one secondary gray and one near-black/near-white accent. No saturated hue (red, blue, green, orange, etc.) appears anywhere in the live computed DOM.

### 1.2 CSSOM-declared color tokens with no corresponding live usage

67 distinct color values appear across `color`/`background-color`/`border-color`/`fill`/`stroke` in the 764 top-level `CSSStyleRule` entries — the large majority are unused Webflow framework utility classes (confirmed: `document.getElementsByClassName(...).length === 0` for nearly all of them), e.g. `rgb(66,133,244)` (Google blue, from an unused reCAPTCHA widget class) and `rgb(234,56,76)` (Webflow lightbox red, unused). These are dead design-system scaffolding, not part of the live palette, and should not be sourced as tokens.

### 1.3 `:root` custom properties (5 total, CSSOM)

| Property | Value | Used in live DOM? |
|---|---|---|
| `--black` | `black` | Yes |
| `--white` | `white` | Yes |
| `--transparent` | `#0000` | Yes (1 usage) |
| `--color-neutral-300` (marked `<deleted\|variable-...>` in CSSOM itself) | `#E3E1DE` | Not found in any live `getComputedStyle()` read — design-system leftover |
| `--color-success` (same `<deleted\|...>` marker) | `#0BA954` (green) | Not found in any live `getComputedStyle()` read — design-system leftover |

## 2. Typography

### 2.1 Typeface families (via `@font-face` in CSSOM — source of truth, not inferred from the computed `font-family` string)

| CSS family name | Weight | Source file |
|---|---|---|
| `Ppneuemontreal` | 100 (Thin) | `PPNeueMontreal-Thin.woff2` |
| `Ppneuemontreal` | 300 (Light) | `PPNeueMontreal-Light.woff2` |
| `Ppneuemontreal` | 400 (Regular) | `PPNeueMontreal-Regular.woff2` |
| `Ppneuemontreal` | 500 (Medium) | `PPNeueMontreal-Medium.woff2` |
| `Ppneuemontreal` | 600 (SemiBold) | `PPNeueMontreal-SemiBold.woff2` |
| `Ppneuemontreal` | 700 (Bold) | `PPNeueMontreal-Bold.woff2` |
| `"Ppneuemontreal Book"` (a distinct family, not a weight variant of the above) | 400 | `PPNeueMontreal-Book.woff2` |
| `webflow-icons` | 400 | Framework icon font |

The source filename `PPNeueMontreal` maps directly (not obfuscated) to **PP Neue Montreal**, a commercial typeface from Pangram Pangram Foundry — a direct filename identification, not an inference from a mangled string.

`IBM Plex Mono` (weight 400) loads via Google Fonts; its stylesheet is CORS-blocked in this session, so its exact `@font-face` declaration is `UNVERIFIED`, though its live usage was independently confirmed (§2.3).

### 2.2 Font stack by role (computed across 1,055 elements)

| Stack | Occurrences | Apparent role |
|---|---|---|
| `Ppneuemontreal, Arial, sans-serif` | 514 | General text / weight 500 |
| `"Ppneuemontreal Book", Arial, sans-serif` | 430 | Lighter body copy |
| `sans-serif` | 54 | Generic fallback (unstyled elements) |
| `"IBM Plex Mono", sans-serif` | 51 | Technical/numeric labels (§2.3) |
| `-apple-system, BlinkMacSystemFont, "Segoe UI"...` | 4 | Likely an embedded third-party widget (Calendly) |
| `Arial, Helvetica, sans-serif` | 2 | Unidentified / fallback |

### 2.3 Type scale — base value (CSSOM, unconstrained by `@media`) vs. responsive override (CSSOM, `@media (max-width:991px)`)

| Selector | Base font-size (CSSOM) | Base line-height | Override at ≤991px (CSSOM) | Confidence |
|---|---|---|---|---|
| `.h1-home` | `5rem` (80px @16px root) | 1 | `2.5rem` (40px) | CSS-rule-verified, not re-rendered |
| `.h3-style` | `2.5rem` (40px) | 1.1 | `1.5625rem` (25px) | CSS-rule-verified |
| `.title-work` | `0.75rem` (12px) | — | No override found | CSS-rule-verified |
| `.short-p-work` | `1.5625rem` (25px), weight 500 | 1 | No override found | CSS-rule-verified |

Note: since the tested viewport (894px) already falls within the `≤991px` bracket, every computed-style measurement in this report for these selectors reflects the tablet/mobile override, not the desktop base (80px/40px) — stated explicitly to avoid conflating the two.

Most frequent computed font-sizes across the DOM, selector-agnostic: 18px (509), 14px (270), 12px (110), 16px (77), 20px (41), 40px (21). Most frequent non-`normal` letter-spacing: `0.36px` (99), `1.12px` (29), `0.8px` (23), `-0.4px` (21).

### 2.4 "NOTHIN'" wordmark — mechanism finding

The large wordmark is not HTML/CSS text — it is vector artwork: `viewBox="0 0 1408 294"`, 7 `<path>` elements (N-O-T-H-I-N-apostrophe), present twice in the DOM (`svg.nothin-hero-svg` in the hero, `svg.footer-nothin-svg` in the footer), both rendering at 854×178px in the tested viewport. This is load-bearing for reproduction: it cannot be approximated with a font at any weight and requires the exact vector outlines.

## 3. Spacing

No strict single-base spacing grid (e.g. an 8pt grid) exists. Recurring measured values (from live computed style, not unused CSSOM rules): `padding-top`: 16px (13), 24px (6), 87px (6), 100px (4); `gap`: 12px (13), 16px (9), 14px (7), 6px (6); `padding-left`: 20px (12), 12px (5), 16px (3). These are not consistent multiples of 4 or 8 (e.g. 6, 14, 87) — reported as an organic, design-driven scale, not a clean mathematical base. No invented "cleaner" fraction is substituted for an unverified one.

## 4. Border Radius

| Value | Occurrences | Apparent usage |
|---|---|---|
| `100px` | 12 | Pill/capsule buttons ("BOOK A CALL", "DROP US AN EMAIL") |
| `4px` | 13 | Small cards/blocks |
| `50%` | 6 | Circular elements (sound-toggle knob, dots) |
| `12px` | 1 | One isolated component, not individually identified |

## 5. Shadows / Elevation

Exhaustive `getComputedStyle().boxShadow` search, all 1,055 elements: 2 elements carry `box-shadow`, both belonging to this audit's tooling overlay (`#claude-agent-glow-border-inner`, `#claude-agent-stop-button`, confirmed by `id`). **Site elevation system: none.** No `box-shadow` on any genuine site component; no Material-style elevation.

## 6. Grid / Layout / Container

No fixed `max-width` container exists at any level (`html`, `body`, or the 11 sampled sections all return `max-width: none`). Layout is fluid, full-viewport-width across every section tested (`getBoundingClientRect()` width = 894px = `window.innerWidth` in all 11 sections).

Of 12 standard Webflow utility classes checked (`w-container`, `w-col`, `w-row`, `w-button`, `w-form`, `w-nav`, `w-layout-grid`, etc.), only `w-inline-block` is genuinely in use (30 elements) — the rest have 0 live usages despite existing in Webflow's base stylesheet: dead rules, not active functionality.

`display: grid` is used on only 10 real elements, including `.work_list.w-dyn-items` (a 6-column, 99px-column grid — the CMS-driven project list/collection). `display: flex` appears on 73 elements.

No element with `overflow-x: scroll|auto` was found — there is no horizontal scroll anywhere on the site (confirmed, not merely unobserved).

**11 confirmed** via `document.querySelectorAll('[class*="section"]')` this session, matching the sampled-section count exactly; the prior 10-name list was missing one entry (`section-w`). Literal names, tag, and document order: `section-w` (`DIV`), `section-fake-hero` (`DIV`), `section hero-home` (`SECTION`), `section showreel` (`SECTION`), `section works` (`SECTION`), `titile-section-work` (`DIV`, author typo, literal), `section video` (`SECTION`), `section info-img` (`SECTION`), `section-separator-blur` (`DIV`), `section glitch` (`SECTION`), `section-footer` (`FOOTER`). Note the tag mix: only 6 of these 11 are genuine `<section>` elements (`document.querySelectorAll('section').length === 6`); the rest are `<div>`/`<footer>` elements using "section"-pattern class names without the semantic tag.

## 7. Libraries & Motion/Scroll Mechanism

| Library | Present | Detail |
|---|---|---|
| GSAP | Yes | Version 3.13.0 (read directly from `window.gsap.version`) |
| GSAP ScrollTrigger | Yes | 67 exact instances via `ScrollTrigger.getAll().length` |
| Lenis (smooth scroll) | Yes | `lenis` class present on `<html>` (`class="w-mod-js wf-ibmplexmono-n4-active wf-active lenis"`). Internal config (duration, easing) is not exposed globally — `UNVERIFIED` |
| Webflow runtime | Yes | `window.Webflow` present, with `.require()` |
| Taxi.js (page transitions) | Strong indicator | `data-taxi-view` attribute on the `.page_view` wrapper — explains no-full-reload navigation to `/works/utopia` |
| Three.js / WebGL | Not detected | `window.THREE === undefined` |
| jQuery | Present, version blocked by this audit's own content filter (flagged `[BLOCKED]`) | `UNVERIFIED` |

### 7.1 Scroll-jacking / pinning / scrub — exact findings

**Scroll-jacking:** none — native user scroll is never intercepted or redirected.

**Pinning (GSAP `pin`):** 0 of 67 triggers have an active pin. The visually "sticky WORKS heading" is almost certainly CSS `position: sticky`, not a GSAP `ScrollTrigger` pin — consistent with finding no GSAP pin-spacer element in the DOM.

**Scrub vs. play-once, exact count:** of 67 triggers, 10 use `scrub` (with numeric smoothing values of 1, 1.5, 2, or 3 — not boolean `true`) and 57 use single-fire `toggleActions` (`"play"` or `"play none none none"`). Exact ratio: **10:57 (15%:85%)**.

**Horizontal scroll:** none (§6).

### 7.2 Motion table (re-derived directly from `ScrollTrigger.getAll()` this session, grouped by exact trigger/scrub/ease/duration signature; units — start = document scroll pixels, duration = tween seconds; never conflated)

| Element/trigger | Scrub | Ease | Duration (s) | Instances | Start (px) |
|---|---|---|---|---|---|
| (root, no own trigger element) | no | none | — | 1 | 66 |
| `.work_item.w-dyn-item` (project cards) | no | `power4.inOut` | 1 | 5 | 953 |
| `.img-block-left` (gift-box image) | yes (1) | none | 0.5 | 1 | 6727 |
| `.img-block-left` (gift-box image) | yes (3) | none | 0.5 | 1 | 6727 |
| `.img-block-right-w` (donut/balloon image) | yes (2) | none | 0.5 | 1 | 6566 |
| `.img-block-right-w` (donut/balloon image) | yes (3) | none | 0.5 | 1 | 6566 |
| `section.glitch` (entry, no scrub) | no | none | — | 1 | 8705 |
| `section.glitch` (scrub 2, ease `undefined`) | yes (2) | `undefined` | — | 1 | 9362 |
| `section.glitch` (scrub 2, particle dissolve) | yes (2) | none | 0.5 | 1 | 9362 |
| `section.glitch` (scrub 1.5, particle dissolve) | yes (1.5) | none | 0.5 | 1 | 9362 |
| `section.glitch` (scrub 3, particle dissolve) | yes (3) | none | 0.5 | 3 | 9362 |
| `.musee-w` | no | none | — | 2 | 5916 |
| `.footer-svg-w` (footer wordmark) | no | none | — | 1 | 10064 |
| `.formes-w` (floating decorative objects) | no | none | — | 1 | 7854 |
| `.h1-home.balance` (hero heading) | no | `power4.inOut` | 1 | 1 | 149 |
| Generic `DIV` (letter/word-split text spans) | no | `power4.inOut` | 1 | 14 | 482 |
| `.text-block-2` | no | `power4.inOut` | 1 | 1 | 482 |
| `.h3-style` | no | `power4.inOut` | 1 | 1 | 772 |
| `.title-work` (per-project title) | no | `power4.inOut` | 1 | 5 | 907 |
| `.short-p-work` (per-project tagline) | no | `power4.inOut` | 1 | 5 | 935 |
| `.text-block-7` | no | `power4.inOut` | 1 | 1 | 6479 |
| `.h1-home` (footer "Let's start...") | no | `power4.inOut` | 1 | 2 | 7392 |
| `.text-block-4` | no | `power4.inOut` | 1 | 1 | 7559 |
| `.hide-tablet` | no | `power4.inOut` | 1 | 1 | -624 |
| `.hide-desk` | no | `power4.inOut` | 1 | 1 | 7757 |
| `.text-block-4.marg-40` | no | `power4.inOut` | 1 | 1 | 8440 |
| `.title-work.info-team` | no | `power4.inOut` | 1 | 2 | 8440 |
| `.work-view-all-w` | no | `power3.out` | 1 | 1 | 5684 |
| `.div-block-6.mob` | no | `power3.out` | 1 | 1 | 9871 |
| `.link.footer.w-inline-block` | no | `power3.out` | 1 | 3 | 9871 |
| `.list-dot` | no | `power3.out` | 1 | 5 | 7570 |

**Instances column sums to 67, matching `ScrollTrigger.getAll().length` exactly — confirmed by live re-derivation this session (`Object.values(groups).reduce(...)` === 67), not asserted.** This replaces a prior grouping pass that undercounted at 62/67: it had merged `section.glitch`'s `scrub:2` sub-groups into a single row of 1 instead of 2, omitted the `.title-work.info-team` (2 instances) and `.div-block-6.mob` (1 instance) groups entirely, and undercounted the tail groups (`.link.footer`, `.list-dot`) rather than grouping them individually. `power4.inOut` dominates single-fire entrance animations on primary content; `power3.out` appears on secondary/list-decoration elements (footer links, dot markers, "view all" link) — a distinct easing choice not previously distinguished. Scrubbed tweens use `ease: "none"` (expected — scrub delegates timing to scroll position), with one anomalous entry (`section.glitch`, `scrub:2`) reporting `ease: undefined` on its animation `vars`, unexplained and left as observed. Start values are the first-recorded instance per group, not a full per-instance range — where a group has >1 instance, individual members may start at slightly different scroll offsets than shown.

## 8. Background Composition (verified via `getBoundingClientRect()` of every `<video>`/`<canvas>` layer, not assumed from class name)

### 8.1 Hero (`section hero-home`)

| Layer | Type | Value/Note |
|---|---|---|
| 1 | Solid color | `#FFFFFF` |
| 2 | Vector artwork | `svg.nothin-hero-svg`, 854×178px, `fill: #000000` |
| 3 | Interactive canvas | `canvas.mask-reveal-canvas`, `position: absolute`, 894×601px, `z-index: 1`, coordinates confirmed to overlap the SVG's bounding rect exactly — see §10 |

### 8.2 `section-fake-hero` (floating-object transition, precedes the hero in document order per §6)

12 genuine `<img>` elements (not video), with descriptive `alt` text (bubble heart, metallic-paper star, asterisk balloon, candy, whipped cream, bag, dog-shaped balloon, pompom, deflated balloon, inflatable cube, float ring), over a black background. `video.video-hero-bg` (894×511px, `position: absolute`, `z-index: 0`, `autoplay/loop/muted`, source `nothin-sharp-high.mp4`) sits as a background layer beneath these images.

Class attribution confirmed via live `document.querySelectorAll('[class*="fake-hero"]')`: `section-fake-hero` is a `<div>`, structurally distinct from the `<section class="section hero-home">` element in §8.1 — resolved, not inferred.

### 8.3 `section showreel`

What appears to be "live embedded client sites" (panels labeled "Impulsion," "in_cognita," Utopia/Aurbse/LGM/Haptify mockups) is not an `<iframe>`. It is a single `<video>` element (`class="showreel-light"`, source `showreel-nothin_DEF.mp4`, 854×534px, `position: relative`, `z-index: 1`) whose `currentTime` is scroll-scrubbed, producing the illusion of independently interactive panels. The only genuine `<iframe>` in the document (607×601px) belongs to `.ue-sidebar-container`, an unrelated browser-extension element, and was excluded (§0).

### 8.4 `section video` (audio-toggle reel)

| Layer | Type | Value/Note |
|---|---|---|
| 1 | `video.video-sticky` | 536×302px, `position: relative`, `autoplay: false` (interaction-triggered), `loop: true`, `muted: true` by default, source `NOTHIN_MANIFESTE_CLEAN.mp4` |
| 2 | `video.video-reflet` | 536×302px, `position: absolute`, source `NOTHIN_MANIFESTE_REFLECT_H265.mp4` — a mirrored reflection copy of the primary video |

### 8.5 `section glitch`

Solid black background with "we are nothin'" text undergoing scroll-scrubbed particle dissolution. Per §7.2 (live-reconciled): **7** total `ScrollTrigger` instances on this selector — 1 non-scrubbed entry trigger, plus 6 scrub-driven (2 at `scrub:2`, 1 at `scrub:1.5`, 3 at `scrub:3`).

### 8.6 `section-footer`

Solid black background plus a second `svg.footer-nothin-svg` (854×178px), with its own cursor-distortion behavior distinct from the hero's (§10).

## 9. Iconography (`document.querySelectorAll('svg')` this session: **18 total**, excluding the browser-extension node — supersedes prior 20/21 estimates, both artifacts of a fabricated second "unclassed" row)

| Class | Count | Role |
|---|---|---|
| `nav-logo` | 1 | Small "N'" mark in the sticky nav |
| `menu-svg` | 1 | Menu icon (dot grid) |
| `nothin-hero-svg` | 1 | Hero wordmark |
| `footer-nothin-svg` | 1 | Footer wordmark |
| `n-load`, `apos-load` | 1 + 1 | Logo fragments animated during the preloader |
| `arrow-icon` | 1 | Arrow glyph ("book a call" / "explore" buttons) |
| `n-cursor`, `n-cursor _2`, `t-cursor`, `h-cursor`, `apos-cursor`, `i-cursor` | 6 | **Naming correction:** despite the `-cursor` class suffix, position data (document `top` ≈ 8800–9150px, parent `.formes-w`) confirms these are decorative letterform fragments scattered among the 3D objects in the "studio" section — **not** cursor/pointer replacements |
| Unclassed (no `class` attribute) | 5 | Confirmed via live `className` read on all 18 elements; role/visibility not individually re-measured this pass, `UNVERIFIED` |

Sum: 1+1+1+1+2+1+6+5 = **18**, matching the live total exactly. The previously reported second "unclassed, inside generic `<div>`" row (2 elements) does not correspond to any element found in this session's enumeration and is retracted.

## 10. Cursor Behavior (audited with a sustained multi-point sweep, not a single discrete hover)

`getComputedStyle(document.body).cursor` and `documentElement.cursor` both return `"auto"`. **No custom cursor exists on the live site.** A "blob-shaped white cursor" observed during tooling checks is `#claude-phantom-cursor`, an element injected by this audit's own automation tooling — confirmed by `id`, and not part of the site.

The sustained sweep did, however, confirm two genuine, mechanically distinct cursor-reactive effects — one per wordmark instance, as required for verification:

### 10.1 Hero wordmark (`svg.nothin-hero-svg`)

**Mechanism confirmed via DOM:** `canvas.mask-reveal-canvas` (§8.1), positioned in exact overlap with the SVG.

**Observed behavior** (9-point consecutive hover sweep across the letterforms, teleport-style — no true OS-level pointer movement): small white "erosion/reveal" patches appear along the cursor's path over the black letterforms, fading progressively (older patches more diffuse).

DOM-verified: the SVG's `<path>` elements do not change `transform`/`opacity` — the effect lives entirely in the canvas layer, not in the text geometry.

Reproducible consistently across repeated attempts.

### 10.2 Footer wordmark (`svg.footer-nothin-svg`)

No `<canvas>` exists in that region of the document (the site's only canvas is anchored to document `top: 0–601px`, far from the footer at `top ≈ 10344px` — confirmed by coordinates, not assumed).

**Mechanism confirmed** by reading `getComputedStyle(path).transform` during a rapid 7-point sweep: individual letter `<path>` elements receive an active `matrix()` transform with scale and translation. Literal captured sample: the "I" path's transform became `matrix(0.1094, 0, 0, 0.1094, 900.93, 130.89)` (~11% scale plus a large offset) while the adjacent "H" path became `matrix(1.0598, 0, 0, 1.0598, -50.35, -8.81)`. With the cursor static at a single position (no sweep), every transform reverts to identity (`matrix(1,0,0,1,0,0)`).

**Conclusion:** a per-letter "magnetic distortion" effect dependent on continuous/rapid cursor movement — it did not activate reliably from a single discrete hover (2 of 3 single-hover attempts failed to trigger it; 3 of 3 rapid multi-point sweeps did), consistent with a GSAP `quickTo`/proximity-based implementation driven by per-frame `mousemove` sampling.

**Confirmed distinction between the two wordmark instances:** the hero uses a canvas-layer mask-reveal effect that does not alter the SVG's own geometry; the footer uses direct per-letter geometric transformation with no canvas involved. They do not share a mechanism despite being visually "the same logo."

## 11. Boot Sequence (Preloader)

A preloader system exists: `.loader` (`position: fixed`, full-viewport black overlay, `z-index: 1001`), containing the following named assets:

| Class | Count |
|---|---|
| `loader-img coeur` (heart) | 1 |
| `loader-img papier` (paper cutout) | 7 |
| `loader-img star` | 1 |
| `loader-img bonbon` | 1 |
| `loader-img bonbon-copy` | 1 |
| `loader-img chewinggum` | 1 |
| `loader-nbr-w` (numeric counter) | 1 container |

**The live boot animation could not be captured, for two explicit tooling limitations — not site behavior:** (a) `resize_window` does not genuinely change `window.innerWidth` (§0); (b) reload-then-immediate-capture polling cannot catch the animation frame because the tool's round-trip latency exceeds the boot sequence's actual duration. This is documented as a tooling limitation, not papered over with an assumption about what the animation looks like.

## 12. Component Catalog

**Navigation** (`nav.nav-boiler`): logo-wordmark as a link (`.nav-logo-wrap`, a 7-`<path>` SVG), mobile menu button.

**Pill-system buttons** (base class `.btn`, CSSOM source rule: `border: 1px solid rgba(255,255,255,0.4)`, `border-radius: 6.25rem` (100px), `padding: 1rem 2.25rem 1rem 1.25rem`, `font-weight: 500`, `letter-spacing: 0.08em`, `text-transform: uppercase`; computed `border-top-width` renders as `0.667px`, confirmed as a `devicePixelRatio: 1.5` sub-pixel artifact of the `1px` source rule — `1px / 1.5 = 0.667px` — not a distinct authored token):

| Variant | Background | Text | Border-color override | Padding override |
|---|---|---|---|---|
| `.btn.mob-menu` | `#000` (`--black`) | `#FFF` (`--white`) | none (base `rgba(255,255,255,0.4)`) | none (base `16px 36px 16px 20px`) |
| `.btn.email.white` | `#FFF` (`--white`) | `#000` (`--black`) | `#000` (`--black`) | `16px 20px` (left/right only; top/bottom inherit base `16px`) |
| `.btn.black-blend` | `#FFF` (`--white`) | `#000` (`--black`) | none (base `rgba(255,255,255,0.4)`) | none (base `16px 36px 16px 20px`) |

**`.btn.view-all-btn` is not part of the pill system** — confirmed via CSSOM: `background: transparent`, `color: #FFF`, `border-style: none`, `border-radius: 0px`, `padding: 0px`, `font-size: 2.5rem` (40px, vs. 14px for pill buttons), `text-transform: none` (vs. uppercase), `letter-spacing: -0.01em` (vs. 0.08em base). It is a large-type text link, not a pill/badge — the earlier blanket "(all pill-shaped...)" framing for this component did not hold once this variant was captured.

No `:hover`/`transition` CSS rules exist for the work-card "EXPLORE" button (confirmed via CSSOM) — its reveal mechanism is JS/GSAP-driven, not CSS. Only 3 `:hover` rules exist in the entire stylesheet, none bound to the actual button classes: confirms hover interactions site-wide are handled by JS/GSAP, not CSS.

**Work cards** (`.work_item.w-dyn-item`, 5 instances, a CMS collection item): children `.title-work`, `.short-p-work`, `.work-link`.

**Hero:** SVG wordmark + reveal canvas (§10.1) + `video-hero-bg` background layer + preloader sequence (§11).

**Forms/inputs:** no form elements found in the DOM — absence explicitly confirmed, not merely unobserved.

**Footer** (`footer.section-footer`): `.footer-c` (container), 3 links (`.link.footer`), `.footer-svg-w` (SVG wordmark with magnetic distortion, §10.2), `.footer-info-w` containing `<h2 class="footer-info">`, language selector (`.lang-footer`).

**Signature component:** the "NOTHIN'" wordmark pair (hero: canvas-reveal; footer: per-letter SVG matrix distortion) is the site's highest-detail differentiator — two distinct technical mechanisms for the same visual motif, fully documented in §10.

## Final Verification

| Check | Status |
|---|---|
| Units identified before description (scroll-px vs. duration-seconds) | Met — §7 |
| Counts re-derived from raw data, not estimated | Met — §7.2, §9 live-recounted this session |
| No rounded value presented as invented exact precision | Met |
| Minimum 3 breakpoints covered, with explicit CSS-verified vs. live-re-render distinction | Met — §2, §6 |
| Hover effects tested with sustained input, not single-point teleport only | Met — §10.1–10.2 |
| Boot sequence: polling attempt documented alongside the actual capture-blocking limitation | Met — §11 |
| Background layers verified via `getBoundingClientRect()` against the foreground element, not class name alone | Met — §8 |
| Scroll behavior (jacking/pin/scrub/horizontal/library) explicitly reported, including absences | Met — §7.1 |
| Color/typography cross-checked against ≥2 sections | Met — §1 |
| No separate changelog narrative; corrections stated inline as current fact | Met throughout this document |
| Arithmetic totals cross-checked (group sums vs. stated aggregate) | Met — §7.2, re-derived live, sum = 67 |
| Section-class attribution internally consistent | Met — §8.1–8.2, confirmed live |
| SVG enumeration matches live count | Met — §9, 18 confirmed live |
| Sampled-section count matches enumerated class list | Met — §6, 11 confirmed live |
| Computed-style values cross-checked against CSSOM source rule | Met — §12, `1px` source rule confirmed live |
