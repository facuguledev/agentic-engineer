// Pricing — single plan, asymmetric placement. Secondary CTA reuses the
// existing Button "secondary" variant (already zero-radius, no fork).
// Motion pass: card reveals on scroll like the rest of the page.
import { Button } from "@/components/ui/Button";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

export function PulsePricing() {
  return (
    <section aria-labelledby="pulse-pricing-heading" className="grid grid-cols-12 gap-4">
      <ScrollReveal className="col-span-12 md:col-start-3 md:col-span-8 border border-black p-8">
        <h2 id="pulse-pricing-heading" className="text-h2 font-grotesk">
          Team
        </h2>
        <p className="mt-2 text-body font-grotesk">Precio por servicio monitoreado, no por seat.</p>
        <div className="mt-6">
          <Button variant="secondary">Hablar con nosotros</Button>
        </div>
      </ScrollReveal>
    </section>
  );
}
