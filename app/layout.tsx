import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PwaRegister } from "@/components/pwa/pwa-register";

export const metadata: Metadata = {
  title: "Farma · Adesão e Farmacovigilância",
  description: "Plataforma de adesão a tratamento e farmacovigilância para farmácias",
  applicationName: "Farma",
  appleWebApp: { capable: true, title: "Farma", statusBarStyle: "default" },
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#0ABF77",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // TechBem/HIG uses San Francisco via the system font stack (see tailwind
  // `fontFamily.sans`) — no embeddable webfont, so no external font links.
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
