// Testimonial — single quote, asymmetric placement, semantic <blockquote>.
export function PulseTestimonial() {
  return (
    <section aria-label="Testimonio" className="grid grid-cols-12 gap-4">
      <blockquote className="col-span-12 md:col-start-2 md:col-span-9 border-l border-black pl-6">
        <p className="text-h2 font-grotesk">
          &ldquo;Bajamos el MTTR de 45 a 12 minutos en el primer mes.&rdquo;
        </p>
        <footer className="mt-4 font-mono text-label uppercase tracking-[0.08em]">
          — VP Engineering, Empresa A
        </footer>
      </blockquote>
    </section>
  );
}
