"use client";
import { useState, useEffect, useCallback, useRef, Fragment } from "react";
import {
  Activity, TrendingUp, TrendingDown, Eye, Heart, MessageCircle,
  Share2, Download, Filter, Search, Sparkles, ChevronDown, ChevronUp,
  ExternalLink, Loader2, Clock, ThumbsUp, Play,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import Badge from "@/components/ui/Badge";
import Card, { CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import {
  fetchMetrics, fetchDailyData, fetchPlatformData, fetchTopContent,
  analyzeUrl, getSuggestions, fetchHistory, fetchDiscoverTrending, fetchContentUrl,
  type DailyDataPoint, type PlatformDataPoint, type TopContentItem, type PulseMetric,
  type AnalyzeResult, type HistorySnapshot, type TrendingItem,
} from "@/lib/pulse-api";

const ICON_MAP: Record<string, React.ElementType> = {
  "Total views": Eye, "Avg. engagement": Heart,
  "Total shares": Share2, "Saves": MessageCircle,
};
const COLOR_MAP: Record<string, string> = {
  "Total views": "#6366F1", "Avg. engagement": "#8B5CF6",
  "Total shares": "#10B981", "Saves": "#3B82F6",
};
const STATUS_CFG: Record<string, { color: string; bg: string; border: string }> = {
  active:     { color: "#34D399", bg: "rgba(52,211,153,0.08)",  border: "rgba(52,211,153,0.2)"  },
  stable:     { color: "#34D399", bg: "rgba(52,211,153,0.08)",  border: "rgba(52,211,153,0.2)"  },
  growing:    { color: "#34D399", bg: "rgba(52,211,153,0.08)",  border: "rgba(52,211,153,0.2)"  },
  monitoring: { color: "#3B82F6", bg: "rgba(59,130,246,0.08)",  border: "rgba(59,130,246,0.2)"  },
  declining:  { color: "#F59E0B", bg: "rgba(245,158,11,0.08)",  border: "rgba(245,158,11,0.2)"  },
  warning:    { color: "#F59E0B", bg: "rgba(245,158,11,0.08)",  border: "rgba(245,158,11,0.2)"  },
  struggling: { color: "#F87171", bg: "rgba(248,113,113,0.08)", border: "rgba(248,113,113,0.2)" },
  critical:   { color: "#F87171", bg: "rgba(248,113,113,0.08)", border: "rgba(248,113,113,0.2)" },
};

function fmtNum(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n ?? 0);
}

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-3 shadow-xl">
      <p className="text-[11px] text-[var(--text-muted)] mb-2">{label}</p>
      {payload.map(({ value, name, color }) => (
        <div key={name} className="flex items-center gap-2 text-xs">
          <div className="w-2 h-2 rounded-full" style={{ background: color }} />
          <span className="text-[var(--text-secondary)] capitalize">{name}:</span>
          <span className="font-medium text-[var(--text-primary)]">{value}</span>
        </div>
      ))}
    </div>
  );
};

export default function PulsePage() {
  // ── Analytics state ──────────────────────────────────────────────────────
  const [range, setRange]             = useState("14d");
  const [metrics, setMetrics]         = useState<PulseMetric[]>([]);
  const [dailyData, setDailyData]     = useState<DailyDataPoint[]>([]);
  const [platformData, setPlatformData] = useState<PlatformDataPoint[]>([]);
  const [topContent, setTopContent]   = useState<TopContentItem[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);

  // ── URL analyzer state ───────────────────────────────────────────────────
  const [urlInput, setUrlInput]           = useState("");
  const [analyzing, setAnalyzing]         = useState(false);
  const [analyzeError, setAnalyzeError]   = useState<string | null>(null);
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResult | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  // ── AI Suggestions (analyzer) ────────────────────────────────────────────
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestions, setSuggestions]               = useState<string[] | null>(null);

  // ── History ──────────────────────────────────────────────────────────────
  const [historyLoading, setHistoryLoading] = useState(false);
  const [history, setHistory]               = useState<HistorySnapshot[] | null>(null);
  const [historyOpen, setHistoryOpen]       = useState(false);

  // ── Row mitigations (top content table) ──────────────────────────────────
  const [expandedRow, setExpandedRow]         = useState<string | null>(null);
  const [rowMitigations, setRowMitigations]   = useState<Record<string, string[]>>({});
  const [rowMitigLoading, setRowMitigLoading] = useState<string | null>(null);

  // ── Discover Trending ────────────────────────────────────────────────────
  const [trendingPlatform, setTrendingPlatform] = useState<"youtube" | "reddit">("youtube");
  const [trending, setTrending]                 = useState<TrendingItem[]>([]);
  const [trendingLoading, setTrendingLoading]   = useState(false);

  // ── Filters ───────────────────────────────────────────────────────────────
  const [filterOpen, setFilterOpen]         = useState(false);
  const [filterPlatform, setFilterPlatform] = useState<string | null>(null);
  const [filterTrend, setFilterTrend]       = useState<"up" | "down" | null>(null);

  // ── Load dashboard analytics ─────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError(null);
      try {
        const [m, d, p, c] = await Promise.all([
          fetchMetrics(range), fetchDailyData(range),
          fetchPlatformData(range), fetchTopContent(range),
        ]);
        if (!cancelled) {
          setMetrics(m.metrics); setDailyData(d.data);
          setPlatformData(p.platforms); setTopContent(c.content);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load analytics");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [range]);

  // ── Load trending ─────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setTrendingLoading(true); setTrending([]);
    fetchDiscoverTrending(trendingPlatform, 8)
      .then(items => { if (!cancelled) setTrending(items); })
      .catch(() => { if (!cancelled) setTrending([]); })
      .finally(() => { if (!cancelled) setTrendingLoading(false); });
    return () => { cancelled = true; };
  }, [trendingPlatform]);

  // ── Run URL analysis ─────────────────────────────────────────────────────
  const runAnalyze = useCallback(async (url: string) => {
    const clean = url.trim();
    if (!clean) return;
    setAnalyzing(true); setAnalyzeError(null);
    setAnalyzeResult(null); setSuggestions(null);
    setHistory(null); setHistoryOpen(false);
    try {
      const res = await analyzeUrl(clean);
      setAnalyzeResult(res);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 150);
    } catch (e) {
      setAnalyzeError(e instanceof Error ? e.message : "Failed to analyze URL");
    } finally {
      setAnalyzing(false);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); runAnalyze(urlInput); };

  const handleGetSuggestions = async () => {
    if (!analyzeResult) return;
    setSuggestionsLoading(true);
    try {
      const res = await getSuggestions(analyzeResult.url ?? urlInput);
      setSuggestions(res.suggestions ?? []);
    } catch {
      setSuggestions(["Unable to fetch suggestions. Please try again."]);
    } finally {
      setSuggestionsLoading(false);
    }
  };

  const handleViewHistory = async () => {
    if (!analyzeResult) return;
    if (historyOpen) { setHistoryOpen(false); return; }
    if (history !== null) { setHistoryOpen(true); return; }
    setHistoryLoading(true);
    try {
      const snaps = await fetchHistory(analyzeResult.content_id);
      setHistory(Array.isArray(snaps) ? snaps : []);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
      setHistoryOpen(true);
    }
  };

  const handleRowToggle = async (contentId: string, url: string) => {
    if (expandedRow === contentId) { setExpandedRow(null); return; }
    setExpandedRow(contentId);
    if (rowMitigations[contentId]) return;
    setRowMitigLoading(contentId);
    try {
      // Top-content API may not return url — fetch it from the history endpoint
      const targetUrl = url || await fetchContentUrl(contentId);
      if (!targetUrl) throw new Error("No URL found");
      const res = await getSuggestions(targetUrl);
      setRowMitigations(prev => ({ ...prev, [contentId]: res.suggestions ?? [] }));
    } catch {
      setRowMitigations(prev => ({ ...prev, [contentId]: ["Could not load suggestions."] }));
    } finally {
      setRowMitigLoading(null);
    }
  };

  const platformChartData = platformData.map(p => ({
    name: p.platform, engagement: p.engagement, reach: Math.round(p.reach / 1000),
  }));

  const filteredContent = topContent.filter(item => {
    if (filterPlatform && item.platform !== filterPlatform) return false;
    if (filterTrend && item.trend !== filterTrend) return false;
    return true;
  });

  // Unique platforms from loaded content for filter dropdown
  const availablePlatforms = [...new Set(topContent.map(c => c.platform))];

  return (
    <div className="p-6 max-w-[1400px]">

      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.25)] flex items-center justify-center">
            <Activity size={18} className="text-[#34D399]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Pulse</h1>
            <p className="text-sm text-[var(--text-secondary)]">Real-Time Analytics & Content Intelligence</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--bg-muted)] border border-[var(--border)]">
            {["7d", "14d", "30d", "90d"].map(r => (
              <button key={r} onClick={() => setRange(r)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  range === r
                    ? "bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm"
                    : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"}`}>
                {r}
              </button>
            ))}
          </div>
          <div className="relative">
            <button
              onClick={() => setFilterOpen(o => !o)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                filterOpen || filterPlatform || filterTrend
                  ? "bg-[rgba(99,102,241,0.12)] border-[rgba(99,102,241,0.3)] text-[#818CF8]"
                  : "bg-white/5 border-[var(--border)] text-[var(--text-secondary)] hover:bg-white/10"}`}>
              <Filter size={12} />
              Filters
              {(filterPlatform || filterTrend) && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#818CF8] ml-0.5" />
              )}
            </button>
            {filterOpen && (
              <div className="absolute right-0 top-full mt-1.5 z-50 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-2xl p-3 w-52">
                <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-2">Platform</p>
                <div className="flex flex-wrap gap-1 mb-3">
                  {[null, ...availablePlatforms].map(p => (
                    <button key={String(p)} onClick={() => setFilterPlatform(p)}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-medium border transition-all ${
                        filterPlatform === p
                          ? "bg-[rgba(99,102,241,0.15)] border-[rgba(99,102,241,0.3)] text-[#818CF8]"
                          : "bg-white/5 border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]"}`}>
                      {p ?? "All"}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-2">Trend</p>
                <div className="flex gap-1 mb-3">
                  {([null, "up", "down"] as const).map(t => (
                    <button key={String(t)} onClick={() => setFilterTrend(t)}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-medium border transition-all ${
                        filterTrend === t
                          ? "bg-[rgba(99,102,241,0.15)] border-[rgba(99,102,241,0.3)] text-[#818CF8]"
                          : "bg-white/5 border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]"}`}>
                      {t === null ? "All" : t === "up" ? "↑ Up" : "↓ Down"}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => { setFilterPlatform(null); setFilterTrend(null); setFilterOpen(false); }}
                  className="w-full text-center text-[10px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] pt-2 border-t border-[var(--border)] transition-colors">
                  Clear all filters
                </button>
              </div>
            )}
          </div>
          <Button variant="secondary" size="sm" icon={<Download size={12} />}>Export</Button>
        </div>
      </div>

      {/* ── URL Analyzer ── */}
      <Card className="mb-6" padding="md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Search size={14} className="text-[#34D399]" />
            <CardTitle>Analyze Content</CardTitle>
          </div>
          <span className="text-[11px] text-[var(--text-muted)]">Paste a YouTube or Reddit URL to get live metrics + AI suggestions</span>
        </CardHeader>

        <form onSubmit={handleSubmit} className="flex gap-2 mt-1">
          <input
            type="url"
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            placeholder="https://youtube.com/watch?v=... or https://reddit.com/r/..."
            className="flex-1 px-3 py-2 rounded-lg bg-[var(--bg-muted)] border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#34D399] transition-colors"
          />
          <button
            type="submit"
            disabled={analyzing || !urlInput.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#34D399] text-black text-sm font-semibold hover:bg-[#6EE7B7] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {analyzing ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
            {analyzing ? "Analyzing…" : "Analyze"}
          </button>
        </form>

        {analyzeError && (
          <p className="mt-3 text-xs text-[#F87171]">⚠ {analyzeError}</p>
        )}

        {/* Result card */}
        {analyzeResult && (
          <div ref={resultRef} className="mt-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-muted)]">
            {/* Title + platform + status */}
            <div className="flex items-start gap-3 mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {analyzeResult.platform && (
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                      {analyzeResult.platform}
                    </span>
                  )}
                  {analyzeResult.status && (() => {
                    const cfg = STATUS_CFG[analyzeResult.status.toLowerCase()] ?? STATUS_CFG.monitoring;
                    return (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                        style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                        {analyzeResult.status.charAt(0).toUpperCase() + analyzeResult.status.slice(1)}
                      </span>
                    );
                  })()}
                </div>
                <p className="text-sm font-semibold text-[var(--text-primary)] line-clamp-2">
                  {analyzeResult.title ?? analyzeResult.url}
                </p>
                {analyzeResult.reason && (
                  <p className="text-xs text-[var(--text-muted)] mt-1">{analyzeResult.reason}</p>
                )}
              </div>
              <a href={analyzeResult.url} target="_blank" rel="noopener noreferrer"
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mt-0.5">
                <ExternalLink size={13} />
              </a>
            </div>

            {/* Stats chips */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
              {[
                { label: "Views",      value: fmtNum(analyzeResult.views ?? 0),      icon: Eye,           color: "#6366F1" },
                { label: "Likes",      value: fmtNum(analyzeResult.likes ?? 0),      icon: ThumbsUp,      color: "#8B5CF6" },
                { label: "Comments",   value: fmtNum(analyzeResult.comments ?? 0),   icon: MessageCircle, color: "#3B82F6" },
                { label: "Engagement", value: `${(analyzeResult.engagement_pct ?? analyzeResult.engagement_rate ?? 0).toFixed(1)}%`, icon: TrendingUp, color: "#34D399" },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border)]">
                  <Icon size={12} style={{ color }} />
                  <div>
                    <p className="text-[10px] text-[var(--text-muted)]">{label}</p>
                    <p className="text-sm font-bold" style={{ color }}>{value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleGetSuggestions}
                disabled={suggestionsLoading || suggestions !== null}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[rgba(99,102,241,0.1)] border border-[rgba(99,102,241,0.25)] text-[#818CF8] hover:bg-[rgba(99,102,241,0.15)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
                {suggestionsLoading ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                {suggestions !== null ? "Suggestions loaded" : suggestionsLoading ? "Loading…" : "Get AI Suggestions"}
              </button>
              <button
                onClick={handleViewHistory}
                disabled={historyLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 border border-[var(--border)] text-[var(--text-secondary)] hover:bg-white/10 transition-colors disabled:opacity-60">
                {historyLoading ? <Loader2 size={11} className="animate-spin" /> : <Clock size={11} />}
                {historyOpen ? "Hide History" : "View History"}
                {!historyLoading && (historyOpen ? <ChevronUp size={10} /> : <ChevronDown size={10} />)}
              </button>
            </div>

            {/* AI Suggestions panel */}
            {suggestions !== null && (
              <div className="mt-3 p-3 rounded-lg bg-[rgba(99,102,241,0.06)] border border-[rgba(99,102,241,0.15)]">
                <p className="text-[10px] font-semibold text-[#818CF8] uppercase tracking-wide mb-2 flex items-center gap-1">
                  <Sparkles size={10} /> AI Suggestions
                </p>
                <ul className="flex flex-col gap-1.5">
                  {suggestions.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-[var(--text-secondary)]">
                      <span className="text-[#818CF8] font-bold flex-shrink-0 mt-px">{i + 1}.</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* History panel */}
            {historyOpen && history !== null && (
              <div className="mt-3 p-3 rounded-lg bg-white/[0.02] border border-[var(--border)]">
                <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-2 flex items-center gap-1">
                  <Clock size={10} /> Performance History
                </p>
                {history.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)]">No history snapshots available yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-[var(--border)]">
                          {["Date", "Views", "Likes", "Comments", "Engagement"].map(h => (
                            <th key={h} className="text-left pb-1.5 text-[9px] font-semibold text-[var(--text-muted)] uppercase tracking-wide pr-4">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {history.map((snap, i) => (
                          <tr key={i} className="border-b border-[var(--border)] last:border-none">
                            <td className="py-1.5 pr-4 text-[10px] text-[var(--text-muted)]">{new Date(snap.snapshot_at).toLocaleDateString()}</td>
                            <td className="py-1.5 pr-4 text-[10px] text-[var(--text-secondary)]">{fmtNum(snap.views ?? 0)}</td>
                            <td className="py-1.5 pr-4 text-[10px] text-[var(--text-secondary)]">{fmtNum(snap.likes ?? 0)}</td>
                            <td className="py-1.5 pr-4 text-[10px] text-[var(--text-secondary)]">{fmtNum(snap.comments ?? 0)}</td>
                            <td className="py-1.5 text-[10px] font-medium text-[#34D399]">{(snap.engagement_pct ?? 0).toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* ── Analytics: loading / error ── */}
      {loading && (
        <div className="flex items-center justify-center py-16 text-sm text-[var(--text-muted)]">
          <div className="w-4 h-4 border-2 border-[#34D399] border-t-transparent rounded-full animate-spin mr-2" />
          Loading analytics…
        </div>
      )}
      {error && !loading && (
        <div className="flex items-center justify-center py-16">
          <p className="text-sm text-[#F87171]">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* ── KPI Cards ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {metrics.map(({ label, value, delta, up }) => {
              const Icon = ICON_MAP[label] ?? Eye;
              const color = COLOR_MAP[label] ?? "#6366F1";
              return (
                <Card key={label} padding="md">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-[var(--text-muted)]">{label}</p>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
                      <Icon size={13} style={{ color }} />
                    </div>
                  </div>
                  <p className="text-2xl font-bold mb-1" style={{ color }}>{value}</p>
                  <div className="flex items-center gap-1.5">
                    {up ? <TrendingUp size={11} className="text-[#34D399]" /> : <TrendingDown size={11} className="text-[#F87171]" />}
                    <span className={`text-xs font-medium ${up ? "text-[#34D399]" : "text-[#F87171]"}`}>{delta}</span>
                    <span className="text-xs text-[var(--text-muted)]">vs prev period</span>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* ── Timeseries ── */}
          <Card className="mb-4" padding="md">
            <CardHeader>
              <CardTitle>Views & engagement over time</CardTitle>
              <div className="flex items-center gap-3 text-[11px] text-[var(--text-muted)]">
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#6366F1]" /> Views</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#34D399]" /> Engagement %</span>
              </div>
            </CardHeader>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={dailyData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6366F1" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="engGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#34D399" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#34D399" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} interval={2} />
                <YAxis tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="views"      stroke="#6366F1" strokeWidth={2} fill="url(#viewsGrad)" dot={false} name="Views" />
                <Area type="monotone" dataKey="engagement" stroke="#34D399" strokeWidth={2} fill="url(#engGrad)"   dot={false} name="Engagement" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          {/* ── Platform + Top Content ── */}
          <div className="grid lg:grid-cols-5 gap-4 mb-4">
            {/* Platform breakdown */}
            <Card className="lg:col-span-2" padding="md">
              <CardHeader><CardTitle>Performance by platform</CardTitle></CardHeader>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={platformChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="engagement" fill="#6366F1" radius={[3,3,0,0]} name="Engagement %" />
                </BarChart>
              </ResponsiveContainer>
              <ul className="flex flex-col gap-2 mt-3 pt-3 border-t border-[var(--border)]">
                {platformData.map(({ platform, engagement, posts, color }) => (
                  <li key={platform} className="flex items-center gap-2.5">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                    <span className="text-xs text-[var(--text-secondary)] flex-1">{platform}</span>
                    <span className="text-xs text-[var(--text-muted)]">{posts} posts</span>
                    <span className="text-xs font-medium" style={{ color }}>{engagement}%</span>
                  </li>
                ))}
              </ul>
            </Card>

            {/* Top content with inline AI suggestions */}
            <Card className="lg:col-span-3" padding="md">
              <CardHeader>
                <CardTitle>Top performing content</CardTitle>
                <span className="text-[10px] text-[var(--text-muted)]">✦ AI suggestions</span>
              </CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      {["Content", "Platform", "Views", "Eng.", "Trend", ""].map(h => (
                        <th key={h} className="text-left pb-2 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide pr-3 last:pr-0">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredContent.length === 0 ? (
                      <tr><td colSpan={6} className="py-8 text-center text-xs text-[var(--text-muted)]">No content matches the current filters</td></tr>
                    ) : filteredContent.map((item) => {
                      const { content_id, title, platform, views, eng, trend, delta } = item;
                      const isExpanded = expandedRow === content_id;
                      return (
                        <Fragment key={content_id}>
                          <tr className={`border-b border-[var(--border)] hover:bg-white/[0.02] transition-colors ${isExpanded ? "bg-white/[0.02]" : ""}`}>
                            <td className="py-2.5 pr-3">
                              <p className="text-xs font-medium text-[var(--text-primary)] truncate max-w-[160px]">{title}</p>
                            </td>
                            <td className="py-2.5 pr-3">
                              <span className="text-xs text-[var(--text-muted)]">{platform}</span>
                            </td>
                            <td className="py-2.5 pr-3">
                              <span className="text-xs font-medium text-[var(--text-secondary)]">{views}</span>
                            </td>
                            <td className="py-2.5 pr-3">
                              <Badge variant={parseFloat(eng) > 7 ? "success" : "default"} className="text-[10px]">{eng}</Badge>
                            </td>
                            <td className="py-2.5 pr-3">
                              <div className={`flex items-center gap-1 text-xs font-medium ${trend === "up" ? "text-[#34D399]" : "text-[#F87171]"}`}>
                                {trend === "up" ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                                {delta}
                              </div>
                            </td>
                            <td className="py-2.5">
                              <button
                                onClick={() => handleRowToggle(content_id, item.url)}
                                title="Get AI suggestions"
                                className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-colors ${
                                  isExpanded
                                    ? "bg-[rgba(99,102,241,0.15)] text-[#818CF8]"
                                    : "bg-white/5 text-[var(--text-muted)] hover:text-[#818CF8] hover:bg-[rgba(99,102,241,0.1)]"}`}>
                                {rowMitigLoading === content_id
                                  ? <Loader2 size={9} className="animate-spin" />
                                  : <Sparkles size={9} />}
                                ✦
                              </button>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr>
                              <td colSpan={6} className="pb-3 pt-1">
                                <div className="p-3 rounded-lg bg-[rgba(99,102,241,0.05)] border border-[rgba(99,102,241,0.12)]">
                                  {rowMitigLoading === content_id ? (
                                    <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                                      <Loader2 size={11} className="animate-spin" /> Loading AI suggestions…
                                    </div>
                                  ) : rowMitigations[content_id] ? (
                                    <>
                                      <p className="text-[10px] font-semibold text-[#818CF8] uppercase tracking-wide mb-2 flex items-center gap-1">
                                        <Sparkles size={9} /> AI Suggestions
                                      </p>
                                      <ul className="flex flex-col gap-1.5">
                                        {rowMitigations[content_id].map((s, i) => (
                                          <li key={i} className="flex items-start gap-2 text-xs text-[var(--text-secondary)]">
                                            <span className="text-[#818CF8] font-bold flex-shrink-0">{i + 1}.</span> {s}
                                          </li>
                                        ))}
                                      </ul>
                                    </>
                                  ) : null}
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </>
      )}

      {/* ── Discover Trending ── */}
      <Card padding="md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp size={14} className="text-[#F59E0B]" />
            <CardTitle>Discover Trending</CardTitle>
          </div>
          <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--bg-muted)] border border-[var(--border)]">
            {(["youtube", "reddit"] as const).map(p => (
              <button key={p} onClick={() => setTrendingPlatform(p)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  trendingPlatform === p
                    ? "bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm"
                    : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"}`}>
                {p === "youtube" ? "YouTube" : "Reddit"}
              </button>
            ))}
          </div>
        </CardHeader>

        {trendingLoading ? (
          <div className="flex flex-col gap-3 mt-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 rounded-lg bg-white/[0.03] animate-pulse" />
            ))}
          </div>
        ) : trending.length === 0 ? (
          <div className="flex items-center justify-center py-10 text-sm text-[var(--text-muted)]">
            No trending content available right now
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-[var(--border)] mt-2">
            {trending.map((item, i) => (
              <li key={item.post_id ?? i} className="flex items-center gap-3 py-3 first:pt-1">
                <span className="text-[11px] font-bold text-[var(--text-muted)] w-4 text-center flex-shrink-0">{i + 1}</span>

                {item.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.thumbnail} alt={item.title} className="w-10 h-10 rounded-md object-cover flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-md bg-[var(--bg-muted)] border border-[var(--border)] flex items-center justify-center flex-shrink-0">
                    <Play size={12} className="text-[var(--text-muted)]" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[var(--text-primary)] truncate">{item.title}</p>
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                    {item.channel_title ?? item.subreddit ?? item.author ?? item.platform}
                  </p>
                </div>

                <div className="hidden sm:flex items-center gap-4 flex-shrink-0">
                  <div className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                    <Eye size={9} /> {fmtNum(item.views)}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                    <ThumbsUp size={9} /> {fmtNum(item.likes)}
                  </div>
                  <span className="text-[10px] font-medium text-[#34D399]">
                    {item.engagement_pct.toFixed(1)}%
                  </span>
                </div>

                <button
                  onClick={() => { setUrlInput(item.post_url); runAnalyze(item.post_url); }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-[rgba(52,211,153,0.08)] border border-[rgba(52,211,153,0.15)] text-[#34D399] hover:bg-[rgba(52,211,153,0.15)] transition-colors flex-shrink-0">
                  <Search size={9} /> Analyze
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
