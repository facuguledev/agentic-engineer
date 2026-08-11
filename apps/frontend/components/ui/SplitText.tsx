// GSAP SplitText character-stagger reveal (ADR-0001). SplitText and all
// other former Club GreenSock plugins have been free for commercial use
// since April 2025 — no licensing flag required (ADR-0001, item 2).
//
// prefers-reduced-motion is checked before any GSAP timeline runs; a visual
// pivot does not waive accessibility compliance (ADR-0001, item 4).
"use client";

import { useEffect, useRef, type ElementType } from "react";
import gsap from "gsap";
import { SplitText as GsapSplitText } from "gsap/SplitText";

if (typeof window !== "undefined") {
  gsap.registerPlugin(GsapSplitText);
}

export function SplitText({
  as: Tag = "h1",
  className = "",
  children,
}: {
  as?: ElementType;
  className?: string;
  children: string;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    // type: "words, chars" (not just "chars") wraps each word in its own
    // span before splitting into characters — without the word-level
    // wrapper, the browser can break a line between any two character
    // spans, including mid-word. This was a real bug (title text splitting
    // words across lines in production), not a styling nit.
    const split = new GsapSplitText(el, { type: "words, chars" });
    const tween = gsap.from(split.chars, {
      yPercent: 110,
      opacity: 0,
      duration: 0.6,
      stagger: 0.02,
      ease: "power4.inOut",
    });

    return () => {
      tween.kill();
      split.revert();
    };
  }, [children]);

  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
}
