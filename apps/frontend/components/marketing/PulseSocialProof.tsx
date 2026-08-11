// Social proof — content-brief.md §2 "Prueba social". Three beta-company
// placeholder marks (brief specifies literal "Empresa A/B/C" placeholders,
// no real logo assets exist yet) plus the quote, kept as a separate section
// from PulseTestimonial's blockquote per the brief's own section split.
// Motion pass: each mark reveals with a staggered delay, and gets a
// zero-radius hover invert (bg/text swap) as a cheap CSS-only
// micro-interaction — no JS needed for the hover itself.
import { ScrollReveal } from "@/components/ui/ScrollReveal";

const companies = ["Empresa A", "Empresa B", "Empresa C"];

export function PulseSocialProof() {
  return (
    <section aria-label="Empresas que usan Pulse en beta" className="grid grid-cols-12 gap-4">
      <ul className="col-span-12 flex flex-wrap gap-4 list-none">
        {companies.map((company, i) => (
          <ScrollReveal
            key={company}
            as="li"
            delay={i * 0.06}
            className="border border-black px-6 py-4 font-mono text-label uppercase tracking-[0.08em] transition-colors duration-300 hover:bg-black hover:text-white"
          >
            {company}
          </ScrollReveal>
        ))}
      </ul>
    </section>
  );
}
