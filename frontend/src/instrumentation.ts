/**
 * Next.js Instrumentation — Server-side keep-alive for Render.com microservices.
 *
 * Runs once when the Next.js Node.js process starts (on AWS), then pings all
 * four backend health endpoints every 5 minutes so Render free-tier services
 * never go to sleep — regardless of user traffic.
 *
 * Docs: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

const INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export async function register() {
  // Only run in the Node.js runtime — not in the Edge runtime
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const services = [
    { name: "Forge",   url: `${process.env.FORGE_BACKEND_URL   || "http://localhost:8000"}/health` },
    { name: "Genesis", url: `${process.env.GENESIS_BACKEND_URL || "http://localhost:8001"}/health` },
    { name: "Pulse",   url: `${process.env.PULSE_BACKEND_URL   || "http://localhost:8002"}/health` },
    { name: "Orbit",   url: `${process.env.ORBIT_BACKEND_URL   || "http://localhost:8003"}/health` },
  ];

  const ping = async () => {
    await Promise.allSettled(
      services.map(({ url }) =>
        fetch(url, {
          method: "GET",
          signal: AbortSignal.timeout(15_000), // 15 s timeout per request
        }).catch(() => { /* silent — just waking the service */ })
      )
    );
  };

  // Ping immediately when the server starts
  ping();

  // Then keep pinging every 5 minutes
  setInterval(ping, INTERVAL_MS);
}
