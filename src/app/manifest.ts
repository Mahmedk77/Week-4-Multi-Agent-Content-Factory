import type { MetadataRoute } from "next";

// Served at /manifest.webmanifest. Lets phones "Add to Home Screen" with the Draftloom icon and colors.
export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "Draftloom",
        short_name: "Draftloom",
        description: "Specialist agents research, write and fact-check a draft. Then you review it before anything is published.",
        start_url: "/",
        display: "standalone",
        background_color: "#F5F3EE",
        theme_color: "#0E6B5E",
        icons: [
            { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
            { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
            { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
    };
}
