/**
 * Unified Orbit API client
 * Calls /api/orbit/* — proxied to ORBIT_BACKEND_URL/api/v1/*
 */

const API = "/api/orbit";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ContentType = "text" | "thread" | "article" | "image" | "carousel" | "video" | "email";

export interface RedditPost {
  id: string;
  title: string;
  subreddit: string;
  score: number;
  num_comments: number;
  url: string;
  author: string;
  created_utc: number;
  flair?: string;
  thumbnail?: string;
}

export interface PlatformStatus {
  platform: string;
  status: "connected" | "auth_expired" | "not_connected";
  account_name?: string;
}

export interface YouTubeVideo {
  id: string;
  title: string;
  channel: string;
  url: string | null;
  thumbnail: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  published_at: string;
}

export interface OptimalTimeResponse {
  optimal_time: string;
  confidence_score: number;
  is_default_time: boolean;
  reasoning?: string;
}

export interface IngestStatus {
  audience_patterns: Record<string, number>;
  platform_performance: Record<string, number>;
  ml_ready: Record<string, boolean>;
  ml_threshold: number;
}

export interface IngestResult {
  rows_inserted: number;
  errors: string[];
  info?: string;
}

export interface IngestAllResult {
  reddit: IngestResult;
  youtube: IngestResult;
  linkedin: IngestResult & { info?: string };
}

export interface QueueEntry {
  id: string;
  content_id: string;
  status: string;
  platforms: string[];
  scheduled_time?: string | null;
  priority_score: number;
}

export interface DashboardStats {
  total_published: number;
  total_scheduled: number;
  avg_engagement_score: number;
  top_platform: string | null;
}

export interface HeatmapPoint {
  day_of_week: number;
  hour: number;
  engagement_rate: number;
  reach?: number;
}

export interface DraftResponse {
  id: string;
  title: string;
  body: string | null;
  content_type: string;
  status: string;
  is_evergreen: boolean;
  is_time_sensitive?: boolean;
  created_at: string;
}

export interface CreateDraftParams {
  user_id: string;
  title: string;
  body?: string;
  content_type: ContentType;
  is_evergreen?: boolean;
  is_time_sensitive?: boolean;
}

export interface QueueDraftResult {
  queue_id: string;
  optimal_publish_time: string | null;
  platforms: string[];
}

// ─── Backend response shapes (internal) ───────────────────────────────────────

interface BackendQueueItem {
  id: string;
  content_id: string;
  user_id: string;
  status: string;
  priority_score: number;
  optimal_publish_time: string | null;
  platforms: Record<string, unknown>;
  requires_approval: boolean;
  created_at: string;
  updated_at: string;
}

interface BackendAnalytics {
  total_published: number;
  total_failed: number;
  avg_engagement_score: number;
  top_platform: string | null;
}

interface BackendDraft {
  id: string;
  title: string;
  body: string | null;
  content_type: string;
  status: string;
  created_at: string;
  is_evergreen?: boolean;
  is_time_sensitive?: boolean;
}

// ─── Reddit ───────────────────────────────────────────────────────────────────

export async function fetchRedditTrending(params: {
  subreddit?: string; q?: string; sort?: string; limit?: number; timeframe?: string;
}): Promise<{ posts: RedditPost[] }> {
  const qs = new URLSearchParams();
  if (params.subreddit) qs.set("subreddit", params.subreddit);
  if (params.q) qs.set("q", params.q);
  if (params.sort) qs.set("sort", params.sort);
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.timeframe) qs.set("timeframe", params.timeframe);

  const res = await fetch(`${API}/reddit/trending?${qs}`);
  if (!res.ok) throw new Error(`Reddit API error ${res.status}`);

  const data = await res.json();
  const raw: unknown[] = Array.isArray(data) ? data : (data.posts ?? data.items ?? data.data ?? []);

  const posts: RedditPost[] = raw.map((item: any, i: number) => ({
    id: item.id ?? `reddit-${i}`,
    title: item.title ?? "",
    subreddit: item.subreddit ?? "",
    score: item.score ?? 0,
    num_comments: item.num_comments ?? 0,
    url: item.url ?? "#",
    author: item.author ?? "",
    created_utc: item.created_utc ?? 0,
    flair: item.link_flair_text ?? item.flair ?? undefined,
    thumbnail: item.thumbnail ?? undefined,
  }));

  return { posts };
}

// ─── YouTube ──────────────────────────────────────────────────────────────────

function mapYTVideo(item: any, i: number): YouTubeVideo {
  return {
    id: item.video_id ?? item.id ?? `yt-${i}`,
    title: item.title ?? "",
    channel: item.channel_title ?? item.channel ?? "",
    url: item.video_id ? `https://www.youtube.com/watch?v=${item.video_id}` : (item.url ?? null),
    thumbnail: item.thumbnail ?? "",
    view_count: item.view_count ?? 0,
    like_count: item.like_count ?? 0,
    comment_count: item.comment_count ?? 0,
    published_at: item.published_at ?? "",
  };
}

export async function fetchYouTubeTrending(params: {
  regionCode?: string; categoryId?: string; maxResults?: number;
}): Promise<{ results: YouTubeVideo[] }> {
  const qs = new URLSearchParams();
  if (params.maxResults) qs.set("max_results", String(params.maxResults));
  if (params.regionCode) qs.set("region_code", params.regionCode);
  if (params.categoryId && params.categoryId !== "0") qs.set("category_id", params.categoryId);

  const res = await fetch(`${API}/youtube/trending?${qs}`);
  if (!res.ok) throw new Error(`YouTube API error ${res.status}`);

  const data = await res.json();
  const raw: unknown[] = Array.isArray(data) ? data : (data.videos ?? data.results ?? data.items ?? data.data ?? []);
  return { results: raw.map(mapYTVideo) };
}

export async function searchYouTube(params: {
  q: string; maxResults?: number; order?: string;
}): Promise<{ results: YouTubeVideo[] }> {
  const qs = new URLSearchParams();
  qs.set("q", params.q);
  if (params.maxResults) qs.set("max_results", String(params.maxResults));
  if (params.order) qs.set("order", params.order);

  const res = await fetch(`${API}/youtube/search?${qs}`);
  if (!res.ok) throw new Error(`YouTube search error ${res.status}`);

  const data = await res.json();
  const raw: unknown[] = Array.isArray(data) ? data : (data.videos ?? data.results ?? data.items ?? data.data ?? []);
  return { results: raw.map(mapYTVideo) };
}

// ─── Platforms ────────────────────────────────────────────────────────────────

export async function fetchPlatformStatus(userId: string): Promise<{ platforms: PlatformStatus[] }> {
  const res = await fetch(`${API}/platforms/status/${userId}`);
  if (!res.ok) return { platforms: [] };

  const raw = await res.json();

  // Backend returns { user_id, platforms: [{ platform, status, account_name, account_id }] }
  const list: any[] = Array.isArray(raw) ? raw : (raw.platforms ?? []);
  const platforms: PlatformStatus[] = list.map((item: any) => {
    const rawStatus = item.status ?? "not_connected";
    const status = (["connected", "auth_expired", "not_connected"].includes(rawStatus)
      ? rawStatus
      : "not_connected") as PlatformStatus["status"];
    return {
      platform: item.platform ?? "",
      status,
      account_name: item.account_name ?? undefined,
    };
  });

  return { platforms };
}

export async function getOAuthUrl(platform: string, userId: string): Promise<string> {
  const res = await fetch(`${API}/auth/${platform}/connect?user_id=${userId}`);
  if (!res.ok) throw new Error(`OAuth error ${res.status}`);
  const data = await res.json();
  return data.url ?? data.auth_url ?? data.redirect_url ?? "";
}

export async function disconnectPlatform(userId: string, platform: string): Promise<void> {
  const res = await fetch(`${API}/platforms/${userId}/${platform}`, { method: "DELETE" });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Disconnect error ${res.status}: ${text}`);
  }
}

// ─── Optimal Timing ──────────────────────────────────────────────────────────

export async function fetchOptimalTime(userId: string, platform: string): Promise<OptimalTimeResponse> {
  const res = await fetch(`${API}/schedule/optimal-time?user_id=${userId}&platform=${platform}`);
  if (!res.ok) throw new Error(`Timing error ${res.status}`);

  const data = await res.json();

  // Backend returns { platform, optimal_time, confidence_score, is_default_time, reasoning }
  return {
    optimal_time: data.optimal_time,
    confidence_score: data.confidence_score ?? 0,
    is_default_time: data.is_default_time ?? true,
    reasoning: data.reasoning ?? undefined,
  };
}

// ─── Heatmap ─────────────────────────────────────────────────────────────────

export async function fetchHeatmap(userId: string, platform = "linkedin"): Promise<HeatmapPoint[]> {
  const res = await fetch(`${API}/analytics/heatmap/${userId}?platform=${platform}`);
  if (!res.ok) return [];
  try { return await res.json(); } catch { return []; }
}

// ─── Dashboard Stats ─────────────────────────────────────────────────────────

export async function fetchDashboardStats(userId: string): Promise<DashboardStats> {
  const [perfRes, queueRes] = await Promise.allSettled([
    fetch(`${API}/analytics/performance/${userId}?days=30`),
    fetch(`${API}/queue/user/${userId}?limit=100`),
  ]);

  let totalPublished = 0, avgEngagement = 0, topPlatform: string | null = null;
  if (perfRes.status === "fulfilled" && perfRes.value.ok) {
    try {
      const p: BackendAnalytics = await perfRes.value.json();
      totalPublished = p.total_published ?? 0;
      avgEngagement = p.avg_engagement_score ?? 0;
      topPlatform = p.top_platform ?? null;
    } catch { /* ignore */ }
  }

  let totalScheduled = 0;
  if (queueRes.status === "fulfilled" && queueRes.value.ok) {
    try {
      const q: BackendQueueItem[] = await queueRes.value.json();
      totalScheduled = q.filter(i =>
        ["pending", "approved", "scheduled"].includes(i.status)
      ).length;
    } catch { /* ignore */ }
  }

  return { total_published: totalPublished, total_scheduled: totalScheduled, avg_engagement_score: avgEngagement, top_platform: topPlatform };
}

// ─── Queue ───────────────────────────────────────────────────────────────────

export async function fetchUserQueue(userId: string): Promise<QueueEntry[]> {
  const res = await fetch(`${API}/queue/user/${userId}?limit=50`);
  if (!res.ok) return [];

  const raw: BackendQueueItem[] = await res.json();
  return raw.map(item => ({
    id: item.id,
    content_id: item.content_id,
    status: item.status,
    platforms: Object.keys(item.platforms ?? {}),
    scheduled_time: item.optimal_publish_time,
    priority_score: item.priority_score,
  }));
}

// ─── Drafts ──────────────────────────────────────────────────────────────────

export async function fetchUserDrafts(userId: string): Promise<DraftResponse[]> {
  const res = await fetch(`${API}/content/user/${userId}?limit=50`);
  if (!res.ok) return [];

  const raw: BackendDraft[] = await res.json();
  return raw.map(d => ({
    id: d.id,
    title: d.title,
    body: d.body,
    content_type: d.content_type,
    status: d.status,
    is_evergreen: d.is_evergreen ?? false,
    is_time_sensitive: d.is_time_sensitive,
    created_at: d.created_at,
  }));
}

export async function createDraft(params: CreateDraftParams): Promise<DraftResponse> {
  const res = await fetch(`${API}/content/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: params.user_id,
      title: params.title,
      body: params.body ?? null,
      content_type: params.content_type,
      is_evergreen: params.is_evergreen ?? false,
      is_time_sensitive: params.is_time_sensitive ?? false,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Create draft error ${res.status}: ${text}`);
  }
  const d: BackendDraft = await res.json();
  return {
    id: d.id,
    title: d.title,
    body: d.body,
    content_type: d.content_type,
    status: d.status,
    is_evergreen: d.is_evergreen ?? false,
    created_at: d.created_at,
  };
}

export async function queueDraft(
  draftId: string,
  params: { platforms: string[]; is_time_sensitive?: boolean },
): Promise<QueueDraftResult> {
  const res = await fetch(`${API}/content/${draftId}/queue`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      platforms: params.platforms,
      is_time_sensitive: params.is_time_sensitive ?? false,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Queue error ${res.status}: ${text}`);
  }
  const data = await res.json();
  return {
    queue_id: data.queue_id ?? data.id ?? "",
    optimal_publish_time: data.optimal_publish_time ?? null,
    platforms: params.platforms,
  };
}

// ─── Ingest ──────────────────────────────────────────────────────────────────

export async function fetchIngestStatus(userId: string): Promise<IngestStatus> {
  const res = await fetch(`${API}/ingest/status/${userId}`);
  if (!res.ok) return { audience_patterns: {}, platform_performance: {}, ml_ready: {}, ml_threshold: 50 };

  const raw = await res.json();

  // Backend returns Record<string, { audience_patterns, platform_performance, ml_ready }>
  // Transform to the shape the page expects
  if (raw && typeof raw === "object" && !raw.audience_patterns) {
    const ap: Record<string, number> = {};
    const pp: Record<string, number> = {};
    const mr: Record<string, boolean> = {};

    for (const [platform, value] of Object.entries(raw)) {
      if (value && typeof value === "object") {
        const v = value as { audience_patterns?: number; platform_performance?: number; ml_ready?: boolean };
        ap[platform] = v.audience_patterns ?? 0;
        pp[platform] = v.platform_performance ?? 0;
        mr[platform] = v.ml_ready ?? false;
      }
    }

    return { audience_patterns: ap, platform_performance: pp, ml_ready: mr, ml_threshold: 50 };
  }

  return {
    audience_patterns: raw.audience_patterns ?? {},
    platform_performance: raw.platform_performance ?? {},
    ml_ready: raw.ml_ready ?? {},
    ml_threshold: raw.ml_threshold ?? 50,
  };
}

export async function triggerIngest(
  userId: string,
  platform: "reddit" | "youtube" | "linkedin" | "all",
): Promise<IngestResult | IngestAllResult> {
  const endpoint = platform === "all"
    ? `${API}/ingest/all?user_id=${userId}`
    : `${API}/ingest/${platform}?user_id=${userId}`;

  const res = await fetch(endpoint, { method: "POST" });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Ingest error ${res.status}: ${text}`);
  }

  const data = await res.json();

  if (platform === "all") {
    const normalize = (r: any): IngestResult => ({
      rows_inserted: r?.rows_inserted ?? r?.rows ?? 0,
      errors: r?.errors ?? [],
      info: r?.info,
    });
    return {
      reddit: normalize(data.reddit),
      youtube: normalize(data.youtube),
      linkedin: normalize(data.linkedin),
    } as IngestAllResult;
  }

  return {
    rows_inserted: data.rows_inserted ?? data.rows ?? 0,
    errors: data.errors ?? [],
    info: data.info,
  } as IngestResult;
}
