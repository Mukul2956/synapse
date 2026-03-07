"use client";
import { useState, useEffect } from "react";
import {
  Activity, TrendingUp, TrendingDown, Eye, Heart, MessageCircle,
  Share2, ArrowRight, Download, Filter
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import Badge from "@/components/ui/Badge";
import Card, { CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import {
  fetchMetrics, fetchDailyData, fetchPlatformData, fetchTopContent,
  type DailyDataPoint, type PlatformDataPoint, type TopContentItem, type PulseMetric,
} from "@/lib/pulse-api";

const ICON_MAP: Record<string, React.ElementType> = {
  "Total views": Eye,
  "Avg. engagement": Heart,
  "Total shares": Share2,
  "Saves": MessageCircle,
};

const COLOR_MAP: Record<string, string> = {
  "Total views": "#6366F1",
  "Avg. engagement": "#8B5CF6",
  "Total shares": "#10B981",
  "Saves": "#3B82F6",
};

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) => {
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
  const [range, setRange] = useState("14d");

  const [metrics, setMetrics] = useState<PulseMetric[]>([]);
  const [dailyData, setDailyData] = useState<DailyDataPoint[]>([]);
  const [platformData, setPlatformData] = useState<PlatformDataPoint[]>([]);
  const [topContent, setTopContent] = useState<TopContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [m, d, p, c] = await Promise.all([
          fetchMetrics(range),
          fetchDailyData(range),
          fetchPlatformData(range),
          fetchTopContent(range),
        ]);
        if (!cancelled) {
          setMetrics(m.metrics);
          setDailyData(d.data);
          setPlatformData(p.platforms);
          setTopContent(c.content);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load analytics");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [range]);

  const platformChartData = platformData.map(p => ({
    name: p.platform,
    engagement: p.engagement,
    reach: Math.round(p.reach / 1000),
  }));

  return (
    <div className="p-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.25)] flex items-center justify-center">
            <Activity size={18} className="text-[#34D399]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Pulse</h1>
            <p className="text-sm text-[var(--text-secondary)]">Real-Time Analytics & Content Evolution</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--bg-muted)] border border-[var(--border)]">
            {["7d", "14d", "30d", "90d"].map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  range === r
                    ? "bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm"
                    : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <Button variant="secondary" size="sm" icon={<Filter size={12} />}>Filters</Button>
          <Button variant="secondary" size="sm" icon={<Download size={12} />}>Export</Button>
        </div>
      </div>

      {/* Loading / error */}
      {loading && (
        <div className="flex items-center justify-center py-20 text-sm text-[var(--text-muted)]">
          <div className="w-4 h-4 border-2 border-[#34D399] border-t-transparent rounded-full animate-spin mr-2" />
          Loading analytics…
        </div>
      )}
      {error && !loading && (
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-[#F87171]">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Metrics */}
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

          {/* Main chart */}
          <Card className="mb-4" padding="md">
            <CardHeader>
              <CardTitle>Views & engagement over time</CardTitle>
              <div className="flex items-center gap-3 text-[11px] text-[var(--text-muted)]">
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#6366F1]" /> Views (K)</span>
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
                <Area type="monotone" dataKey="views" stroke="#6366F1" strokeWidth={2} fill="url(#viewsGrad)" dot={false} name="Views" />
                <Area type="monotone" dataKey="engagement" stroke="#34D399" strokeWidth={2} fill="url(#engGrad)" dot={false} name="Engagement" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          {/* Bottom grid */}
          <div className="grid lg:grid-cols-5 gap-4">
            {/* Platform breakdown */}
            <Card className="lg:col-span-2" padding="md">
              <CardHeader>
                <CardTitle>Performance by platform</CardTitle>
              </CardHeader>
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

            {/* Top performing content */}
            <Card className="lg:col-span-3" padding="md">
              <CardHeader>
                <CardTitle>Top performing content</CardTitle>
                <Button variant="ghost" size="sm" iconRight={<ArrowRight size={11} />}>All content</Button>
              </CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      {["Content", "Platform", "Views", "Engagement", "Trend"].map(h => (
                        <th key={h} className="text-left pb-2 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide pr-4 last:pr-0">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {topContent.map(({ title, platform, views, eng, trend, delta }) => (
                      <tr key={title} className="border-b border-[var(--border)] last:border-none hover:bg-white/[0.02] transition-colors">
                        <td className="py-2.5 pr-4">
                          <p className="text-xs font-medium text-[var(--text-primary)] truncate max-w-[200px]">{title}</p>
                        </td>
                        <td className="py-2.5 pr-4">
                          <span className="text-xs text-[var(--text-muted)]">{platform}</span>
                        </td>
                        <td className="py-2.5 pr-4">
                          <span className="text-xs font-medium text-[var(--text-secondary)]">{views}</span>
                        </td>
                        <td className="py-2.5 pr-4">
                          <Badge variant={parseFloat(eng) > 7 ? "success" : "default"} className="text-[10px]">{eng}</Badge>
                        </td>
                        <td className="py-2.5">
                          <div className={`flex items-center gap-1 text-xs font-medium ${trend === "up" ? "text-[#34D399]" : "text-[#F87171]"}`}>
                            {trend === "up" ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                            {delta}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
