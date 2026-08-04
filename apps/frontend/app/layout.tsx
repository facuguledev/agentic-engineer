import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from "@/lib/api/query-provider";
import { CustomCursor } from "@/components/CustomCursor";
import { Nav } from "@/components/Nav";

export const metadata: Metadata = {
  title: "Agentic Engineer",
  description: "Multi-tenant project & task workspace",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>
          <CustomCursor />
          <Nav />
          <main className="px-6 py-10">{children}</main>
        </QueryProvider>
      </body>
    </html>
  );
}
