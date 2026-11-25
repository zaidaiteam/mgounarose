import type { MetadataRoute } from "next";
export const dynamic = "force-static";
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/demo/", start_url: "/demo/", scope: "/demo/", name: "Rose Care Hub", short_name: "Rose Care",
    lang: "fr", display: "standalone", background_color: "#F7F4ED", theme_color: "#F7F4ED",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
