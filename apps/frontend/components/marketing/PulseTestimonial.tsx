// Testimonial — single quote, asymmetric placement, semantic <blockquote>.
// Motion pass: reveal on scroll, matching the rest of the page's rhythm.
import { ScrollReveal } from "@/components/ui/ScrollReveal";

export function PulseTestimonial() {
  return (
    <section aria-label="Testimonio" className="grid grid-cols-12 gap-4">
      <ScrollReveal
        as="blockquote"
        className="col-span-12 md:col-start-2 md:col-span-9 border-l-2 border-accent pl-6"
      >
        <p className="text-h2 font-grotesk">
          &ldquo;Bajamos el MTTR de 45 a 12 minutos en el primer mes.&rdquo;
        </p>
        <footer className="mt-4 font-mono text-label uppercase tracking-[0.08em]">
          — VP Engineering, Empresa A
        </footer>
      </ScrollReveal>
    </section>
  );
}
