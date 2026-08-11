// Pulse marketing landing page — isolated demo route, does not touch or
// collide with the real app's "/" ProjectsPage. Fully static marketing
// copy: no data contract, no fetch hooks, no auth/session logic (see
// INGEST_CONTRACT note below).
//
// INGEST_CONTRACT: this route consumes no data from contracts/api-specs/ —
// it is pure static marketing content approved in content-brief.md. No
// contract gap; nothing invented.
//
// OPEN ITEM (not resolved here): content-brief.md §4 calls for a dark
// palette by default. That's a page/site-level theme decision — the
// shared Button component (components/ui/Button.tsx) hardcodes
// black/white per variant, and globals.css hardcodes a light color-scheme
// site-wide. Forking Button or globals.css for a single route would be a
// one-off outside the "no ratified component catalog yet" constraint
// (ADR-0001). This route ships on the same light black/white system as
// the rest of the app; dark-by-default is deferred to the design-system
// phase referenced in the brief's own "próximo paso" (fase 2), alongside
// the accent color and typeface open items.
import type { Metadata } from "next";
import { PulseHero } from "@/components/marketing/PulseHero";
import { PulseProblemStatement } from "@/components/marketing/PulseProblemStatement";
import { PulseHowItWorks } from "@/components/marketing/PulseHowItWorks";
import { PulseSocialProof } from "@/components/marketing/PulseSocialProof";
import { PulseTestimonial } from "@/components/marketing/PulseTestimonial";
import { PulseFeatures } from "@/components/marketing/PulseFeatures";
import { PulsePricing } from "@/components/marketing/PulsePricing";
import { PulseClosingCta } from "@/components/marketing/PulseClosingCta";
import { PulseFooter } from "@/components/marketing/PulseFooter";

export const metadata: Metadata = {
  title: "Pulse — Triage antes de Slack",
  description:
    "Pulse lee tus alertas, encuentra el commit sospechoso y arma el primer borrador del postmortem — todo antes de que termines de servirte el café.",
};

export default function PulseLandingPage() {
  return (
    <div lang="es" className="flex flex-col gap-24 md:gap-32">
      <PulseHero />
      <PulseProblemStatement />
      <PulseHowItWorks />
      <PulseSocialProof />
      <PulseTestimonial />
      <PulseFeatures />
      <PulsePricing />
      <PulseClosingCta />
      <PulseFooter />
    </div>
  );
}
