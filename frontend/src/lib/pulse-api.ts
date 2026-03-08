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
  url?: string;
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
  content_id: string;
  title: string;
  platform: string;
  url: string;
  views: string;
  eng: string;
  trend: "up" | "down";
  delta: string;
}

export interface AnalyzeResult {
  content_id: string;
  url: string;
  title?: string;
  platform?: string;
  status?: string;
  reason?: string;
  views?: number;
  likes?: number;
  comments?: number;
  engagement_pct?: number;
  engagement_rate?: number;
  published_at?: string | null;
}

export interface SuggestionResult {
  suggestions: string[];
  url?: string;
}

export interface HistorySnapshot {
  snapshot_at: string;
  views?: number;
  likes?: number;
  comments?: number;
  engagement_pct?: number;
}

export interface TrendingItem {
  content_id?: string | null;
  title: string;
  platform: string;
  post_id: string;
  post_url: string;
  views: number;
  likes: number;
  comments: number;
  engagement_pct: number;
  published_at?: string | null;
  channel_title?: string | null;
  thumbnail?: string | null;
  subreddit?: string | null;
  author?: string | null;
}

export interface MitigationResult {
  content_id: string;
  status: string;
  reason: string;
  suggestions: string[];
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
    content_id: item.content_id,
    title:    item.title,
    platform: item.platform,
    url:      item.url ?? "",
    views:    fmt(item.views),
    eng:      `${item.engagement_pct.toFixed(1)}%`,
    trend:    (item.trend_direction === "up" || item.trend_pct > 0) ? "up" : "down",
    delta:    `${Math.abs(item.trend_pct).toFixed(1)}%`,
  }));
  return { content };
}

/** Analyze a URL → POST /analyze */
export async function analyzeUrl(url: string): Promise<AnalyzeResult> {
  const res = await fetch(`${API_BASE}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  // API returns metrics nested: { ..., metrics: { views, likes, comments, engagement_rate, ... } }
  const raw = await safeJson<Record<string, unknown>>(res);
  const m = (raw.metrics as Record<string, unknown>) ?? {};
  return {
    content_id:     raw.content_id as string,
    url:            raw.url as string,
    title:          raw.title as string | undefined,
    platform:       raw.platform as string | undefined,
    status:         raw.status as string | undefined,
    reason:         raw.reason as string | undefined,
    views:          m.views as number | undefined,
    likes:          m.likes as number | undefined,
    comments:       m.comments as number | undefined,
    engagement_rate: m.engagement_rate as number | undefined,
    engagement_pct:  m.engagement_rate as number | undefined,
    published_at:   (m.recorded_at ?? raw.published_at) as string | null | undefined,
  };
}

/** AI suggestions for a URL → POST /suggestions */
export async function getSuggestions(url: string): Promise<SuggestionResult> {
  const res = await fetch(`${API_BASE}/suggestions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  const raw = await safeJson<SuggestionResult | string[]>(res);
  if (Array.isArray(raw)) return { suggestions: raw };
  return raw as SuggestionResult;
}

/** Historical performance snapshots → GET /analyze/{contentId}/history */
export async function fetchHistory(contentId: string): Promise<HistorySnapshot[]> {
  const res = await fetch(`${API_BASE}/analyze/${contentId}/history`);
  const raw = await safeJson<Record<string, unknown>[] | Record<string, unknown>>(res);
  // API returns: { content_id, url, snapshots: [...] } — each snapshot uses recorded_at + engagement_rate
  let arr: Record<string, unknown>[];
  if (Array.isArray(raw)) {
    arr = raw;
  } else {
    const found = raw.snapshots ?? raw.history ?? raw.data;
    arr = Array.isArray(found) ? found as Record<string, unknown>[] : [];
  }
  return arr.map(s => ({
    snapshot_at:    (s.recorded_at ?? s.snapshot_at) as string,
    views:          s.views as number | undefined,
    likes:          s.likes as number | undefined,
    comments:       s.comments as number | undefined,
    engagement_pct: (s.engagement_rate ?? s.engagement_pct) as number | undefined,
  }));
}

/** Look up the stored URL for a content item → GET /analyze/{contentId}/history (extracts top-level url) */
export async function fetchContentUrl(contentId: string): Promise<string> {
  try {
    const res = await fetch(`${API_BASE}/analyze/${contentId}/history`);
    const raw = await safeJson<Record<string, unknown>>(res);
    return (raw.url as string) ?? "";
  } catch {
    return "";
  }
}

/** Live trending content → GET /analytics/discover-trending */
export async function fetchDiscoverTrending(platform?: string, limit = 8): Promise<TrendingItem[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (platform) params.set("platform", platform);
  const res = await fetch(`${API_BASE}/analytics/discover-trending?${params}`);
  const raw = await safeJson<Record<string, unknown>[]>(res);
  if (!Array.isArray(raw)) return [];
  // API returns { url, engagement_rate } — normalize to TrendingItem shape
  return raw.map(item => ({
    content_id:     (item.content_id ?? null) as string | null,
    title:          item.title as string,
    platform:       item.platform as string,
    post_id:        (item.post_id ?? item.content_id ?? "") as string,
    post_url:       (item.url ?? item.post_url ?? "") as string,
    views:          (item.views ?? 0) as number,
    likes:          (item.likes ?? 0) as number,
    comments:       (item.comments ?? 0) as number,
    engagement_pct: (item.engagement_rate ?? item.engagement_pct ?? 0) as number,
    published_at:   (item.published_at ?? null) as string | null,
    channel_title:  (item.channel_title ?? item.channel ?? null) as string | null,
    thumbnail:      (item.thumbnail ?? null) as string | null,
    subreddit:      (item.subreddit ?? null) as string | null,
    author:         (item.author ?? null) as string | null,
  }));
}

/** AI mitigation suggestions for a registered content → GET /mitigations/{contentId} */
export async function fetchMitigations(contentId: string): Promise<MitigationResult> {
  const res = await fetch(`${API_BASE}/mitigations/${contentId}`);
  return safeJson<MitigationResult>(res);
}
