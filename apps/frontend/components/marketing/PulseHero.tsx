// Hero section — Pulse marketing landing page.
// Copy is verbatim from the approved content brief (content-brief.md §2
// Hero) — headline, subheadline and both CTAs are not paraphrased.
// Headline uses SplitText (GSAP character-stagger reveal, ADR-0001) on the
// page's single <h1>. The timeline callout is a non-interactive visual
// element standing in for the brief's "timeline animado de un incidente
// real (alerta → root cause → postmortem)" — it stays binary black/white,
// the accent token is reserved for interactive-only signals per ADR-0001
// and is not used here.
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { SplitText } from "@/components/ui/SplitText";

const timeline = ["Alerta", "Root cause", "Postmortem"];

export function PulseHero() {
  return (
    <section aria-labelledby="pulse-hero-heading" className="grid grid-cols-12 gap-4 items-end">
      <div className="col-span-12 lg:col-span-8">
        <SplitText as="h1" className="text-display font-grotesk block">
          El incidente ya pasó por triage antes de que abras Slack.
        </SplitText>
        <p className="mt-6 max-w-xl text-body font-grotesk">
          Pulse lee tus alertas, encuentra el commit sospechoso y arma el primer borrador del
          postmortem — todo antes de que termines de servirte el café.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-6">
          <Button variant="primary">Conectar mi primer canal de alertas</Button>
          <Link
            href="#demo"
            className="font-grotesk text-body underline underline-offset-4 hover:no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            Ver un incidente resuelto en vivo
          </Link>
        </div>
      </div>

      <div
        className="col-span-12 lg:col-start-9 lg:col-span-4 border border-black p-6 self-start"
        aria-label="Timeline de un incidente: alerta, root cause, postmortem"
      >
        <p className="font-mono text-label uppercase tracking-[0.08em]">Timeline del incidente</p>
        <ol className="mt-4 flex flex-col gap-3">
          {timeline.map((step, i) => (
            <li key={step} className="flex items-center gap-3">
              <span className="font-mono text-label" aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="font-grotesk text-body">{step}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
