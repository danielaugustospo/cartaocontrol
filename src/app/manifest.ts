import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CartãoControl",
    short_name: "Cartões",
    description: "Controle pessoal de cartões de crédito, faturas, parcelas e recorrências.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#f1f5f9",
    theme_color: "#0f766e",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icons/icon-192.svg",
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
    categories: ["finance", "productivity"],
  };
}
