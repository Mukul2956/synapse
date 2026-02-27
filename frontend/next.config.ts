import type { NextConfig } from "next";

/*
 * Each microservice backend has its own URL.
 * Set the env vars per-service; defaults assume local dev ports.
 *
 *   FORGE_BACKEND_URL   – Content transformation pipeline
 *   GENESIS_BACKEND_URL – Ideation & research
 *   PULSE_BACKEND_URL   – Analytics
 *   ORBIT_BACKEND_URL   – Distribution & scheduling
 */
const FORGE_BACKEND_URL =
  process.env.FORGE_BACKEND_URL || "http://localhost:8000";
const GENESIS_BACKEND_URL =
  process.env.GENESIS_BACKEND_URL || "http://localhost:8001";
const PULSE_BACKEND_URL =
  process.env.PULSE_BACKEND_URL || "http://localhost:8002";
const ORBIT_BACKEND_URL =
  process.env.ORBIT_BACKEND_URL || "http://localhost:8003";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      /* ── Forge ───────────────────────────────────── */
      {
        source: "/api/forge/:path*",
        destination: `${FORGE_BACKEND_URL}/api/v1/:path*`,
      },
      /* ── Genesis ─────────────────────────────────── */
      {
        source: "/api/genesis/:path*",
        destination: `${GENESIS_BACKEND_URL}/api/v1/:path*`,
      },
      /* ── Pulse ───────────────────────────────────── */
      {
        source: "/api/pulse/:path*",
        destination: `${PULSE_BACKEND_URL}/api/v1/:path*`,
      },
      /* ── Orbit ───────────────────────────────────── */
      {
        source: "/api/orbit/:path*",
        destination: `${ORBIT_BACKEND_URL}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
