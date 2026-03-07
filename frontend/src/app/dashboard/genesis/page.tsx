"use client";
import { useState, useEffect, useCallback } from "react";
import {
  FlaskConical, TrendingUp, Search, Filter, ArrowRight,
  Sparkles, Target, BarChart3, Zap, ExternalLink, Clock,
  ChevronRight, BookOpen, Users, Globe
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import Card, { CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import {
  fetchStats, fetchTrends, fetchKeywords, fetchSources, generateBrief,
  type Trend, type Keyword, type DataSource, type GenesisStats, type BriefResponse,
} from "@/lib/genesis-api";

const LIFECYCLE_COLOR: Record<string, { text: string; bg: string }> = {
  emerging: { text: "#34D399", bg: "rgba(52,211,153,0.1)" },
  growing:  { text: "#60A5FA", bg: "rgba(96,165,250,0.1)" },
  peak:     { text: "#FBBF24", bg: "rgba(251,191,36,0.1)" },
  declining:{ text: "#F87171", bg: "rgba(248,113,113,0.1)" },
};

const GAP_COLOR: Record<string, string> = {
  high: "#34D399",
  med:  "#FBBF24",
  low:  "#F87171",
};

type Tab = "trends" | "keywords" | "sources";

export default function GenesisPage() {
  const [tab, setTab] = useState<Tab>("trends");
  const [search, setSearch] = useState("");
  const [generating, setGenerating] = useState(false);
  const [brief, setBrief] = useState<BriefResponse | null>(null);

  const [stats, setStats] = useState<GenesisStats | null>(null);
  const [trends, setTrends] = useState<Trend[]>([]);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [sources, setSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats().then(setStats).catch(() => {});
  }, []);

  const loadTabData = useCallback(async (t: Tab, q?: string) => {
    setLoading(true);
    setError(null);
    try {
      if (t === "trends") {
        const res = await fetchTrends(q);
        const unique = (res.trends ?? []).filter(
          (tr, i, arr) => arr.findIndex((x) => x.topic === tr.topic) === i,
        );
        setTrends(unique);
      } else if (t === "keywords") {
        const res = await fetchKeywords();
        setKeywords(res.keywords ?? []);
      } else {
        const res = await fetchSources();
        setSources(res.sources ?? []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTabData(tab);
  }, [tab, loadTabData]);

  useEffect(() => {
    if (tab !== "trends") return;
    const id = setTimeout(() => loadTabData("trends", search), 400);
    return () => clearTimeout(id);
  }, [search, tab, loadTabData]);

  const handleGenerate = async (topic?: string) => {
    setGenerating(true);
    try {
      const t = topic || (trends[0]?.topic ?? "content strategy");
      const res = await generateBrief(t);
      setBrief(res);
    } catch {
      setBrief({
        topic: topic || "Content Strategy 2026",
        target_audience: "Marketing teams exploring AI-assisted content production.",
        angles: ["The shift from copilots to autonomous agents", "Real cost savings from early adopters", "Risks and how to mitigate them"],
        seo_keywords: ["agentic AI", "AI workflow automation", "autonomous agents"],
        recommended_formats: ["Long-form article (2,000–2,500 words)", "LinkedIn carousel (8 slides)", "Short-form video (90 sec)"],
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="p-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[rgba(139,92,246,0.1)] border border-[rgba(139,92,246,0.25)] flex items-center justify-center">
            <FlaskConical size={18} className="text-[#A78BFA]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Genesis</h1>
            <p className="text-sm text-[var(--text-secondary)]">Ideation & Research Laboratory</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(139,92,246,0.08)] border border-[rgba(139,92,246,0.2)]">
            <div className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6] animate-pulse-slow" />
            <span className="text-xs text-[#A78BFA] font-medium">
              {stats ? `${stats.posts_per_hour.toLocaleString()} posts/hr` : "loading…"}
            </span>
          </div>
          <Button
            variant="primary"
            size="md"
            icon={<Sparkles size={13} />}
            onClick={() => handleGenerate()}
            loading={generating}
          >
            Generate brief
          </Button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Trends tracked",   value: stats ? stats.trends_tracked.toLocaleString() : "—",  icon: TrendingUp, color: "#8B5CF6" },
          { label: "Opportunities",    value: stats ? String(stats.opportunities) : "—",             icon: Target,     color: "#6366F1" },
          { label: "Briefs generated", value: stats ? String(stats.briefs_generated) : "—",         icon: BookOpen,   color: "#A78BFA" },
          { label: "Data sources",     value: stats ? String(stats.data_sources) : "—",             icon: Globe,      color: "#818CF8" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} padding="md">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-[var(--text-muted)]">{label}</p>
              <Icon size={14} style={{ color }} />
            </div>
            <p className="text-xl font-bold" style={{ color }}>{value}</p>
          </Card>
        ))}
      </div>

      {/* Brief panel (shown after generation) */}
      {brief && (
        <Card className="mb-6 border-[rgba(139,92,246,0.3)] bg-[rgba(139,92,246,0.05)]" padding="lg">
          <div className="flex items-center gap-3 mb-4">
            <Sparkles size={16} className="text-[#A78BFA]" />
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Generated Content Brief</h2>
            <Badge variant="genesis">Draft</Badge>
            <button
              onClick={() => setBrief(null)}
              className="ml-auto text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            >
              Dismiss
            </button>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <p className="text-[11px] text-[#A78BFA] uppercase tracking-wider font-semibold mb-2">Topic</p>
              <p className="text-base font-semibold text-[var(--text-primary)] mb-3">{brief.topic}</p>
              <p className="text-[11px] text-[#A78BFA] uppercase tracking-wider font-semibold mb-2">Target audience</p>
              <p className="text-sm text-[var(--text-secondary)] mb-3">{brief.target_audience}</p>
              <p className="text-[11px] text-[#A78BFA] uppercase tracking-wider font-semibold mb-2">Key angles</p>
              <ul className="text-sm text-[var(--text-secondary)] space-y-1 list-none">
                {brief.angles.map(a => (
                  <li key={a} className="flex items-start gap-1.5"><ChevronRight size={11} className="text-[#A78BFA] mt-0.5 flex-shrink-0" />{a}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[11px] text-[#A78BFA] uppercase tracking-wider font-semibold mb-2">SEO keywords</p>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {brief.seo_keywords.map(k => (
                  <span key={k} className="px-2 py-0.5 rounded-md bg-[rgba(139,92,246,0.1)] border border-[rgba(139,92,246,0.2)] text-[11px] text-[#A78BFA]">{k}</span>
                ))}
              </div>
              <p className="text-[11px] text-[#A78BFA] uppercase tracking-wider font-semibold mb-2">Recommended formats</p>
              <div className="flex flex-col gap-1.5 mb-4">
                {brief.recommended_formats.map(f => (
                  <div key={f} className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                    <div className="w-1 h-1 rounded-full bg-[#8B5CF6]" />{f}
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="primary" size="sm" icon={<Zap size={12} />}>
                  Send to Forge
                </Button>
                <Button variant="secondary" size="sm">
                  Export brief
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-[var(--border)] mb-5">
        {(["trends", "keywords", "sources"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium capitalize transition-all border-b-2 -mb-px ${
              tab === t
                ? "border-[#8B5CF6] text-[#A78BFA]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            }`}
          >
            {t}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2 pb-2">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search trends…"
              className="input-base pl-8 w-52 text-xs"
            />
          </div>
          <Button variant="secondary" size="sm" icon={<Filter size={12} />}>Filter</Button>
        </div>
      </div>

      {/* Loading / error states */}
      {loading && (
        <div className="flex items-center justify-center py-16 text-sm text-[var(--text-muted)]">
          <div className="w-4 h-4 border-2 border-[#8B5CF6] border-t-transparent rounded-full animate-spin mr-2" />
          Loading…
        </div>
      )}
      {error && !loading && (
        <div className="flex items-center justify-center py-16">
          <p className="text-sm text-[#F87171]">{error}</p>
          <button onClick={() => loadTabData(tab)} className="ml-3 text-sm text-[#A78BFA] underline">Retry</button>
        </div>
      )}

      {/* Tab content */}
      {!loading && !error && tab === "trends" && (
        <div className="grid gap-3">
          {trends.map(({ topic, score, velocity, lifecycle, volume, category, sources = [], gap }) => {
            const lc = LIFECYCLE_COLOR[lifecycle] ?? LIFECYCLE_COLOR.growing;
            return (
              <Card key={topic} hover className="flex items-center gap-4">
                <div className="flex-1 min-w-0 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{ borderColor: "#8B5CF6", color: "#A78BFA", background: "rgba(139,92,246,0.1)" }}>
                    {score}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{topic}</p>
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-medium capitalize flex-shrink-0"
                        style={{ background: lc.bg, color: lc.text }}
                      >
                        {lifecycle}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-[var(--text-muted)]">{category}</span>
                      <span className="text-xs text-[var(--text-muted)]">·</span>
                      <span className="text-xs text-[var(--text-muted)]">{volume} mentions</span>
                      <span className="text-xs text-[var(--text-muted)]">·</span>
                      <div className="flex items-center gap-1">
                        {sources.map(s => (
                          <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-muted)] text-[var(--text-muted)]">{s}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="text-right">
                    <p className="text-xs text-[#34D399] font-medium">{velocity}</p>
                    <p className="text-[10px] text-[var(--text-muted)]">velocity</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: GAP_COLOR[gap] }} />
                      <p className="text-xs font-medium capitalize" style={{ color: GAP_COLOR[gap] }}>{gap} gap</p>
                    </div>
                    <p className="text-[10px] text-[var(--text-muted)]">opportunity</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    iconRight={<ArrowRight size={12} />}
                    onClick={() => handleGenerate(topic)}
                  >
                    Brief
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {!loading && !error && tab === "keywords" && (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  {["Keyword", "Search volume", "Difficulty", "CPC", "Intent", "Action"].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {keywords.map(({ kw, vol, diff, cpc, intent }) => (
                  <tr key={kw} className="border-b border-[var(--border)] hover:bg-white/[0.02] transition-colors last:border-none">
                    <td className="px-5 py-3 text-sm font-medium text-[var(--text-primary)]">{kw}</td>
                    <td className="px-5 py-3 text-sm text-[var(--text-secondary)]">{vol}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 progress-bar">
                          <div className="progress-fill" style={{ width: `${diff}%`, background: diff > 60 ? "#F87171" : diff > 40 ? "#FBBF24" : "#34D399" }} />
                        </div>
                        <span className="text-xs text-[var(--text-secondary)]">{diff}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-[var(--text-secondary)]">{cpc}</td>
                    <td className="px-5 py-3">
                      <span className="capitalize text-xs px-2 py-0.5 rounded-full bg-[var(--bg-muted)] text-[var(--text-muted)]">{intent}</span>
                    </td>
                    <td className="px-5 py-3">
                      <Button variant="ghost" size="sm" iconRight={<ExternalLink size={11} />}>Add to brief</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {!loading && !error && tab === "sources" && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {sources.map(({ name, posts, status, latency }) => (
            <Card key={name} padding="md">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-[var(--text-primary)]">{name}</p>
                <span className={`flex items-center gap-1 text-[10px] font-medium ${status === "live" ? "text-[#34D399]" : "text-[#60A5FA]"}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${status === "live" ? "bg-[#34D399]" : "bg-[#60A5FA]"} animate-pulse-slow`} />
                  {status}
                </span>
              </div>
              <p className="text-xl font-bold text-[var(--text-primary)] mb-1">{posts}</p>
              <p className="text-[10px] text-[var(--text-muted)]">posts this hour</p>
              <div className="mt-3 pt-3 border-t border-[var(--border)] flex items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
                <Clock size={10} />{latency} latency
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
