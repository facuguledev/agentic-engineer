import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from "@/lib/api/query-provider";
import { AppChrome } from "@/components/AppChrome";

export const metadata: Metadata = {
  title: "Agentic Engineer",
  description: "Multi-tenant project & task workspace",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>
          <AppChrome>{children}</AppChrome>
        </QueryProvider>
      </body>
    </html>
  );
}
