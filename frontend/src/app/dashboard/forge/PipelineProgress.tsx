"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import Card from "@/components/ui/Card";
import { PIPELINE_STAGES } from "./constants";

interface PipelineProgressProps {
  stage: number;
}

export default function PipelineProgress({ stage }: PipelineProgressProps) {
  return (
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
              width: `${((stage + 1) / PIPELINE_STAGES.length) * 100}%`,
              background: "linear-gradient(90deg, #F59E0B, #FCD34D)",
            }}
          />
        </div>
        <p className="text-center text-[10px] text-[var(--text-muted)] mt-2">
          Stage {stage + 1} of {PIPELINE_STAGES.length}
        </p>
      </div>

      {/* Stage steps */}
      <div className="flex flex-col gap-2 max-w-xs mx-auto">
        {PIPELINE_STAGES.map((s, i) => {
          const isActive = i === stage;
          const isDone = i < stage;
          return (
            <div
              key={s.key}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300 ${
                isActive
                  ? "bg-[rgba(245,158,11,0.08)] border border-[rgba(245,158,11,0.25)]"
                  : isDone
                    ? "opacity-60"
                    : "opacity-30"
              }`}
            >
              {isDone ? (
                <CheckCircle2
                  size={14}
                  className="text-[#34D399] flex-shrink-0"
                />
              ) : isActive ? (
                <Loader2
                  size={14}
                  className="text-[#F59E0B] animate-spin flex-shrink-0"
                />
              ) : (
                <div className="w-3.5 h-3.5 rounded-full border border-[var(--border)] flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p
                  className={`text-xs font-medium ${
                    isActive
                      ? "text-[#FCD34D]"
                      : isDone
                        ? "text-[var(--text-secondary)]"
                        : "text-[var(--text-muted)]"
                  }`}
                >
                  {s.label}
                </p>
                {isActive && (
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5 truncate">
                    {s.desc}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
