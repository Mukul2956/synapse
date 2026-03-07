/**
 * Pulse API client — Real-Time Analytics & Content Intelligence
 * Calls /api/pulse/* — proxied to PULSE_BACKEND_URL/* (no /api/v1/ prefix)
 * Docs: https://pulse-api-l1xa.onrender.com/docs
 */

const API_BASE = process.env.NEXT_PUBLIC_PULSE_API_URL || "/api/pulse";

async function safeJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Pulse API error ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// ─── Backend response shapes ──────────────────────────────────────────────────

interface BackendSummary {
  total_views: number;
  total_likes: number;
  total_comments: number;
  avg_engagement: number;
  total_shares: number;
  saves: number;
  views_change_pct: number;
  engagement_change_pct: number;
  shares_change_pct: number;
  saves_change_pct: number;
}

interface BackendTimeseriesPoint {
  date: string;
  views: number;
  engagement_pct: number;
  sentiment_score: number;
  sentiment_label: string;
}

interface BackendPlatformPerformance {
  platform: string;
  posts: number;
  total_views: number;
  total_likes: number;
  total_comments: number;
  engagement_rate: number;
  avg_sentiment: number;
}

interface BackendTopContentItem {
  content_id: string;
  title: string;
  platform: string;
  views: number;
  engagement_pct: number;
  trend_pct: number;
  trend_direction: string;
}

// ─── UI types (consumed by pulse/page.tsx) ────────────────────────────────────

export interface PulseMetric {
  label: string;
  value: string;
  delta: string;
  up: boolean;
}

export interface MetricsResponse {
  metrics: PulseMetric[];
}

export interface DailyDataPoint {
  day: string;
  views: number;
  engagement: number;
  shares: number;
  saves: number;
}

export interface DailyDataResponse {
  data: DailyDataPoint[];
}

export interface PlatformDataPoint {
  platform: string;
  engagement: number;
  reach: number;
  posts: number;
  color: string;
}

export interface PlatformDataResponse {
  platforms: PlatformDataPoint[];
}

export interface TopContentItem {
  title: string;
  platform: string;
  views: string;
  eng: string;
  trend: "up" | "down";
  delta: string;
}

export interface TopContentResponse {
  content: TopContentItem[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

const PLATFORM_COLORS: Record<string, string> = {
  youtube:   "#EF4444",
  reddit:    "#FF5700",
  linkedin:  "#0A66C2",
  twitter:   "#818CF8",
  instagram: "#E1306C",
  tiktok:    "#10B981",
};

// ─── API functions ────────────────────────────────────────────────────────────

/** KPI summary cards → GET /analytics/summary?period={range} */
export async function fetchMetrics(range: string): Promise<MetricsResponse> {
  const res = await fetch(`${API_BASE}/analytics/summary?period=${range}`);
  const d = await safeJson<BackendSummary>(res);
  const metrics: PulseMetric[] = [
    { label: "Total views",     value: fmt(d.total_views),              delta: `${Math.abs(d.views_change_pct).toFixed(1)}%`,      up: d.views_change_pct >= 0 },
    { label: "Avg. engagement", value: `${d.avg_engagement.toFixed(1)}%`, delta: `${Math.abs(d.engagement_change_pct).toFixed(1)}%`, up: d.engagement_change_pct >= 0 },
    { label: "Total shares",    value: fmt(d.total_shares),             delta: `${Math.abs(d.shares_change_pct).toFixed(1)}%`,      up: d.shares_change_pct >= 0 },
    { label: "Saves",           value: fmt(d.saves),                    delta: `${Math.abs(d.saves_change_pct).toFixed(1)}%`,       up: d.saves_change_pct >= 0 },
  ];
  return { metrics };
}

/** Time-series line chart → GET /analytics/timeseries?period={range} */
export async function fetchDailyData(range: string): Promise<DailyDataResponse> {
  const res = await fetch(`${API_BASE}/analytics/timeseries?period=${range}`);
  const raw = await safeJson<BackendTimeseriesPoint[]>(res);
  const data: DailyDataPoint[] = raw.map(p => ({
    day:        p.date,
    views:      p.views,
    engagement: Math.round(p.engagement_pct * 100) / 100,
    shares:     0,
    saves:      0,
  }));
  return { data };
}

/** Platform breakdown bar chart → GET /analytics/by-platform */
export async function fetchPlatformData(_range: string): Promise<PlatformDataResponse> {
  const res = await fetch(`${API_BASE}/analytics/by-platform`);
  const raw = await safeJson<BackendPlatformPerformance[]>(res);
  const platforms: PlatformDataPoint[] = raw.map(p => ({
    platform:   p.platform,
    engagement: Math.round(p.engagement_rate * 10000) / 100,
    reach:      p.total_views,
    posts:      p.posts,
    color:      PLATFORM_COLORS[p.platform.toLowerCase()] ?? "#6366F1",
  }));
  return { platforms };
}

/** Top content table → GET /analytics/top-content?limit=10 */
export async function fetchTopContent(_range: string): Promise<TopContentResponse> {
  const res = await fetch(`${API_BASE}/analytics/top-content?limit=10`);
  const raw = await safeJson<BackendTopContentItem[]>(res);
  const content: TopContentItem[] = raw.map(item => ({
    title:    item.title,
    platform: item.platform,
    views:    fmt(item.views),
    eng:      `${item.engagement_pct.toFixed(1)}%`,
    trend:    (item.trend_direction === "up" || item.trend_pct > 0) ? "up" : "down",
    delta:    `${Math.abs(item.trend_pct).toFixed(1)}%`,
  }));
  return { content };
}
