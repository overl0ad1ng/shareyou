import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  redirects() {
    return [{ source: "/", destination: "/docs", permanent: false }];
  },
  outputFileTracingIncludes: {
    "/*": [
      "./content/**/*",
      "./codealtas.config.ts",
      // `codealtas.config.ts` is loaded at runtime by c12/jiti. If it uses
      // `defineConfig`, that import is invisible to Next's static tracing, so
      // keep the package's config entry in the trace as a safety net.
      "./node_modules/@code-altas/ui/package.json",
      "./node_modules/@code-altas/ui/dist/lib/**/*",
    ],
  },
  serverExternalPackages: ["c12", "jiti"],
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
