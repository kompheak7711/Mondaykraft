import { spawnSync } from "node:child_process";
import { createSerwistRoute } from "@serwist/turbopack";

// Serves /serwist/sw.js, built from src/app/sw.ts. The provider in the root layout registers it in production.
const revision = spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout?.trim() || crypto.randomUUID();

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = createSerwistRoute({
  additionalPrecacheEntries: [{ url: "/~offline", revision }],
  swSrc: "src/app/sw.ts",
  useNativeEsbuild: true,
});
