// Features grid of 4 — content-brief.md §2 "Features". Asymmetric emphasis:
// one dominant feature spans more columns and uses the larger h2/body
// tokens, the other three are smaller and stacked in the remaining
// columns. No new type tokens introduced — only h2/body/label from
// tailwind.config.ts are used.
// Motion pass: dominant card gets the page's one deliberate scrub trigger
// (ScrollScrub, ADR-0001's ~15% budget); secondary cards get the standard
// staggered toggle reveal plus a CSS-only hover border-thicken.
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { ScrollScrub } from "@/components/ui/ScrollScrub";

const secondaryFeatures = [
  {
    title: "Postmortem draft",
    text: "Genera el documento en el formato que ya usás, vos solo lo revisás.",
  },
  {
    title: "Sin agente invasivo",
    text: "Se conecta por API a lo que ya tenés corriendo, cero instrumentación nueva.",
  },
  {
    title: "Escalación inteligente",
    text: "Si la evidencia es ambigua, pregunta — nunca inventa una causa.",
  },
];

export function PulseFeatures() {
  return (
    <section aria-labelledby="pulse-features-heading" className="grid grid-cols-12 gap-4">
      <h2 id="pulse-features-heading" className="sr-only">
        Funcionalidades
      </h2>

      <ScrollScrub className="col-span-12 md:col-span-7 border border-black p-8">
        <p className="text-h2 font-grotesk">Root cause automático</p>
        <p className="mt-4 text-body font-grotesk">
          Cruza stack traces con el <code className="font-mono">git blame</code> del deploy
          correlacionado.
        </p>
      </ScrollScrub>

      <div className="col-span-12 md:col-span-5 grid grid-rows-3 gap-4">
        {secondaryFeatures.map((feature, i) => (
          <ScrollReveal
            key={feature.title}
            delay={i * 0.08}
            className="border border-black p-6 transition-colors duration-300 hover:border-2 hover:p-[23px]"
          >
            <p className="text-body font-grotesk uppercase tracking-[0.02em]">{feature.title}</p>
            <p className="mt-2 text-label font-grotesk normal-case tracking-normal">
              {feature.text}
            </p>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}
