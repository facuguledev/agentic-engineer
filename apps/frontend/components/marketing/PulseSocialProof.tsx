// Social proof — content-brief.md §2 "Prueba social". Three beta-company
// placeholder marks (brief specifies literal "Empresa A/B/C" placeholders,
// no real logo assets exist yet) plus the quote, kept as a separate section
// from PulseTestimonial's blockquote per the brief's own section split.
const companies = ["Empresa A", "Empresa B", "Empresa C"];

export function PulseSocialProof() {
  return (
    <section aria-label="Empresas que usan Pulse en beta" className="grid grid-cols-12 gap-4">
      <ul className="col-span-12 flex flex-wrap gap-4 list-none">
        {companies.map((company) => (
          <li
            key={company}
            className="border border-black px-6 py-4 font-mono text-label uppercase tracking-[0.08em]"
          >
            {company}
          </li>
        ))}
      </ul>
    </section>
  );
}
