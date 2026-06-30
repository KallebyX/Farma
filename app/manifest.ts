import type { MetadataRoute } from "next";

/** PWA manifest — makes Farma installable (patient app + staff panel). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Farma — Meu Prontuário",
    short_name: "Farma",
    description: "Adesão ao tratamento, saúde conectada e recompensas — no seu bolso.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#0ABF77",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
