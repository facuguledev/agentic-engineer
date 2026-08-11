import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/lib/api/query-provider";
import { AppChrome } from "@/components/AppChrome";

// Typeface decision (closes ADR-0001 open item #1): Space Grotesk — variable,
// geometric grotesk, free (Google Fonts), fits the brutalist/grid system.
// Exposed as a CSS variable and wired into tailwind.config.ts's
// fontFamily.grotesk so every `font-grotesk` usage resolves to it, with the
// previous system-ui stack kept only as the load-failure fallback.
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Agentic Engineer",
  description: "Multi-tenant project & task workspace",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={spaceGrotesk.variable}>
      <body>
        <QueryProvider>
          <AppChrome>{children}</AppChrome>
        </QueryProvider>
      </body>
    </html>
  );
}
