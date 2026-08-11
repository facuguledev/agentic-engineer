// Interactive component — zero-radius rule (ADR-0001, item 3, replaces the
// superseded 100px pill-radius system). :focus-visible is never suppressed.
"use client";

import { forwardRef } from "react";

type ButtonVariant = "primary" | "secondary" | "text-link";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const base = "font-grotesk uppercase tracking-[0.08em] transition-colors duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-40 disabled:pointer-events-none";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-black text-white border border-black px-9 py-4 text-label hover:bg-white hover:text-black",
  secondary: "bg-white text-black border border-black px-9 py-4 text-label hover:bg-black hover:text-white",
  "text-link": "bg-transparent text-black border-none normal-case tracking-normal text-h2 p-0 hover:underline hover:text-accent",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", className = "", ...props },
  ref
) {
  return <button ref={ref} className={`${base} ${variants[variant]} ${className}`} {...props} />;
});
