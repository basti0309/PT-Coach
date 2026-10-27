import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PT-Coach",
    short_name: "PT-Coach",
    description: "Training, Pläne, Ziele und Fortschritt mit deinem Coach",
    lang: "de",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f6f8",
    theme_color: "#1f5bc4",
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png" },
      { src: "/icons/512", sizes: "512x512", type: "image/png" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
