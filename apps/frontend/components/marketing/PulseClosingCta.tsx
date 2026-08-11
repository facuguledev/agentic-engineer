// Closing CTA — content-brief.md §2 "CTA final". Large display-role
// headline via SplitText (second and last use of the char-stagger reveal
// on this page, per the brief). Copy verbatim: headline and button text.
"use client";

import { Button } from "@/components/ui/Button";
import { SplitText } from "@/components/ui/SplitText";

export function PulseClosingCta() {
  return (
    <section aria-labelledby="pulse-closing-heading" className="grid grid-cols-12 gap-4 items-center">
      <SplitText
        as="h2"
        className="col-span-12 md:col-span-8 text-display font-grotesk block"
      >
        Tu próximo incidente va a pasar igual. La pregunta es cuánto tarda tu equipo en
        entenderlo.
      </SplitText>
      <div className="col-span-12 md:col-span-4 md:justify-self-end">
        <Button variant="primary">Conectar mi primer canal de alertas</Button>
      </div>
    </section>
  );
}
