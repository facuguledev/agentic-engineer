// How it works — 3 numbered items with label-role monospace numerals,
// placed asymmetrically across the 12-col grid rather than a centered
// 3-up list (per ADR-0001 correction #1: asymmetry is a placement property).
// Copy verbatim from content-brief.md §2 "Cómo funciona".
// Motion pass: heading and each step reveal on their own scroll trigger,
// staggered — reinforces the asymmetric stagger already present in layout.
import { ScrollReveal } from "@/components/ui/ScrollReveal";

const steps = [
  {
    number: "01",
    text: "Conectá tu stack de observability (Sentry, Datadog, PagerDuty) — 5 minutos, sin agente en producción.",
  },
  {
    number: "02",
    text: "Pulse correlaciona cada alerta con los commits y deploys recientes del servicio afectado.",
  },
  {
    number: "03",
    text: "Recibís un draft de root cause y postmortem en el canal del incidente, editable antes de publicar.",
  },
];

export function PulseHowItWorks() {
  return (
    <section aria-labelledby="pulse-how-heading" className="grid grid-cols-12 gap-4">
      <ScrollReveal
        as="h2"
        id="pulse-how-heading"
        className="col-span-12 md:col-span-5 text-h2 font-grotesk"
      >
        Cómo funciona
      </ScrollReveal>

      <ol className="col-span-12 md:col-start-1 md:col-span-12 grid grid-cols-12 gap-4 mt-6 list-none">
        {steps.map((step, i) => (
          <ScrollReveal
            key={step.number}
            as="li"
            delay={0.1 + i * 0.1}
            className={
              "border-t border-black pt-4 col-span-12 md:col-span-4" +
              (i === 1 ? " md:col-start-5 md:mt-10" : i === 2 ? " md:col-start-9" : "")
            }
          >
            <span className="font-mono text-label uppercase tracking-[0.08em]" aria-hidden="true">
              {step.number}
            </span>
            <p className="mt-2 text-body font-grotesk">{step.text}</p>
          </ScrollReveal>
        ))}
      </ol>
    </section>
  );
}
