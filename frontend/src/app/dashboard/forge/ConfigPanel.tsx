"use client";

import { ChevronDown } from "lucide-react";
import Card, { CardHeader, CardTitle } from "@/components/ui/Card";
import { type ProvidersResponse, LLM_PROVIDERS } from "@/lib/forge-api";

interface ConfigPanelProps {
  outputDescription: string;
  onOutputDescriptionChange: (v: string) => void;
  durationSeconds: string;
  onDurationSecondsChange: (v: string) => void;
  additionalInstructions: string;
  onAdditionalInstructionsChange: (v: string) => void;
  preferredProvider: string;
  onPreferredProviderChange: (v: string) => void;
  providers: ProvidersResponse | null;
}

export default function ConfigPanel({
  outputDescription,
  onOutputDescriptionChange,
  durationSeconds,
  onDurationSecondsChange,
  additionalInstructions,
  onAdditionalInstructionsChange,
  preferredProvider,
  onPreferredProviderChange,
  providers,
}: ConfigPanelProps) {
  return (
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
            onChange={(e) => onOutputDescriptionChange(e.target.value)}
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
            onChange={(e) => onDurationSecondsChange(e.target.value)}
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
            onChange={(e) => onAdditionalInstructionsChange(e.target.value)}
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
              onChange={(e) => onPreferredProviderChange(e.target.value)}
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
  );
}
