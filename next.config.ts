import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Die KI-Prompt-Vorlagen werden zur Laufzeit aus docs/ gelesen und müssen
  // deshalb im Vercel-Deployment enthalten sein.
  outputFileTracingIncludes: {
    "/coach/**": ["./docs/ki-prompt-vorlage.md", "./docs/ki-prompt-neuer-plan.md"],
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
