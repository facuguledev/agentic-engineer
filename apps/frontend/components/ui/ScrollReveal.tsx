// Scroll-triggered reveal, single-fire by default (ADR-0001: toggleActions
// is the default entrance pattern, scrub reserved for ~15% of triggers —
// see PulseFeatures' dominant card for a scrub example). Respects
// prefers-reduced-motion by skipping the GSAP timeline entirely and
// rendering content at its resting state, never hidden.
//
// Polymorphic via `as` (default div) so it can render as <li>/<section>/etc.
// directly — a wrapper <div> between a <ul> and its <li> children breaks
// list semantics in the accessibility tree, which the a11y audit (ADR-0001,
// pr-checks.yml) would catch.
"use client";

import { useEffect, useRef, type ElementType, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export function ScrollReveal({
  children,
  delay = 0,
  className = "",
  as: Tag = "div",
  ...rest
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: ElementType;
  [key: string]: unknown;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = gsap.context(() => {
      gsap.from(el, {
        yPercent: 12,
        opacity: 0,
        duration: 0.7,
        delay,
        ease: "power3.out",
        scrollTrigger: {
          trigger: el,
          start: "top 85%",
          toggleActions: "play none none none",
        },
      });
    });

    return () => ctx.revert();
  }, [delay]);

  return (
    <Tag ref={ref} className={className} {...rest}>
      {children}
    </Tag>
  );
}
