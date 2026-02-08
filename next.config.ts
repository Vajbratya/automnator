import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // This repo lives inside another directory that also has a lockfile; make
  // sure Turbopack treats this folder as the workspace root.
  turbopack: { root: rootDir },
};

export default nextConfig;
