import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every page is per-user and dynamic; no partial prerendering.
  cacheComponents: false,
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
