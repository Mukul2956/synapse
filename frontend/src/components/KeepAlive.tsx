// Keep-alive is now handled server-side via src/instrumentation.ts.
// The Next.js process on AWS pings all Render microservices every 5 minutes
// so they never sleep — no client-side pinging needed.
export default function KeepAlive() {
  return null;
}
