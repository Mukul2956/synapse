"use client";

import {
  ScrollText,
  RefreshCw,
  Download,
  Copy,
  Check,
  Activity,
  Clock,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { type TransformResponse, OUTPUT_FORMATS } from "@/lib/forge-api";
import { FORMAT_ICONS } from "./constants";

interface ScriptViewerProps {
  result: TransformResponse;
  copied: boolean;
  regenerating: boolean;
  onCopy: () => void;
  onExport: () => void;
  onRegenerate: () => void;
}

export default function ScriptViewer({
  result,
  copied,
  regenerating,
  onCopy,
  onExport,
  onRegenerate,
}: ScriptViewerProps) {
  const formatLabel =
    OUTPUT_FORMATS.find((f) => f.value === result.output_format)?.label ||
    result.output_format;

  return (
    <Card padding="none">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)] flex-wrap">
        <div className="flex items-center gap-1.5">
          {(() => {
            const Ic = FORMAT_ICONS[result.output_format] || ScrollText;
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
            onClick={onRegenerate}
            loading={regenerating}
          >
            Regenerate
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={copied ? <Check size={12} /> : <Copy size={12} />}
            onClick={onCopy}
          >
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={<Download size={12} />}
            onClick={onExport}
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
                  <h1 className="text-xl font-bold text-[var(--text-primary)] mt-5 mb-2 first:mt-0">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-lg font-semibold text-[var(--text-primary)] mt-5 mb-2 first:mt-0">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-base font-semibold text-[var(--text-primary)] mt-4 mb-1.5">
                    {children}
                  </h3>
                ),
                h4: ({ children }) => (
                  <h4 className="text-sm font-semibold text-[var(--text-primary)] mt-3 mb-1">
                    {children}
                  </h4>
                ),
                p: ({ children }) => (
                  <p className="mb-3 leading-7">{children}</p>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold text-[var(--text-primary)]">
                    {children}
                  </strong>
                ),
                em: ({ children }) => (
                  <em className="italic text-[var(--text-secondary)]">
                    {children}
                  </em>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc pl-5 mb-3 flex flex-col gap-1">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal pl-5 mb-3 flex flex-col gap-1">
                    {children}
                  </ol>
                ),
                li: ({ children }) => (
                  <li className="leading-relaxed">{children}</li>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-2 border-[#F59E0B] pl-4 my-3 italic text-[var(--text-muted)]">
                    {children}
                  </blockquote>
                ),
                code: ({ children }) => (
                  <code className="px-1.5 py-0.5 rounded bg-[var(--bg-muted)] text-[var(--text-primary)] text-xs font-mono">
                    {children}
                  </code>
                ),
                hr: () => <hr className="border-[var(--border)] my-4" />,
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
                {result.quality.estimated_duration_minutes.toFixed(1)} min
              </span>
            </>
          )}

          <Badge variant="default" className="text-[10px] ml-auto">
            {result.total_duration_seconds.toFixed(1)}s pipeline
          </Badge>
        </div>
      )}
    </Card>
  );
}
