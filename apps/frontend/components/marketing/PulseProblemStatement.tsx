// Problem statement (agitation, no features named yet) — content-brief.md
// §2 "Problema". Lead paragraph is verbatim; the three pain points are the
// brief's three fragments turned into list items without adding new claims.
// Scroll-reveal added per motion pass (ADR-0001 toggleActions default):
// heading and list stagger in on their own triggers rather than as one block.
import { ScrollReveal } from "@/components/ui/ScrollReveal";

export function PulseProblemStatement() {
  return (
    <section aria-labelledby="pulse-problem-heading" className="grid grid-cols-12 gap-4">
      <ScrollReveal
        as="h2"
        id="pulse-problem-heading"
        className="col-span-12 md:col-start-2 md:col-span-9 text-h2 font-grotesk"
      >
        Tu on-call de esta semana va a perder 40 minutos en cada incidente buscando qué deploy lo
        causó — información que ya está en tu propio repo.
      </ScrollReveal>

      <ul className="col-span-12 md:col-start-2 md:col-span-9 mt-8 flex flex-col gap-4 list-none">
        {[
          "Alertas sin contexto.",
          "Root cause por prueba y error.",
          "Postmortems que se escriben (o no) tres días después, cuando ya nadie recuerda nada.",
        ].map((line, i) => (
          <ScrollReveal
            key={line}
            as="li"
            delay={i * 0.08}
            className="border-t border-black pt-4 text-body font-grotesk"
          >
            {line}
          </ScrollReveal>
        ))}
      </ul>
    </section>
  );
}
