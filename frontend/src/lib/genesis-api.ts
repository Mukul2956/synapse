/**
 * Genesis API client — Ideation & Research Laboratory
 * Calls /api/genesis/* which Next.js proxies to GENESIS_BACKEND_URL/api/v1/*
 */

const API_BASE = process.env.NEXT_PUBLIC_GENESIS_API_URL || "/api/genesis";

async function safeJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Genesis API error ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Trend {
  topic: string;
  score: number;
  velocity: string;
  lifecycle: "emerging" | "growing" | "peak" | "declining";
  volume: string;
  category: string;
  sources?: string[];
  gap: "high" | "med" | "low";
}

export interface TrendsResponse {
  trends: Trend[];
  total: number;
}

export interface Keyword {
  kw: string;
  vol: string;
  diff: number;
  cpc: string;
  intent: string;
}

export interface KeywordsResponse {
  keywords: Keyword[];
}

export interface DataSource {
  name: string;
  posts: string;
  status: "live" | "synced";
  latency: string;
}

export interface SourcesResponse {
  sources: DataSource[];
}

export interface GenesisStats {
  trends_tracked: number;
  opportunities: number;
  briefs_generated: number;
  data_sources: number;
  posts_per_hour: number;
}

export interface BriefAngle {
  text: string;
}

export interface BriefResponse {
  topic: string;
  target_audience: string;
  angles: string[];
  seo_keywords: string[];
  recommended_formats: string[];
}

// ─── API functions ────────────────────────────────────────────────────────────

export async function fetchStats(): Promise<GenesisStats> {
  const res = await fetch(`${API_BASE}/stats`);
  return safeJson<GenesisStats>(res);
}

export async function fetchTrends(search?: string): Promise<TrendsResponse> {
  const url = new URL(`${API_BASE}/trends`, window.location.origin);
  if (search) url.searchParams.set("search", search);
  const res = await fetch(url.toString());
  const data = await safeJson<unknown>(res);
  // Backend may return a plain array or a wrapped object
  if (Array.isArray(data)) {
    return { trends: data as Trend[], total: (data as Trend[]).length };
  }
  const obj = data as Record<string, unknown>;
  const list = (obj.trends ?? obj.items ?? obj.data ?? []) as Trend[];
  return { trends: Array.isArray(list) ? list : [], total: (obj.total as number) ?? 0 };
}

export async function fetchKeywords(): Promise<KeywordsResponse> {
  const res = await fetch(`${API_BASE}/keywords`);
  const data = await safeJson<unknown>(res);
  if (Array.isArray(data)) return { keywords: data as Keyword[] };
  const obj = data as Record<string, unknown>;
  const list = (obj.keywords ?? obj.items ?? obj.data ?? []) as Keyword[];
  return { keywords: Array.isArray(list) ? list : [] };
}

export async function fetchSources(): Promise<SourcesResponse> {
  const res = await fetch(`${API_BASE}/sources`);
  const data = await safeJson<unknown>(res);
  if (Array.isArray(data)) return { sources: data as DataSource[] };
  const obj = data as Record<string, unknown>;
  const list = (obj.sources ?? obj.items ?? obj.data ?? []) as DataSource[];
  return { sources: Array.isArray(list) ? list : [] };
}

export async function generateBrief(topic: string, niche = "general"): Promise<BriefResponse> {
  const res = await fetch(`${API_BASE}/brief`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic, niche }),
  });
  return safeJson<BriefResponse>(res);
}
