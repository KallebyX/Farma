import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Farma · Adesão e Farmacovigilância",
  description: "Plataforma de adesão a tratamento e farmacovigilância para farmácias",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
