"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Hammer,
  FileText,
  Upload,
  Link2,
  X,
  Mic,
  Film,
  PenLine,
  MessageCircle,
  Images,
  Briefcase,
  Play,
  Mail,
  Zap,
  Monitor,
  ScrollText,
  ChevronDown,
  RefreshCw,
  Download,
  Copy,
  Check,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  Plus,
  AlertTriangle,
  Activity,
  Loader2,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import Badge from "@/components/ui/Badge";
import Card, { CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import {
  type TransformResponse,
  type ProvidersResponse,
  transformContent,
  regenerateContent,
  fetchProviders,
  OUTPUT_FORMATS,
  LLM_PROVIDERS,
} from "@/lib/forge-api";

/* ── Icon map for output formats ─────────────────────── */
const FORMAT_ICONS: Record<string, typeof FileText> = {
  podcast_script: Mic,
  video_script: Film,
  blog_post: PenLine,
  twitter_thread: MessageCircle,
  instagram_carousel: Images,
  linkedin_article: Briefcase,
  youtube_script: Play,
  newsletter: Mail,
  short_form_script: Zap,
  presentation: Monitor,
  generic_script: ScrollText,
};

/* ── File helpers ────────────────────────────────────── */
const FILE_TYPE_ICON: Record<string, typeof FileText> = {
  image: Images,
  video: Film,
  audio: Mic,
  text: FileText,
  application: FileText,
};

function getFileIcon(file: File) {
  const type = file.type.split("/")[0];
  return FILE_TYPE_ICON[type] || FileText;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  if (bytes >= 1_024) return `${(bytes / 1_024).toFixed(1)} KB`;
  return `${bytes} B`;
}

const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/bmp",
  "image/tiff",
  "video/mp4",
  "video/mpeg",
  "video/x-msvideo",
  "video/webm",
  "video/quicktime",
  "video/x-matroska",
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "audio/flac",
  "audio/aac",
  "audio/mp4",
  "text/plain",
  "text/html",
  "text/markdown",
  "application/pdf",
].join(",");

/* ── Tab type ────────────────────────────────────────── */
type OutputTab = "quality" | "analysis" | "pipeline";

/* ── Pipeline stages for progress indicator ──────────── */
const PIPELINE_STAGES = [
  { key: "ingestion",     label: "Ingestion",     desc: "Extracting content from sources…",       delay: 3000  },
  { key: "analysis",      label: "Analysis",       desc: "Analyzing semantics, tone & emotion…",  delay: 15000 },
  { key: "generation",    label: "Generation",     desc: "Generating script with LLM…",           delay: 40000 },
  { key: "quality_check", label: "Quality Check",  desc: "Validating output quality…",            delay: 10000 },
] as const;

/* ================================================================
   FORGE PAGE
   ================================================================ */
export default function ForgePage() {
  /* ── Input state ───────────────────────────────────── */
  const [textInput, setTextInput] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [urls, setUrls] = useState<string[]>([]);
  const [urlInput, setUrlInput] = useState("");

  /* ── Configuration ─────────────────────────────────── */
  const [outputFormat, setOutputFormat] = useState("generic_script");
  const [outputDescription, setOutputDescription] = useState("");
  const [durationSeconds, setDurationSeconds] = useState("");
  const [additionalInstructions, setAdditionalInstructions] = useState("");
  const [preferredProvider, setPreferredProvider] = useState("");

  /* ── Result ────────────────────────────────────────── */
  const [result, setResult] = useState<TransformResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ── Regeneration ──────────────────────────────────── */
  const [feedback, setFeedback] = useState("");
  const [regenerating, setRegenerating] = useState(false);

  /* ── UI ────────────────────────────────────────────── */
  const [copied, setCopied] = useState(false);
  const [outputTab, setOutputTab] = useState<OutputTab>("quality");
  const [providers, setProviders] = useState<ProvidersResponse | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [pipelineStage, setPipelineStage] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stageTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── Fetch providers on mount ──────────────────────── */
  useEffect(() => {
    fetchProviders()
      .then(setProviders)
      .catch(() => {
        /* backend might not be running */
      });
  }, []);

  /* ── Drag-and-drop handlers ────────────────────────── */
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = Array.from(e.dataTransfer.files);
    setFiles((prev) => [...prev, ...dropped]);
  }, []);
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);
  const handleDragLeave = useCallback(() => setDragOver(false), []);

  const removeFile = (i: number) =>
    setFiles((prev) => prev.filter((_, idx) => idx !== i));

  /* ── URL helpers ───────────────────────────────────── */
  const addUrl = () => {
    const trimmed = urlInput.trim();
    if (
      trimmed &&
      (trimmed.startsWith("http://") || trimmed.startsWith("https://")) &&
      urls.length < 10
    ) {
      setUrls((prev) => [...prev, trimmed]);
      setUrlInput("");
    }
  };
  const removeUrl = (i: number) =>
    setUrls((prev) => prev.filter((_, idx) => idx !== i));

  /* ── Derived ───────────────────────────────────────── */
  const hasInput = textInput.trim() || files.length > 0 || urls.length > 0;
  const formatLabel =
    OUTPUT_FORMATS.find((f) => f.value === outputFormat)?.label || outputFormat;

  /* ── Transform ─────────────────────────────────────── */
  const handleTransform = async () => {
    if (!hasInput) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setPipelineStage(0);

    // Simulate stage progression based on estimated timings
    let stageIdx = 0;
    const advanceStage = () => {
      stageIdx += 1;
      if (stageIdx < PIPELINE_STAGES.length) {
        setPipelineStage(stageIdx);
        stageTimerRef.current = setTimeout(advanceStage, PIPELINE_STAGES[stageIdx].delay);
      }
    };
    stageTimerRef.current = setTimeout(advanceStage, PIPELINE_STAGES[0].delay);

    try {
      // Build duration enforcement hint if the user set a target
      let finalInstructions = additionalInstructions || "";
      if (durationSeconds && parseInt(durationSeconds) > 0) {
        const secs = parseInt(durationSeconds);
        const approxWords = Math.round(secs * 2.5); // ~150 wpm spoken
        const approxMinutes = (secs / 60).toFixed(1);
        const durationHint = `\n\n[DURATION CONSTRAINT — MANDATORY] The output MUST be approximately ${secs} seconds (${approxMinutes} min) of spoken content, which equals roughly ${approxWords} words. Do NOT exceed ${Math.round(approxWords * 1.15)} words. This is a hard limit.`;
        finalInstructions = finalInstructions.trim() + durationHint;
      }

      const res = await transformContent({
        files: files.length > 0 ? files : undefined,
        textInput: textInput.trim() || undefined,
        urls: urls.length > 0 ? urls : undefined,
        outputFormat,
        outputDescription: outputDescription || undefined,
        durationSeconds: durationSeconds
          ? parseInt(durationSeconds)
          : undefined,
        additionalInstructions: finalInstructions.trim() || undefined,
        preferredProvider: preferredProvider || undefined,
      });
      setResult(res);
      if (!res.success && res.error) setError(res.error);
      setOutputTab("quality");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transform failed");
    } finally {
      if (stageTimerRef.current) clearTimeout(stageTimerRef.current);
      stageTimerRef.current = null;
      setLoading(false);
    }
  };

  /* ── Regenerate ────────────────────────────────────── */
  const handleRegenerate = async (withFeedback: boolean) => {
    if (!result?.content_id) return;
    setRegenerating(true);
    setError(null);

    try {
      const res = await regenerateContent({
        contentId: result.content_id,
        feedback: withFeedback ? feedback.trim() || undefined : undefined,
        preferredProvider: preferredProvider || undefined,
      });
      setResult((prev) =>
        prev
          ? {
              ...prev,
              content_id: res.content_id,
              success: res.success,
              generated_script: res.generated_script,
              quality: res.quality,
              stages: res.stages,
              total_duration_seconds: res.total_duration_seconds,
              generation_metadata: res.generation_metadata,
              error: res.error,
            }
          : null
      );
      if (!res.success && res.error) setError(res.error);
      setOutputTab("quality");
      setFeedback("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Regeneration failed");
    } finally {
      setRegenerating(false);
    }
  };

  /* ── Clipboard / export ────────────────────────────── */
  const handleCopy = async () => {
    if (!result?.generated_script) return;
    await navigator.clipboard.writeText(result.generated_script);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = () => {
    if (!result?.generated_script) return;
    const blob = new Blob([result.generated_script], {
      type: "text/markdown",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `forge-${result.output_format}-${result.content_id.slice(0, 8)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ================================================================
     RENDER
     ================================================================ */
  return (
    <div className="p-6 max-w-[1400px]">
      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.25)] flex items-center justify-center">
            <Hammer size={18} className="text-[#FCD34D]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
              Forge
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Content Transformation Pipeline
            </p>
          </div>
        </div>

        {/* Provider health dots */}
        {providers && (
          <div className="flex items-center gap-1.5">
            {providers.providers.map((p) => (
              <div
                key={p.name}
                className="flex items-center gap-1 px-2 py-1 rounded-md bg-[var(--bg-muted)] border border-[var(--border)]"
                title={`${p.name}${p.healthy ? " — available" : " — unavailable"}${p.model ? ` (${p.model})` : ""}`}
              >
                <div
                  className={`w-1.5 h-1.5 rounded-full ${p.healthy ? "bg-[#34D399]" : "bg-[var(--text-muted)]"}`}
                />
                <span className="text-[10px] text-[var(--text-secondary)] capitalize">
                  {p.name}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Error banner ───────────────────────────────── */}
      {error && (
        <div className="mb-5 p-3 rounded-lg bg-[rgba(248,113,113,0.08)] border border-[rgba(248,113,113,0.2)] flex items-start gap-2 animate-fade-in">
          <AlertCircle
            size={14}
            className="text-[#F87171] mt-0.5 flex-shrink-0"
          />
          <div className="flex-1">
            <p className="text-xs text-[#F87171] font-medium">Error</p>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              {error}
            </p>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* ── Main grid ──────────────────────────────────── */}
      <div className="grid lg:grid-cols-5 gap-5">
        {/* ============================
            LEFT PANEL — INPUT
            ============================ */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* ── Input Sources ───────────────────────────── */}
          <Card padding="md">
            <CardHeader>
              <CardTitle>Input Sources</CardTitle>
            </CardHeader>

            {/* Text */}
            <div className="mb-3">
              <label className="text-xs text-[var(--text-muted)] mb-1.5 flex items-center gap-1">
                <FileText size={10} /> Text input
              </label>
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                className="input-base resize-none text-sm leading-relaxed"
                rows={3}
                placeholder="Paste or type content to transform…"
                maxLength={500000}
              />
              {textInput.length > 0 && (
                <span className="text-[10px] text-[var(--text-muted)] mt-1 block text-right">
                  {textInput.length.toLocaleString()} / 500,000
                </span>
              )}
            </div>

            {/* Files */}
            <div className="mb-3">
              <label className="text-xs text-[var(--text-muted)] mb-1.5 flex items-center gap-1">
                <Upload size={10} /> Files
              </label>
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`border border-dashed rounded-lg p-4 text-center cursor-pointer transition-all ${
                  dragOver
                    ? "border-[#F59E0B] bg-[rgba(245,158,11,0.05)]"
                    : "border-[var(--border)] hover:border-[var(--border-strong)] hover:bg-white/[0.02]"
                }`}
              >
                <Upload
                  size={16}
                  className="mx-auto mb-1.5 text-[var(--text-muted)]"
                />
                <p className="text-xs text-[var(--text-secondary)]">
                  Drop files here or click to browse
                </p>
                <p className="text-[10px] text-[var(--text-muted)] mt-1">
                  Images, video, audio, text, PDF — max 500 MB
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept={ACCEPTED_TYPES}
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files)
                      setFiles((prev) => [
                        ...prev,
                        ...Array.from(e.target.files!),
                      ]);
                    e.target.value = "";
                  }}
                />
              </div>
              {files.length > 0 && (
                <ul className="mt-2 flex flex-col gap-1">
                  {files.map((file, i) => {
                    const Icon = getFileIcon(file);
                    return (
                      <li
                        key={`${file.name}-${i}`}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-[var(--bg-surface)] border border-[var(--border)]"
                      >
                        <Icon
                          size={12}
                          className="text-[var(--text-muted)] flex-shrink-0"
                        />
                        <span className="text-xs text-[var(--text-secondary)] truncate flex-1">
                          {file.name}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)]">
                          {formatBytes(file.size)}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile(i);
                          }}
                          className="text-[var(--text-muted)] hover:text-[#F87171]"
                        >
                          <X size={11} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* URLs */}
            <div>
              <label className="text-xs text-[var(--text-muted)] mb-1.5 flex items-center gap-1">
                <Link2 size={10} /> URLs
              </label>
              <div className="flex gap-1.5">
                <input
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addUrl()}
                  className="input-base text-sm flex-1"
                  placeholder="https://example.com/article"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={addUrl}
                  icon={<Plus size={12} />}
                  disabled={!urlInput.trim() || urls.length >= 10}
                >
                  Add
                </Button>
              </div>
              {urls.length > 0 && (
                <ul className="mt-2 flex flex-col gap-1">
                  {urls.map((url, i) => (
                    <li
                      key={`${url}-${i}`}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-[var(--bg-surface)] border border-[var(--border)]"
                    >
                      <Link2
                        size={11}
                        className="text-[var(--text-muted)] flex-shrink-0"
                      />
                      <span className="text-xs text-[var(--text-secondary)] truncate flex-1">
                        {url}
                      </span>
                      <button
                        onClick={() => removeUrl(i)}
                        className="text-[var(--text-muted)] hover:text-[#F87171]"
                      >
                        <X size={11} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {urls.length >= 10 && (
                <p className="text-[10px] text-[#FBBF24] mt-1">
                  Maximum 10 URLs
                </p>
              )}
            </div>
          </Card>

          {/* ── Output Format ──────────────────────────── */}
          <Card padding="md">
            <CardHeader>
              <CardTitle>Output Format</CardTitle>
            </CardHeader>
            <div className="grid grid-cols-3 gap-1.5">
              {OUTPUT_FORMATS.map(({ value, label }) => {
                const Icon = FORMAT_ICONS[value] || ScrollText;
                const selected = outputFormat === value;
                return (
                  <button
                    key={value}
                    onClick={() => setOutputFormat(value)}
                    className={`flex flex-col items-center gap-1 p-2.5 rounded-lg border text-center transition-all ${
                      selected
                        ? "border-[rgba(245,158,11,0.4)] bg-[rgba(245,158,11,0.08)]"
                        : "border-[var(--border)] hover:border-[var(--border-strong)] hover:bg-white/5"
                    }`}
                  >
                    <Icon
                      size={14}
                      style={{
                        color: selected ? "#FCD34D" : "var(--text-muted)",
                      }}
                    />
                    <span
                      className={`text-[10px] font-medium leading-tight ${selected ? "text-[#FCD34D]" : "text-[var(--text-secondary)]"}`}
                    >
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* ── Configuration ──────────────────────────── */}
          <Card padding="md">
            <CardHeader>
              <CardTitle>Configuration</CardTitle>
            </CardHeader>
            <div className="flex flex-col gap-3">
              {/* Output description */}
              <div>
                <label className="text-xs text-[var(--text-muted)] mb-1.5 block">
                  Output description
                </label>
                <textarea
                  value={outputDescription}
                  onChange={(e) => setOutputDescription(e.target.value)}
                  className="input-base resize-none text-sm"
                  rows={2}
                  placeholder="Describe the desired output style, audience, focus…"
                  maxLength={2000}
                />
              </div>

              {/* Duration */}
              <div>
                <label className="text-xs text-[var(--text-muted)] mb-1.5 block">
                  Target duration (seconds)
                </label>
                <input
                  type="number"
                  value={durationSeconds}
                  onChange={(e) => setDurationSeconds(e.target.value)}
                  className="input-base text-sm"
                  placeholder="e.g. 300 for a 5-minute script"
                  min={5}
                  max={7200}
                />
                {durationSeconds && parseInt(durationSeconds) > 0 && (
                  <span className="text-[10px] text-[var(--text-muted)] mt-1 block">
                    ≈ {Math.round(parseInt(durationSeconds) / 60)} min
                  </span>
                )}
              </div>

              {/* Additional instructions */}
              <div>
                <label className="text-xs text-[var(--text-muted)] mb-1.5 block">
                  Additional instructions
                </label>
                <textarea
                  value={additionalInstructions}
                  onChange={(e) => setAdditionalInstructions(e.target.value)}
                  className="input-base resize-none text-sm"
                  rows={2}
                  placeholder="Extra guidance for the generation…"
                  maxLength={5000}
                />
              </div>

              {/* Provider */}
              <div>
                <label className="text-xs text-[var(--text-muted)] mb-1.5 block">
                  LLM Provider
                </label>
                <div className="relative">
                  <select
                    value={preferredProvider}
                    onChange={(e) => setPreferredProvider(e.target.value)}
                    className="input-base pr-8 appearance-none text-sm"
                  >
                    <option value="">Auto (default)</option>
                    {LLM_PROVIDERS.map((p) => (
                      <option key={p} value={p}>
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                        {providers?.providers.find((pr) => pr.name === p)
                          ?.healthy === false
                          ? " (unavailable)"
                          : ""}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={13}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* ── Transform button ───────────────────────── */}
          <Button
            variant="primary"
            size="lg"
            loading={loading}
            icon={<Sparkles size={15} />}
            className="w-full bg-[#F59E0B] hover:bg-[#FCD34D] hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] text-black font-semibold"
            onClick={handleTransform}
            disabled={!hasInput || loading}
          >
            {loading ? "Transforming…" : "Transform"}
          </Button>
        </div>

        {/* ============================
            RIGHT PANEL — OUTPUT
            ============================ */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          {/* ── Empty state ────────────────────────────── */}
          {!result && !loading && (
            <Card
              padding="lg"
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div className="w-12 h-12 rounded-xl bg-[rgba(245,158,11,0.08)] border border-[rgba(245,158,11,0.15)] flex items-center justify-center mb-4">
                <Sparkles size={20} className="text-[var(--text-muted)]" />
              </div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
                Ready to transform
              </h3>
              <p className="text-xs text-[var(--text-muted)] max-w-xs leading-relaxed">
                Provide text, files, or URLs as input, choose an output format,
                and hit <strong className="text-[#FCD34D]">Transform</strong>.
                Forge will analyze your content and generate a complete script.
              </p>
            </Card>
          )}

          {/* ── Loading state ──────────────────────────── */}
          {loading && !result && (
            <Card padding="lg" className="py-12">
              <div className="mb-6 text-center">
                <Loader2
                  size={22}
                  className="text-[#F59E0B] animate-spin mx-auto mb-3"
                />
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
                  Transforming content…
                </h3>
              </div>

              {/* Progress bar */}
              <div className="mx-auto max-w-sm mb-5">
                <div className="progress-bar h-1.5 rounded-full">
                  <div
                    className="h-full rounded-full transition-all duration-1000 ease-out"
                    style={{
                      width: `${((pipelineStage + 1) / PIPELINE_STAGES.length) * 100}%`,
                      background: "linear-gradient(90deg, #F59E0B, #FCD34D)",
                    }}
                  />
                </div>
                <p className="text-center text-[10px] text-[var(--text-muted)] mt-2">
                  Stage {pipelineStage + 1} of {PIPELINE_STAGES.length}
                </p>
              </div>

              {/* Stage steps */}
              <div className="flex flex-col gap-2 max-w-xs mx-auto">
                {PIPELINE_STAGES.map((stage, i) => {
                  const isActive = i === pipelineStage;
                  const isDone = i < pipelineStage;
                  return (
                    <div
                      key={stage.key}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300 ${
                        isActive
                          ? "bg-[rgba(245,158,11,0.08)] border border-[rgba(245,158,11,0.25)]"
                          : isDone
                            ? "opacity-60"
                            : "opacity-30"
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle2 size={14} className="text-[#34D399] flex-shrink-0" />
                      ) : isActive ? (
                        <Loader2 size={14} className="text-[#F59E0B] animate-spin flex-shrink-0" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border border-[var(--border)] flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium ${isActive ? "text-[#FCD34D]" : isDone ? "text-[var(--text-secondary)]" : "text-[var(--text-muted)]"}`}>
                          {stage.label}
                        </p>
                        {isActive && (
                          <p className="text-[10px] text-[var(--text-muted)] mt-0.5 truncate">
                            {stage.desc}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* ── Results ────────────────────────────────── */}
          {result && (
            <>
              {/* Generated Script Card */}
              <Card padding="none">
                {/* Toolbar */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)] flex-wrap">
                  <div className="flex items-center gap-1.5">
                    {(() => {
                      const Ic =
                        FORMAT_ICONS[result.output_format] || ScrollText;
                      return <Ic size={13} className="text-[#FCD34D]" />;
                    })()}
                    <span className="text-xs font-medium text-[var(--text-primary)]">
                      {formatLabel}
                    </span>
                  </div>

                  {result.quality && (
                    <Badge variant="forge" className="text-[10px]">
                      {result.quality.word_count.toLocaleString()} words
                    </Badge>
                  )}
                  {result.quality && (
                    <Badge
                      variant={result.quality.passed ? "success" : "warning"}
                      className="text-[10px]"
                    >
                      {result.quality.passed ? "Passed" : "Needs review"}
                    </Badge>
                  )}

                  <div className="ml-auto flex items-center gap-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<RefreshCw size={12} />}
                      onClick={() => handleRegenerate(false)}
                      loading={regenerating}
                    >
                      Regenerate
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={
                        copied ? <Check size={12} /> : <Copy size={12} />
                      }
                      onClick={handleCopy}
                    >
                      {copied ? "Copied" : "Copy"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Download size={12} />}
                      onClick={handleExport}
                    >
                      Export
                    </Button>
                  </div>
                </div>

                {/* Script body */}
                <div className="p-5 h-[420px] overflow-y-auto">
                  {result.generated_script ? (
                    <div className="prose-forge text-sm text-[var(--text-secondary)] leading-7">
                      <ReactMarkdown
                        components={{
                          h1: ({ children }) => (
                            <h1 className="text-xl font-bold text-[var(--text-primary)] mt-5 mb-2 first:mt-0">{children}</h1>
                          ),
                          h2: ({ children }) => (
                            <h2 className="text-lg font-semibold text-[var(--text-primary)] mt-5 mb-2 first:mt-0">{children}</h2>
                          ),
                          h3: ({ children }) => (
                            <h3 className="text-base font-semibold text-[var(--text-primary)] mt-4 mb-1.5">{children}</h3>
                          ),
                          h4: ({ children }) => (
                            <h4 className="text-sm font-semibold text-[var(--text-primary)] mt-3 mb-1">{children}</h4>
                          ),
                          p: ({ children }) => (
                            <p className="mb-3 leading-7">{children}</p>
                          ),
                          strong: ({ children }) => (
                            <strong className="font-semibold text-[var(--text-primary)]">{children}</strong>
                          ),
                          em: ({ children }) => (
                            <em className="italic text-[var(--text-secondary)]">{children}</em>
                          ),
                          ul: ({ children }) => (
                            <ul className="list-disc pl-5 mb-3 flex flex-col gap-1">{children}</ul>
                          ),
                          ol: ({ children }) => (
                            <ol className="list-decimal pl-5 mb-3 flex flex-col gap-1">{children}</ol>
                          ),
                          li: ({ children }) => (
                            <li className="leading-relaxed">{children}</li>
                          ),
                          blockquote: ({ children }) => (
                            <blockquote className="border-l-2 border-[#F59E0B] pl-4 my-3 italic text-[var(--text-muted)]">{children}</blockquote>
                          ),
                          code: ({ children }) => (
                            <code className="px-1.5 py-0.5 rounded bg-[var(--bg-muted)] text-[var(--text-primary)] text-xs font-mono">{children}</code>
                          ),
                          hr: () => (
                            <hr className="border-[var(--border)] my-4" />
                          ),
                        }}
                      >
                        {result.generated_script}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-xs text-[var(--text-muted)]">
                        No script was generated
                      </p>
                    </div>
                  )}
                </div>

                {/* Quality bar */}
                {result.quality && (
                  <div className="px-4 py-3 border-t border-[var(--border)] flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <Activity size={12} className="text-[var(--text-muted)]" />
                      <span className="text-[11px] text-[var(--text-muted)]">
                        Quality
                      </span>
                    </div>
                    <div className="flex-1 min-w-20 progress-bar">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${Math.min(result.quality.overall_score, 100)}%`,
                          background:
                            result.quality.overall_score >= 80
                              ? "linear-gradient(90deg,#34D399,#6EE7B7)"
                              : result.quality.overall_score >= 60
                                ? "linear-gradient(90deg,#F59E0B,#FCD34D)"
                                : "linear-gradient(90deg,#F87171,#FCA5A5)",
                        }}
                      />
                    </div>
                    <span
                      className={`text-xs font-medium ${
                        result.quality.overall_score >= 80
                          ? "text-[#34D399]"
                          : result.quality.overall_score >= 60
                            ? "text-[#FCD34D]"
                            : "text-[#F87171]"
                      }`}
                    >
                      {result.quality.overall_score.toFixed(1)}
                    </span>

                    {result.quality.estimated_duration_minutes > 0 && (
                      <>
                        <div className="flex items-center gap-1.5 ml-2">
                          <Clock size={12} className="text-[var(--text-muted)]" />
                          <span className="text-[11px] text-[var(--text-muted)]">
                            Est.
                          </span>
                        </div>
                        <span className="text-xs text-[var(--text-secondary)]">
                          {result.quality.estimated_duration_minutes.toFixed(1)}{" "}
                          min
                        </span>
                      </>
                    )}

                    <Badge
                      variant="default"
                      className="text-[10px] ml-auto"
                    >
                      {result.total_duration_seconds.toFixed(1)}s pipeline
                    </Badge>
                  </div>
                )}
              </Card>

              {/* ── Detail tabs ────────────────────────── */}
              <div className="flex items-center gap-1 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-1">
                {(
                  [
                    { key: "quality", label: "Quality Details" },
                    { key: "analysis", label: "Semantic Analysis" },
                    { key: "pipeline", label: "Pipeline" },
                  ] as const
                ).map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setOutputTab(key)}
                    className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all ${
                      outputTab === key
                        ? "bg-[rgba(245,158,11,0.1)] text-[#FCD34D] border border-[rgba(245,158,11,0.25)]"
                        : "text-[var(--text-muted)] hover:text-[var(--text-secondary)] border border-transparent"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* ─── Quality Details tab ───────────────── */}
              {outputTab === "quality" && (
                <Card padding="md" className="animate-fade-in">
                  <CardHeader>
                    <CardTitle>Quality Report</CardTitle>
                  </CardHeader>

                  {result.quality ? (
                    <>
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] text-center">
                          <p className="text-lg font-bold text-[var(--text-primary)]">
                            {result.quality.overall_score.toFixed(1)}
                          </p>
                          <p className="text-[10px] text-[var(--text-muted)]">
                            Overall Score
                          </p>
                        </div>
                        <div className="p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] text-center">
                          <p className="text-lg font-bold text-[var(--text-primary)]">
                            {result.quality.word_count.toLocaleString()}
                          </p>
                          <p className="text-[10px] text-[var(--text-muted)]">
                            Words
                          </p>
                        </div>
                        <div className="p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] text-center">
                          <p className="text-lg font-bold text-[var(--text-primary)]">
                            {result.quality.estimated_duration_minutes.toFixed(
                              1
                            )}
                          </p>
                          <p className="text-[10px] text-[var(--text-muted)]">
                            Est. Minutes
                          </p>
                        </div>
                      </div>

                      {result.quality.issues.length > 0 ? (
                        <div>
                          <p className="text-xs text-[var(--text-muted)] mb-2">
                            Issues
                          </p>
                          <ul className="flex flex-col gap-1">
                            {result.quality.issues.map((issue, i) => (
                              <li
                                key={i}
                                className="flex items-start gap-1.5 text-xs text-[var(--text-secondary)]"
                              >
                                <AlertTriangle
                                  size={11}
                                  className="text-[#FBBF24] mt-0.5 flex-shrink-0"
                                />
                                {issue}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs text-[#34D399]">
                          <CheckCircle2 size={12} /> No issues detected
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-[var(--text-muted)] text-center py-4">
                      No quality data available
                    </p>
                  )}
                </Card>
              )}

              {/* ─── Semantic Analysis tab ─────────────── */}
              {outputTab === "analysis" && (
                <Card padding="md" className="animate-fade-in">
                  <CardHeader>
                    <CardTitle>Semantic Analysis</CardTitle>
                  </CardHeader>

                  {result.semantic_summary ? (
                    <>
                      {/* Message essence */}
                      {result.semantic_summary.message_essence && (
                        <div className="mb-4 p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)]">
                          <p className="text-[10px] text-[var(--text-muted)] mb-1">
                            Message Essence
                          </p>
                          <p className="text-xs text-[var(--text-secondary)] italic leading-relaxed">
                            &ldquo;{result.semantic_summary.message_essence}
                            &rdquo;
                          </p>
                        </div>
                      )}

                      {/* Topics & entities */}
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div>
                          <p className="text-[10px] text-[var(--text-muted)] mb-1.5">
                            Key Topics
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {result.semantic_summary.key_topics.length > 0 ? (
                              result.semantic_summary.key_topics.map(
                                (t, i) => (
                                  <Badge
                                    key={i}
                                    variant="forge"
                                    className="text-[10px]"
                                  >
                                    {t}
                                  </Badge>
                                )
                              )
                            ) : (
                              <span className="text-[10px] text-[var(--text-muted)]">
                                —
                              </span>
                            )}
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] text-[var(--text-muted)] mb-1.5">
                            Key Entities
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {result.semantic_summary.key_entities.length >
                            0 ? (
                              result.semantic_summary.key_entities.map(
                                (e, i) => (
                                  <Badge
                                    key={i}
                                    variant="default"
                                    className="text-[10px]"
                                  >
                                    {e}
                                  </Badge>
                                )
                              )
                            ) : (
                              <span className="text-[10px] text-[var(--text-muted)]">
                                —
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Sentiment · Intent · Emotion */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        {result.semantic_summary.sentiment && (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--bg-surface)] border border-[var(--border)]">
                            <span className="text-[10px] text-[var(--text-muted)]">
                              Sentiment
                            </span>
                            <span className="text-[10px] font-medium text-[var(--text-primary)] capitalize">
                              {result.semantic_summary.sentiment}
                            </span>
                          </div>
                        )}
                        {result.semantic_summary.intent && (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--bg-surface)] border border-[var(--border)]">
                            <span className="text-[10px] text-[var(--text-muted)]">
                              Intent
                            </span>
                            <span className="text-[10px] font-medium text-[var(--text-primary)] capitalize">
                              {result.semantic_summary.intent}
                            </span>
                          </div>
                        )}
                        {result.semantic_summary.dominant_emotion && (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--bg-surface)] border border-[var(--border)]">
                            <span className="text-[10px] text-[var(--text-muted)]">
                              Emotion
                            </span>
                            <span className="text-[10px] font-medium text-[var(--text-primary)] capitalize">
                              {result.semantic_summary.dominant_emotion}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Tone profile */}
                      <div>
                        <p className="text-[10px] text-[var(--text-muted)] mb-2">
                          Tone Profile
                        </p>
                        <div className="flex flex-col gap-2">
                          {(
                            [
                              {
                                label: "Formality",
                                value:
                                  result.semantic_summary.tone_formality,
                              },
                              {
                                label: "Energy",
                                value: result.semantic_summary.tone_energy,
                              },
                              {
                                label: "Warmth",
                                value: result.semantic_summary.tone_warmth,
                              },
                              {
                                label: "Humor",
                                value: result.semantic_summary.tone_humor,
                              },
                              {
                                label: "Authority",
                                value:
                                  result.semantic_summary.tone_authority,
                              },
                            ] as { label: string; value: number | null }[]
                          )
                            .filter((t) => t.value != null)
                            .map(({ label, value }) => (
                              <div
                                key={label}
                                className="flex items-center gap-2"
                              >
                                <span className="text-[10px] text-[var(--text-secondary)] w-16 text-right">
                                  {label}
                                </span>
                                <div className="flex-1 progress-bar">
                                  <div
                                    className="progress-fill"
                                    style={{
                                      width: `${Math.round(value! * 100)}%`,
                                      background:
                                        "linear-gradient(90deg,#F59E0B,#FCD34D)",
                                    }}
                                  />
                                </div>
                                <span className="text-[10px] text-[var(--text-muted)] w-8">
                                  {Math.round(value! * 100)}%
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-[var(--text-muted)] text-center py-4">
                      No semantic analysis available
                    </p>
                  )}
                </Card>
              )}

              {/* ─── Pipeline tab ──────────────────────── */}
              {outputTab === "pipeline" && (
                <Card padding="md" className="animate-fade-in">
                  <CardHeader>
                    <CardTitle>Pipeline Stages</CardTitle>
                  </CardHeader>

                  {/* Stages list */}
                  <div className="flex flex-col gap-2 mb-4">
                    {result.stages.map((stage, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)]"
                      >
                        {stage.success ? (
                          <CheckCircle2
                            size={14}
                            className="text-[#34D399] flex-shrink-0"
                          />
                        ) : (
                          <AlertCircle
                            size={14}
                            className="text-[#F87171] flex-shrink-0"
                          />
                        )}
                        <span className="text-xs font-medium text-[var(--text-primary)] capitalize flex-1">
                          {stage.stage.replace(/_/g, " ")}
                        </span>
                        {stage.warnings.length > 0 && (
                          <Badge variant="warning" className="text-[10px]">
                            {stage.warnings.length} warning
                            {stage.warnings.length > 1 ? "s" : ""}
                          </Badge>
                        )}
                        <span className="text-[10px] text-[var(--text-muted)] tabular-nums">
                          {stage.duration_seconds.toFixed(2)}s
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Stage errors / warnings detail */}
                  {result.stages.some(
                    (s) => s.error || s.warnings.length > 0
                  ) && (
                    <div className="mb-4 flex flex-col gap-1">
                      {result.stages
                        .filter((s) => s.error)
                        .map((s, i) => (
                          <div
                            key={`err-${i}`}
                            className="flex items-start gap-1.5 text-xs text-[#F87171]"
                          >
                            <AlertCircle
                              size={11}
                              className="mt-0.5 flex-shrink-0"
                            />
                            <span>
                              <strong className="capitalize">
                                {s.stage}:
                              </strong>{" "}
                              {s.error}
                            </span>
                          </div>
                        ))}
                      {result.stages
                        .filter((s) => s.warnings.length > 0)
                        .flatMap((s, si) =>
                          s.warnings.map((w, wi) => (
                            <div
                              key={`warn-${si}-${wi}`}
                              className="flex items-start gap-1.5 text-xs text-[#FBBF24]"
                            >
                              <AlertTriangle
                                size={11}
                                className="mt-0.5 flex-shrink-0"
                              />
                              <span>
                                <strong className="capitalize">
                                  {s.stage}:
                                </strong>{" "}
                                {w}
                              </span>
                            </div>
                          ))
                        )}
                    </div>
                  )}

                  {/* Generation metadata */}
                  <CardHeader className="mt-2">
                    <CardTitle>Generation Metadata</CardTitle>
                  </CardHeader>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      {
                        label: "Provider",
                        value: String(
                          result.generation_metadata
                            ?.generation_provider ?? "—"
                        ),
                      },
                      {
                        label: "Model",
                        value: String(
                          result.generation_metadata?.generation_model ??
                            "—"
                        ),
                      },
                      {
                        label: "Prompt tokens",
                        value:
                          result.generation_metadata?.prompt_tokens != null
                            ? Number(
                                result.generation_metadata.prompt_tokens
                              ).toLocaleString()
                            : "—",
                      },
                      {
                        label: "Completion tokens",
                        value:
                          result.generation_metadata?.completion_tokens !=
                          null
                            ? Number(
                                result.generation_metadata.completion_tokens
                              ).toLocaleString()
                            : "—",
                      },
                      {
                        label: "Total tokens",
                        value:
                          result.generation_metadata?.generation_tokens !=
                          null
                            ? Number(
                                result.generation_metadata.generation_tokens
                              ).toLocaleString()
                            : "—",
                      },
                      {
                        label: "Generation time",
                        value:
                          result.generation_metadata
                            ?.generation_time_seconds != null
                            ? `${Number(result.generation_metadata.generation_time_seconds).toFixed(1)}s`
                            : "—",
                      },
                      {
                        label: "Finish reason",
                        value: String(
                          result.generation_metadata?.finish_reason ?? "—"
                        ),
                      },
                      {
                        label: "Total pipeline",
                        value: `${result.total_duration_seconds.toFixed(1)}s`,
                      },
                    ].map(({ label, value }) => (
                      <div
                        key={label}
                        className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-[var(--bg-surface)] border border-[var(--border)]"
                      >
                        <span className="text-[10px] text-[var(--text-muted)]">
                          {label}
                        </span>
                        <span className="text-[10px] font-medium text-[var(--text-secondary)]">
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Regeneration info */}
                  {result.generation_metadata?.regeneration && (
                    <div className="mt-3 p-2.5 rounded-lg bg-[rgba(245,158,11,0.05)] border border-[rgba(245,158,11,0.15)]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="forge" className="text-[10px]">
                          {result.generation_metadata.regeneration_type ===
                          "feedback_revision"
                            ? "Feedback revision"
                            : "Fresh take"}
                        </Badge>
                        {result.generation_metadata.parent_content_id && (
                          <span className="text-[10px] text-[var(--text-muted)]">
                            Parent:{" "}
                            {String(
                              result.generation_metadata.parent_content_id
                            ).slice(0, 8)}
                            …
                          </span>
                        )}
                      </div>
                      {result.generation_metadata.feedback_text && (
                        <p className="text-[10px] text-[var(--text-secondary)] mt-1.5 italic">
                          &ldquo;
                          {String(
                            result.generation_metadata.feedback_text
                          )}
                          &rdquo;
                        </p>
                      )}
                    </div>
                  )}
                </Card>
              )}

              {/* ── Regenerate card ────────────────────── */}
              <Card padding="md">
                <CardHeader>
                  <CardTitle>Regenerate</CardTitle>
                  <Badge variant="default" className="text-[10px]">
                    ID: {result.content_id.slice(0, 8)}
                  </Badge>
                </CardHeader>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="input-base resize-none text-sm mb-3"
                  rows={2}
                  placeholder="Optional feedback: 'add more detail about X', 'make it more formal', 'remove the intro'…"
                  maxLength={5000}
                />
                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    className="flex-1 bg-[#F59E0B] hover:bg-[#FCD34D] text-black"
                    icon={<RefreshCw size={12} />}
                    loading={regenerating}
                    onClick={() => handleRegenerate(true)}
                    disabled={!feedback.trim() || regenerating}
                  >
                    Revise with feedback
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                    icon={<Sparkles size={12} />}
                    loading={regenerating}
                    onClick={() => handleRegenerate(false)}
                    disabled={regenerating}
                  >
                    Fresh take
                  </Button>
                </div>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
