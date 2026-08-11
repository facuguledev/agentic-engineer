// Scrub-tied reveal — deliberately used sparingly (ADR-0001: scrub reserved
// for ~15% of triggers, toggleActions is the default everywhere else).
// This is the one Pulse usage: the dominant feature card gets a subtle
// scroll-linked scale, tying its emphasis to scroll position instead of a
// one-shot entrance. Respects prefers-reduced-motion.
"use client";

import { useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export function ScrollScrub({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { scale: 0.96, opacity: 0.6 },
        {
          scale: 1,
          opacity: 1,
          ease: "none",
          scrollTrigger: {
            trigger: el,
            start: "top 90%",
            end: "top 45%",
            scrub: 0.4,
          },
        }
      );
    });

    return () => ctx.revert();
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
