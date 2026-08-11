// Problem statement (agitation, no features named yet) — content-brief.md
// §2 "Problema". Lead paragraph is verbatim; the three pain points are the
// brief's three fragments turned into list items without adding new claims.
export function PulseProblemStatement() {
  return (
    <section aria-labelledby="pulse-problem-heading" className="grid grid-cols-12 gap-4">
      <h2 id="pulse-problem-heading" className="col-span-12 md:col-start-2 md:col-span-9 text-h2 font-grotesk">
        Tu on-call de esta semana va a perder 40 minutos en cada incidente buscando qué deploy lo
        causó — información que ya está en tu propio repo.
      </h2>

      <ul className="col-span-12 md:col-start-2 md:col-span-9 mt-8 flex flex-col gap-4 list-none">
        <li className="border-t border-black pt-4 text-body font-grotesk">
          Alertas sin contexto.
        </li>
        <li className="border-t border-black pt-4 text-body font-grotesk">
          Root cause por prueba y error.
        </li>
        <li className="border-t border-black pt-4 text-body font-grotesk">
          Postmortems que se escriben (o no) tres días después, cuando ya nadie recuerda nada.
        </li>
      </ul>
    </section>
  );
}
