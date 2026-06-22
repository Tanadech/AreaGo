/** @type {import('next').NextConfig} */
const nextConfig = {
  // Produce a self-contained build under .next/standalone for minimal Docker images.
  output: "standalone",
  reactStrictMode: true,
  // Pin the tracing root to THIS app dir (not process.cwd()) so the standalone
  // server.js always lands at .next/standalone/server.js regardless of the dir
  // the build is invoked from. import.meta.dirname needs Node >= 20.11 (we use 22).
  outputFileTracingRoot: import.meta.dirname,
};

export default nextConfig;
