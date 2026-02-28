"use client";

import { useState, useRef, useEffect } from "react";
import {
  Hammer,
  AlertCircle,
  Sparkles,
  X,
} from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import {
  type TransformResponse,
  type ProvidersResponse,
  transformContent,
  regenerateContent,
  fetchProviders,
} from "@/lib/forge-api";

import { type OutputTab, PIPELINE_STAGES } from "./constants";
import InputSources from "./InputSources";
import OutputFormatGrid from "./OutputFormatGrid";
import ConfigPanel from "./ConfigPanel";
import PipelineProgress from "./PipelineProgress";
import ScriptViewer from "./ScriptViewer";
import ResultTabs from "./ResultTabs";
import RegenerateCard from "./RegenerateCard";

/* ================================================================
   FORGE PAGE — Slim orchestrator
   ================================================================ */
export default function ForgePage() {
  /* ── Input state ───────────────────────────────────── */
  const [textInput, setTextInput] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [urls, setUrls] = useState<string[]>([]);

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
  const [pipelineStage, setPipelineStage] = useState(0);
  const stageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Fetch providers on mount ──────────────────────── */
  useEffect(() => {
    fetchProviders()
      .then(setProviders)
      .catch(() => {
        /* backend might not be running */
      });
  }, []);

  /* ── Derived ───────────────────────────────────────── */
  const hasInput = textInput.trim() || files.length > 0 || urls.length > 0;

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
        stageTimerRef.current = setTimeout(
          advanceStage,
          PIPELINE_STAGES[stageIdx].delay
        );
      }
    };
    stageTimerRef.current = setTimeout(
      advanceStage,
      PIPELINE_STAGES[0].delay
    );

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
          <InputSources
            textInput={textInput}
            onTextChange={setTextInput}
            files={files}
            onFilesChange={setFiles}
            urls={urls}
            onUrlsChange={setUrls}
          />

          <OutputFormatGrid
            selected={outputFormat}
            onSelect={setOutputFormat}
          />

          <ConfigPanel
            outputDescription={outputDescription}
            onOutputDescriptionChange={setOutputDescription}
            durationSeconds={durationSeconds}
            onDurationSecondsChange={setDurationSeconds}
            additionalInstructions={additionalInstructions}
            onAdditionalInstructionsChange={setAdditionalInstructions}
            preferredProvider={preferredProvider}
            onPreferredProviderChange={setPreferredProvider}
            providers={providers}
          />

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
                and hit{" "}
                <strong className="text-[#FCD34D]">Transform</strong>. Forge
                will analyze your content and generate a complete script.
              </p>
            </Card>
          )}

          {/* ── Loading state ──────────────────────────── */}
          {loading && !result && (
            <PipelineProgress stage={pipelineStage} />
          )}

          {/* ── Results ────────────────────────────────── */}
          {result && (
            <>
              <ScriptViewer
                result={result}
                copied={copied}
                regenerating={regenerating}
                onCopy={handleCopy}
                onExport={handleExport}
                onRegenerate={() => handleRegenerate(false)}
              />

              <ResultTabs
                result={result}
                activeTab={outputTab}
                onTabChange={setOutputTab}
              />

              <RegenerateCard
                contentId={result.content_id}
                feedback={feedback}
                onFeedbackChange={setFeedback}
                regenerating={regenerating}
                onRegenerate={handleRegenerate}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
