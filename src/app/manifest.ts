import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "EggSys - Registro de Gastos Personales",
    short_name: "EggSys",
    description:
      "Controla y haz seguimiento de tus finanzas personales de forma rápida y sencilla.",
    start_url: "/?source=pwa",
    id: "eggsys-app-v1",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    background_color: "#ffffff",
    theme_color: "#0ea5a4",
    lang: "es",
    dir: "ltr",

    launch_handler: {
      client_mode: "navigate-existing",
    },

    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    screenshots: [
      // Capturas Móviles
      {
        src: "/screenshots/screen1.png",
        sizes: "1080x1920",
        type: "image/png",
        form_factor: "narrow",
      },
      {
        src: "/screenshots/screen2.png",
        sizes: "1080x1920",
        type: "image/png",
        form_factor: "narrow",
      },
      // Captura para Escritorio / Tablet
      {
        src: "/screenshots/desktop-screen.png",
        sizes: "1920x1080",
        type: "image/png",
        form_factor: "wide",
      },
    ],
    categories: ["finance", "productivity", "utilities"],
    orientation: "portrait",
    shortcuts: [
      {
        name: "Añadir gasto",
        short_name: "Nuevo gasto",
        description: "Registra un gasto rápidamente",
        url: "/dashboard?source=pwa-shortcut",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Ver reportes",
        short_name: "Reportes",
        description: "Revisa tus estadísticas mensuales",
        url: "/graphics?source=pwa-shortcut",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
    ],
  } as MetadataRoute.Manifest;
}
