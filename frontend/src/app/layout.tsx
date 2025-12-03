import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Banorte MCP Advanced",
  description: "Bayesian + RL financial advisor",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-slate-950 text-slate-50">{children}</body>
    </html>
  );
}
