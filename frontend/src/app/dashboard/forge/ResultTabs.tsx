"use client";

import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import Card, { CardHeader, CardTitle } from "@/components/ui/Card";
import { type TransformResponse } from "@/lib/forge-api";
import { type OutputTab } from "./constants";

interface ResultTabsProps {
  result: TransformResponse;
  activeTab: OutputTab;
  onTabChange: (tab: OutputTab) => void;
}

export default function ResultTabs({
  result,
  activeTab,
  onTabChange,
}: ResultTabsProps) {
  return (
    <>
      {/* Tab bar */}
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
            onClick={() => onTabChange(key)}
            className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === key
                ? "bg-[rgba(245,158,11,0.1)] text-[#FCD34D] border border-[rgba(245,158,11,0.25)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-secondary)] border border-transparent"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ─── Quality Details tab ───────────────── */}
      {activeTab === "quality" && (
        <Card padding="md" className="animate-fade-in">
          <CardHeader>
            <CardTitle>Quality Report</CardTitle>
          </CardHeader>

          {result.quality ? (
            <>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { label: "Overall Score", value: result.quality.overall_score.toFixed(1) },
                  { label: "Words", value: result.quality.word_count.toLocaleString() },
                  { label: "Est. Minutes", value: result.quality.estimated_duration_minutes.toFixed(1) },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] text-center"
                  >
                    <p className="text-lg font-bold text-[var(--text-primary)]">
                      {value}
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)]">
                      {label}
                    </p>
                  </div>
                ))}
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
      {activeTab === "analysis" && (
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
                    &ldquo;{result.semantic_summary.message_essence}&rdquo;
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
                      result.semantic_summary.key_topics.map((t, i) => (
                        <Badge key={i} variant="forge" className="text-[10px]">
                          {t}
                        </Badge>
                      ))
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
                    {result.semantic_summary.key_entities.length > 0 ? (
                      result.semantic_summary.key_entities.map((e, i) => (
                        <Badge
                          key={i}
                          variant="default"
                          className="text-[10px]"
                        >
                          {e}
                        </Badge>
                      ))
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
                      { label: "Formality", value: result.semantic_summary.tone_formality },
                      { label: "Energy", value: result.semantic_summary.tone_energy },
                      { label: "Warmth", value: result.semantic_summary.tone_warmth },
                      { label: "Humor", value: result.semantic_summary.tone_humor },
                      { label: "Authority", value: result.semantic_summary.tone_authority },
                    ] as { label: string; value: number | null }[]
                  )
                    .filter((t) => t.value != null)
                    .map(({ label, value }) => (
                      <div key={label} className="flex items-center gap-2">
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
      {activeTab === "pipeline" && (
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
          {result.stages.some((s) => s.error || s.warnings.length > 0) && (
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
                      <strong className="capitalize">{s.stage}:</strong>{" "}
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
                        <strong className="capitalize">{s.stage}:</strong>{" "}
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
                  result.generation_metadata?.generation_provider ?? "—"
                ),
              },
              {
                label: "Model",
                value: String(
                  result.generation_metadata?.generation_model ?? "—"
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
                  result.generation_metadata?.completion_tokens != null
                    ? Number(
                        result.generation_metadata.completion_tokens
                      ).toLocaleString()
                    : "—",
              },
              {
                label: "Total tokens",
                value:
                  result.generation_metadata?.generation_tokens != null
                    ? Number(
                        result.generation_metadata.generation_tokens
                      ).toLocaleString()
                    : "—",
              },
              {
                label: "Generation time",
                value:
                  result.generation_metadata?.generation_time_seconds != null
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
                  {String(result.generation_metadata.feedback_text)}
                  &rdquo;
                </p>
              )}
            </div>
          )}
        </Card>
      )}
    </>
  );
}
