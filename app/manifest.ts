import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SummerSplash — Beach Festival Access",
    short_name: "SummerSplash",
    description: "Book slots, view QR passes, and manage your SummerSplash entry.",
    start_url: "/my-passes",
    display: "standalone",
    background_color: "#f5a623",
    theme_color: "#e85d04",
    orientation: "portrait",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
