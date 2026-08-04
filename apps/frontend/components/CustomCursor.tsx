// lerp-driven custom cursor with mix-blend-mode: difference (ADR-0001,
// item 5). Scoped to (pointer: fine) — touch devices get the system
// default. Never disables :focus-visible (handled purely in CSS, this
// component only draws the follower dot). Skipped entirely under
// prefers-reduced-motion.
"use client";

import { useEffect, useRef } from "react";

const LERP = 0.15;

export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    const dot = dotRef.current;
    if (!dot) return;

    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let x = targetX;
    let y = targetY;
    let frame: number;

    const handleMove = (e: PointerEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
    };

    const tick = () => {
      x += (targetX - x) * LERP;
      y += (targetY - y) * LERP;
      dot.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
      frame = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", handleMove);
    document.body.classList.add("cursor-enabled");
    frame = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("pointermove", handleMove);
      document.body.classList.remove("cursor-enabled");
      cancelAnimationFrame(frame);
    };
  }, []);

  return <div ref={dotRef} className="custom-cursor" aria-hidden="true" />;
}
