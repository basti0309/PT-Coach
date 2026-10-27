import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Die KI-Prompt-Vorlage wird zur Laufzeit aus docs/ gelesen und muss
  // deshalb im Vercel-Deployment enthalten sein.
  outputFileTracingIncludes: {
    "/coach/**": ["./docs/ki-prompt-vorlage.md"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
