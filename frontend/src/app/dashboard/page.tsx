"use client";

import { useState, useEffect, useCallback } from "react";
import {
  TrendingUp, TrendingDown, FlaskConical, Hammer, Activity, Globe2,
  ArrowRight, Clock, CheckCircle2, AlertCircle, Zap, RefreshCw
} from "lucide-react";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import Card, { CardHeader, CardTitle } from "@/components/ui/Card";
import {
  fetchDashboardStats, fetchPlatformStatus, fetchIngestStatus, fetchHeatmap,
  type DashboardStats, type PlatformStatus, type IngestStatus, type HeatmapPoint,
} from "@/lib/api";

const DEMO_USER_ID = "00000000-0000-0000-0000-000000000001";

const QUICK_ACTIONS = [
  { label: "New content brief",  href: "/dashboard/genesis", icon: FlaskConical, color: "#8B5CF6", bg: "rgba(139,92,246,0.1)", border: "rgba(139,92,246,0.2)" },
  { label: "Create content",     href: "/dashboard/forge",   icon: Hammer,       color: "#F59E0B", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.2)" },
  { label: "View analytics",     href: "/dashboard/pulse",   icon: Activity,     color: "#10B981", bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.2)" },
  { label: "Schedule content",   href: "/dashboard/orbit",   icon: Globe2,       color: "#3B82F6", bg: "rgba(59,130,246,0.1)", border: "rgba(59,130,246,0.2)" },
];

const PLATFORM_COLORS: Record<string, string> = {
  reddit: "#F97316", youtube: "#EF4444", linkedin: "#3B82F6",
};

function fmtNum(n: number) {
  return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
       : n >= 1_000     ? `${(n / 1_000).toFixed(1)}k`
       : String(n);
}

export default function DashboardPage() {
  const [stats, setStats]             = useState<DashboardStats | null>(null);
  const [platforms, setPlatforms]     = useState<PlatformStatus[]>([]);
  const [ingest, setIngest]           = useState<IngestStatus | null>(null);
  const [heatmap, setHeatmap]         = useState<HeatmapPoint[]>([]);
  const [loading, setLoading]         = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [s, p, i, h] = await Promise.allSettled([
      fetchDashboardStats(DEMO_USER_ID),
      fetchPlatformStatus(DEMO_USER_ID),
      fetchIngestStatus(DEMO_USER_ID),
      fetchHeatmap(DEMO_USER_ID, "linkedin"),
    ]);
    if (s.status === "fulfilled") setStats(s.value);
    if (p.status === "fulfilled") setPlatforms(p.value.platforms);
    if (i.status === "fulfilled") setIngest(i.value);
    if (h.status === "fulfilled") setHeatmap(h.value);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const connectedCount = platforms.filter(p => p.status === "connected").length;
  const totalData = ingest
    ? (ingest.audience_patterns.reddit ?? 0) + (ingest.audience_patterns.youtube ?? 0) + (ingest.audience_patterns.linkedin ?? 0)
    : 0;
  const mlReadyCount = ingest
    ? Object.values(ingest.ml_ready).filter(Boolean).length
    : 0;

  // Build engagement bars from heatmap data (24 hours)
  const hourlyEngagement = Array.from({ length: 24 }, (_, h) => {
    const points = heatmap.filter(p => p.hour === h);
    if (points.length === 0) return 0;
    return points.reduce((sum, p) => sum + p.engagement_rate, 0) / points.length;
  });
  const maxEng = Math.max(...hourlyEngagement, 0.001);

  // Platform breakdown from ingest data
  const platformBreakdown = (["reddit", "youtube", "linkedin"] as const).map(p => {
    const patterns = ingest?.audience_patterns[p] ?? 0;
    const perf = ingest?.platform_performance[p] ?? 0;
    const mlReady = ingest?.ml_ready[p] ?? false;
    return { name: p.charAt(0).toUpperCase() + p.slice(1), platform: p, rows: patterns, perf, mlReady };
  });
  const maxRows = Math.max(...platformBreakdown.map(p => p.rows), 1);

  return (
    <div className="p-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-sm text-[var(--text-muted)] mb-1">Good morning, Mukul 👋</p>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Platform Overview</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Here&apos;s what&apos;s happening across Synapse today.</p>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(52,211,153,0.08)] border border-[rgba(52,211,153,0.2)]">
            <div className="w-1.5 h-1.5 rounded-full bg-[#34D399] animate-pulse-slow" />
            <span className="text-xs text-[#34D399] font-medium">
              {loading ? "Loading…" : `${connectedCount} platform${connectedCount !== 1 ? "s" : ""} connected`}
            </span>
          </div>
          <button onClick={load}
            className="p-2 rounded-lg hover:bg-white/5 text-[var(--text-muted)] transition-colors" title="Refresh">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          <Link
            href="/dashboard/genesis"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#6366F1] text-white text-sm font-medium hover:bg-[#818CF8] transition-all hover:shadow-[0_0_20px_rgba(99,102,241,0.35)]"
          >
            <Zap size={13} /> New brief
          </Link>
        </div>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Data points synced",   value: loading ? "…" : fmtNum(totalData),                                          color: "#6366F1", desc: "audience patterns" },
          { label: "Posts published",       value: loading ? "…" : String(stats?.total_published ?? 0),                        color: "#10B981", desc: "this month" },
          { label: "Avg. engagement",       value: loading ? "…" : `${Math.round((stats?.avg_engagement_score ?? 0) * 100)}%`, color: "#3B82F6", desc: stats?.top_platform ? `top: ${stats.top_platform}` : "across platforms" },
          { label: "ML models ready",       value: loading ? "…" : `${mlReadyCount}/3`,                                       color: "#8B5CF6", desc: `threshold: ${ingest?.ml_threshold ?? 50} rows` },
        ].map(({ label, value, color, desc }) => (
          <Card key={label} padding="md">
            <p className="text-xs text-[var(--text-muted)] mb-3">{label}</p>
            <p className="text-2xl font-bold mb-1" style={{ color }}>{value}</p>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[var(--text-muted)]">{desc}</span>
            </div>
          </Card>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid lg:grid-cols-3 gap-4 mb-4">

        {/* Engagement by hour */}
        <Card className="lg:col-span-2" padding="md">
          <CardHeader>
            <CardTitle>Engagement by hour (LinkedIn)</CardTitle>
            <div className="flex items-center gap-2">
              {heatmap.length > 0 && (
                <Badge variant="success" dot>
                  {heatmap.length} data points
                </Badge>
              )}
            </div>
          </CardHeader>

          {loading ? (
            <div className="h-36 rounded-lg bg-white/[0.03] animate-pulse" />
          ) : heatmap.length === 0 ? (
            <div className="flex items-center justify-center h-36 text-xs text-[var(--text-muted)]">
              <AlertCircle size={13} className="mr-2" /> No engagement data yet — sync data from Orbit
            </div>
          ) : (
            <>
              <div className="flex items-end gap-0.5 h-36 mb-3">
                {hourlyEngagement.map((val, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                    <div
                      className="w-full rounded-sm transition-all duration-300 hover:opacity-100 cursor-pointer"
                      style={{
                        height: `${Math.max((val / maxEng) * 100, 2)}%`,
                        background: val === maxEng
                          ? "linear-gradient(to top, #3B82F6, #60A5FA)"
                          : `rgba(59,130,246,${0.15 + (val / maxEng) * 0.4})`,
                        opacity: val === maxEng ? 1 : 0.8,
                      }}
                    />
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-[var(--bg-card)] border border-[var(--border)] rounded px-1.5 py-0.5 text-[9px] text-[var(--text-primary)] whitespace-nowrap pointer-events-none transition-opacity z-10">
                      {i}:00 — {(val * 100).toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                <span>0:00</span>
                <span>6:00</span>
                <span>12:00</span>
                <span>18:00</span>
                <span>23:00</span>
              </div>
            </>
          )}
        </Card>

        {/* Platform connections */}
        <Card padding="md">
          <CardHeader>
            <CardTitle>Connected platforms</CardTitle>
            <Link href="/dashboard/orbit" className="text-xs text-[#818CF8] hover:underline flex items-center gap-1">
              Manage <ArrowRight size={11} />
            </Link>
          </CardHeader>
          {loading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 rounded-lg bg-white/[0.03] animate-pulse" />
              ))}
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {platforms.map((p) => {
                const color = PLATFORM_COLORS[p.platform] ?? "#525968";
                const displayName: Record<string, string> = {
                  youtube: "YouTube", linkedin: "LinkedIn", reddit: "Reddit",
                  twitter: "Twitter / X", instagram: "Instagram", tiktok: "TikTok",
                };
                const name = displayName[p.platform] ?? p.platform;
                const connected = p.status === "connected";
                return (
                  <li key={p.platform} className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                      style={{ background: `${color}15`, border: `1px solid ${color}30`, color }}>
                      {name.slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[11px] text-[var(--text-primary)]">{name}</span>
                        <span className={`text-[10px] font-medium ${connected ? "text-[#34D399]" : "text-[var(--text-muted)]"}`}>
                          {connected ? "Connected" : "Not connected"}
                        </span>
                      </div>
                      <p className="text-[10px] text-[var(--text-muted)] truncate">
                        {p.account_name ?? (connected ? "Active" : "—")}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      {/* Bottom grid */}
      <div className="grid lg:grid-cols-3 gap-4">

        {/* Platform data breakdown */}
        <Card className="lg:col-span-2" padding="md">
          <CardHeader>
            <CardTitle>Data breakdown by platform</CardTitle>
            <Link href="/dashboard/orbit" className="text-xs text-[#818CF8] hover:underline flex items-center gap-1">
              Sync data <ArrowRight size={11} />
            </Link>
          </CardHeader>
          {loading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-12 rounded-lg bg-white/[0.03] animate-pulse" />
              ))}
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {platformBreakdown.map(({ name, platform, rows, perf, mlReady }) => {
                const color = PLATFORM_COLORS[platform] ?? "#525968";
                return (
                  <li key={platform} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                      style={{ background: `${color}15`, border: `1px solid ${color}30`, color }}>
                      {name.slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] text-[var(--text-primary)]">{name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-[var(--text-muted)]">{fmtNum(rows)} timing · {fmtNum(perf)} analytics</span>
                          {mlReady ? (
                            <span className="flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-[rgba(52,211,153,0.12)] text-[#34D399]">
                              <CheckCircle2 size={8} /> ML
                            </span>
                          ) : (
                            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-white/5 text-[var(--text-muted)]">No ML</span>
                          )}
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${(rows / maxRows) * 100}%`, background: color }} />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* Right column */}
        <div className="flex flex-col gap-4">

          {/* Quick actions */}
          <Card padding="md">
            <CardHeader>
              <CardTitle>Quick actions</CardTitle>
            </CardHeader>
            <div className="grid grid-cols-2 gap-2">
              {QUICK_ACTIONS.map(({ label, href, icon: Icon, color, bg, border }) => (
                <Link
                  key={label}
                  href={href}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all hover:scale-[1.03]"
                  style={{ background: bg, border: `1px solid ${border}` }}
                >
                  <Icon size={16} style={{ color }} />
                  <span className="text-[10px] font-medium text-[var(--text-secondary)] text-center leading-tight">{label}</span>
                </Link>
              ))}
            </div>
          </Card>

          {/* System status */}
          <Card padding="md">
            <CardHeader>
              <CardTitle>System status</CardTitle>
            </CardHeader>
            <ul className="flex flex-col gap-2.5">
              {[
                { label: "Orbit backend", status: true, detail: "orbit-kzqc.onrender.com" },
                { label: "ML models", status: mlReadyCount === 3, detail: `${mlReadyCount}/3 trained` },
                { label: "Data sync", status: totalData > 0, detail: totalData > 0 ? `${fmtNum(totalData)} rows` : "No data" },
                { label: "Platforms", status: connectedCount > 0, detail: `${connectedCount}/6 connected` },
              ].map(({ label, status, detail }) => (
                <li key={label} className="flex items-center gap-2.5">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${status ? "bg-[#34D399]" : "bg-[var(--text-muted)]"}`} />
                  <div className="flex-1 flex items-center justify-between">
                    <span className="text-[11px] text-[var(--text-primary)]">{label}</span>
                    <span className="text-[10px] text-[var(--text-muted)]">{detail}</span>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
