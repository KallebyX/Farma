import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Farma · Adesão e Farmacovigilância",
  description: "Plataforma de adesão a tratamento e farmacovigilância para farmácias",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      {/* eslint-disable @next/next/no-page-custom-font */}
      <head>
        <link rel="preconnect" href="https://api.fontshare.com" crossOrigin="anonymous"/>
        <link rel="preconnect" href="https://fonts.googleapis.com" crossOrigin="anonymous"/>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/>
        <link href="https://api.fontshare.com/v2/css?f[]=general-sans@400,500,600,700&display=swap" rel="stylesheet"/>
        <link href="https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet"/>
      </head>
      {/* eslint-enable @next/next/no-page-custom-font */}
      <body>{children}</body>
    </html>
  );
}
