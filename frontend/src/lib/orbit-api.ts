/**
 * Orbit API client — Intelligent Distribution & Scheduling
 * Calls /api/orbit/* — proxied to ORBIT_BACKEND_URL/api/v1/*
 * Docs: https://orbit-kzqc.onrender.com/docs
 *
 * NOTE: All user-specific endpoints require a UUID user_id.
 * DEMO_USER_ID is used until real auth is wired up.
 */

const API_BASE = process.env.NEXT_PUBLIC_ORBIT_API_URL || "/api/orbit";

/** Replace with real auth user ID when auth is implemented */
const DEMO_USER_ID = "00000000-0000-0000-0000-000000000001";

// ─── Backend response shapes ──────────────────────────────────────────────────

interface AnalyticsSummary {
  total_published: number;
  total_failed: number;
  avg_engagement_score: number;
  top_platform: string | null;
  heatmap: Array<{ hour: number; day_of_week: number; engagement_rate: number; reach: number }>;
}

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

interface DraftResponse {
  id: string;
  title: string;
  body: string | null;
  content_type: string;
  status: string;
  created_at: string;
}

// ─── UI types (consumed by orbit/page.tsx) ────────────────────────────────────

export interface OrbitStats {
  published_this_month: number;
  scheduled: number;
  platforms_connected: string;
  avg_best_time_score: string;
  platforms_active: number;
}

export interface QueueItem {
  id: string;
  title: string;
  platform: string;
  scheduledAt: string;
  status: "live" | "scheduled" | "paused" | "draft";
  type: string;
  engagement: string;
}

export interface QueueResponse {
  items: QueueItem[];
}

export interface Connection {
  name: string;
  handle: string;
  status: "connected" | "auth_expired" | "not_connected";
  color: string;
  posts: number;
}

export interface ConnectionsResponse {
  connections: Connection[];
}

export interface CalendarEvent {
  color: string;
  platform: string;
}

export interface CalendarResponse {
  month: string;
  events: Record<number, CalendarEvent[]>;
}

export interface SchedulePostParams {
  title: string;
  platform: string;
  content: string;
  scheduled_at: string;
  type: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PLATFORM_COLORS: Record<string, string> = {
  youtube:   "#EF4444",
  reddit:    "#FF5700",
  linkedin:  "#3B82F6",
  twitter:   "#818CF8",
  instagram: "#F59E0B",
  tiktok:    "#10B981",
};

function mapQueueStatus(s: string): QueueItem["status"] {
  switch (s) {
    case "published":  return "live";
    case "pending":
    case "approved":
    case "scheduled":  return "scheduled";
    case "cancelled":  return "paused";
    default:           return "draft";
  }
}

function fmtDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function getCurrentMonthLabel(): string {
  return new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

// ─── API functions ────────────────────────────────────────────────────────────

/**
 * Dashboard header stats.
 * Combines: /analytics/performance/{id}, /queue/user/{id}, /platforms/status/{id}
 */
export async function fetchOrbitStats(): Promise<OrbitStats> {
  const [perfResult, queueResult, platformResult] = await Promise.allSettled([
    fetch(`${API_BASE}/analytics/performance/${DEMO_USER_ID}?days=30`),
    fetch(`${API_BASE}/queue/user/${DEMO_USER_ID}?limit=100`),
    fetch(`${API_BASE}/platforms/status/${DEMO_USER_ID}`),
  ]);

  let published = 0, avgScore = "—";
  if (perfResult.status === "fulfilled" && perfResult.value.ok) {
    try {
      const p: AnalyticsSummary = await perfResult.value.json();
      published = p.total_published ?? 0;
      avgScore = `${((p.avg_engagement_score ?? 0) * 100).toFixed(0)}%`;
    } catch { /* ignore */ }
  }

  let scheduled = 0;
  if (queueResult.status === "fulfilled" && queueResult.value.ok) {
    try {
      const q: BackendQueueItem[] = await queueResult.value.json();
      scheduled = q.filter(i =>
        ["pending", "approved", "scheduled"].includes(i.status)
      ).length;
    } catch { /* ignore */ }
  }

  let platformsConnected = "0", platformsActive = 0;
  if (platformResult.status === "fulfilled" && platformResult.value.ok) {
    try {
      const p = await platformResult.value.json() as Record<string, unknown>;
      let n = 0;
      Object.values(p).forEach(v => {
        const status = typeof v === "string" ? v : (v as { status?: string })?.status;
        if (status === "connected") n++;
      });
      platformsConnected = String(n);
      platformsActive = n;
    } catch { /* ignore */ }
  }

  return {
    published_this_month: published,
    scheduled,
    platforms_connected: platformsConnected,
    avg_best_time_score: avgScore,
    platforms_active: platformsActive,
  };
}

/**
 * Queue list → GET /queue/user/{id}
 * Enriched with /content/user/{id} to resolve titles.
 */
export async function fetchQueue(): Promise<QueueResponse> {
  const [qRes, cRes] = await Promise.allSettled([
    fetch(`${API_BASE}/queue/user/${DEMO_USER_ID}?limit=20`),
    fetch(`${API_BASE}/content/user/${DEMO_USER_ID}?limit=50`),
  ]);

  if (qRes.status === "rejected" || !qRes.value.ok) return { items: [] };

  let raw: BackendQueueItem[] = [];
  try { raw = await qRes.value.json(); } catch { return { items: [] }; }

  const titleMap: Record<string, string> = {};
  if (cRes.status === "fulfilled" && cRes.value.ok) {
    try {
      const drafts: DraftResponse[] = await cRes.value.json();
      drafts.forEach(d => { titleMap[d.id] = d.title; });
    } catch { /* ignore */ }
  }

  const items: QueueItem[] = raw.map((item, idx) => {
    const platform = Object.keys(item.platforms ?? {})[0] ?? "general";
    return {
      id:          item.id,
      title:       titleMap[item.content_id] ?? `Post #${idx + 1}`,
      platform,
      scheduledAt: fmtDateTime(item.optimal_publish_time),
      status:      mapQueueStatus(item.status),
      type:        "post",
      engagement:  `${(item.priority_score * 10).toFixed(0)}%`,
    };
  });

  return { items };
}

/** Connected platforms → GET /platforms/status/{id} */
export async function fetchConnections(): Promise<ConnectionsResponse> {
  const res = await fetch(`${API_BASE}/platforms/status/${DEMO_USER_ID}`);
  if (!res.ok) return { connections: [] };

  let raw: Record<string, unknown>;
  try { raw = await res.json(); } catch { return { connections: [] }; }

  const connections: Connection[] = Object.entries(raw).map(([platform, value]) => {
    const rawStatus =
      typeof value === "string" ? value : (value as { status?: string })?.status ?? "not_connected";
    const status = (["connected", "auth_expired", "not_connected"].includes(rawStatus)
      ? rawStatus
      : "not_connected") as Connection["status"];
    return {
      name:   platform.charAt(0).toUpperCase() + platform.slice(1),
      handle: `@synapse_${platform}`,
      status,
      color:  PLATFORM_COLORS[platform.toLowerCase()] ?? "#6366F1",
      posts:  0,
    };
  });

  return { connections };
}

/** Calendar — derived from scheduled queue items (no dedicated endpoint exists) */
export async function fetchCalendar(_month?: string): Promise<CalendarResponse> {
  const res = await fetch(`${API_BASE}/queue/user/${DEMO_USER_ID}?limit=50`);
  if (!res.ok) return { month: getCurrentMonthLabel(), events: {} };

  let raw: BackendQueueItem[] = [];
  try { raw = await res.json(); } catch { return { month: getCurrentMonthLabel(), events: {} }; }

  const events: Record<number, CalendarEvent[]> = {};
  raw.forEach(item => {
    if (!item.optimal_publish_time) return;
    const day = new Date(item.optimal_publish_time).getDate();
    const platform = Object.keys(item.platforms ?? {})[0] ?? "other";
    if (!events[day]) events[day] = [];
    events[day].push({
      color:    PLATFORM_COLORS[platform.toLowerCase()] ?? "#6366F1",
      platform,
    });
  });

  return { month: getCurrentMonthLabel(), events };
}

/**
 * Publish a new post: POST /content/ → POST /content/{id}/queue
 */
export async function schedulePost(params: SchedulePostParams): Promise<QueueItem> {
  const draftRes = await fetch(`${API_BASE}/content/`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({
      user_id:      DEMO_USER_ID,
      title:        params.title,
      body:         params.content,
      content_type: params.type,
    }),
  });
  if (!draftRes.ok) {
    const text = await draftRes.text().catch(() => draftRes.statusText);
    throw new Error(`Orbit API error ${draftRes.status}: ${text}`);
  }
  const draft: DraftResponse = await draftRes.json();

  const queueRes = await fetch(`${API_BASE}/content/${draft.id}/queue`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({
      platforms:      [params.platform],
      scheduled_time: params.scheduled_at || null,
    }),
  });
  if (!queueRes.ok) {
    const text = await queueRes.text().catch(() => queueRes.statusText);
    throw new Error(`Orbit API error ${queueRes.status}: ${text}`);
  }
  const queued: { queue_id: string; optimal_publish_time: string | null } =
    await queueRes.json();

  return {
    id:          queued.queue_id,
    title:       params.title,
    platform:    params.platform,
    scheduledAt: fmtDateTime(queued.optimal_publish_time) || params.scheduled_at,
    status:      "scheduled",
    type:        params.type,
    engagement:  "—",
  };
}

// ─── Additional types for Insights sections ───────────────────────────────────

export interface HeatmapPoint {
  hour: number;
  day_of_week: number;
  engagement_rate: number;
  reach: number;
}

export interface RedditPost {
  title: string;
  subreddit: string;
  score: number;
  num_comments: number;
  url: string;
  author: string;
  created_utc: number;
  link_flair_text?: string;
  thumbnail?: string;
}

export interface YoutubeVideo {
  title: string;
  channel_title: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  thumbnail: string;
  video_id: string;
  published_at: string;
}

export interface IngestPlatformStatus {
  audience_patterns: number;
  platform_performance: number;
  ml_ready: boolean;
}

export type IngestStatus = Record<string, IngestPlatformStatus>;

export interface OptimalPostingTime {
  platform: string;
  best_time: string;
  confidence: number;
  model: string;
  rows: number;
  best_slot_utc: string;
  avg_engagement: number;
  overall_engagement: number;
}

// ─── Insights API functions ───────────────────────────────────────────────────

/** Optimal posting times → GET /analytics/best-times/{user_id} */
export async function fetchOptimalTimes(): Promise<OptimalPostingTime[]> {
  const res = await fetch(`${API_BASE}/analytics/best-times/${DEMO_USER_ID}`);
  if (!res.ok) return [];
  try {
    const data = await res.json();
    return Array.isArray(data) ? data : (data.times ?? data.recommendations ?? []);
  } catch { return []; }
}

/** Audience heatmap → GET /analytics/heatmap/{user_id}?platform=... */
export async function fetchHeatmap(platform = "linkedin"): Promise<HeatmapPoint[]> {
  const res = await fetch(`${API_BASE}/analytics/heatmap/${DEMO_USER_ID}?platform=${platform}`);
  if (!res.ok) return [];
  try { return await res.json(); } catch { return []; }
}

/** Reddit trending posts → GET /reddit/trending */
export async function fetchRedditTrending(subreddit = "all", limit = 10): Promise<RedditPost[]> {
  const res = await fetch(`${API_BASE}/reddit/trending?subreddit=${subreddit}&sort=hot&limit=${limit}`);
  if (!res.ok) return [];
  try {
    const data = await res.json();
    return Array.isArray(data) ? data : (data.posts ?? data.items ?? data.data ?? []);
  } catch { return []; }
}

/** YouTube trending → GET /youtube/trending */
export async function fetchYoutubeTrending(limit = 10): Promise<YoutubeVideo[]> {
  const res = await fetch(`${API_BASE}/youtube/trending?max_results=${limit}`);
  if (!res.ok) return [];
  try {
    const data = await res.json();
    return Array.isArray(data) ? data : (data.videos ?? data.items ?? data.data ?? []);
  } catch { return []; }
}

/** Ingest status → GET /ingest/status/{user_id} */
export async function fetchIngestStatus(): Promise<IngestStatus> {
  const res = await fetch(`${API_BASE}/ingest/status/${DEMO_USER_ID}`);
  if (!res.ok) return {};
  try { return await res.json(); } catch { return {}; }
}

/** Trigger data ingestion → POST /ingest/all */
export async function triggerIngestAll(): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/ingest/all?user_id=${DEMO_USER_ID}`, { method: "POST" });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Ingest error ${res.status}: ${text}`);
  }
  return res.json();
}
