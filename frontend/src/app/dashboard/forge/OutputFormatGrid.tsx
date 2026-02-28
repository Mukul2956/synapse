"use client";

import { ScrollText } from "lucide-react";
import Card, { CardHeader, CardTitle } from "@/components/ui/Card";
import { OUTPUT_FORMATS } from "@/lib/forge-api";
import { FORMAT_ICONS } from "./constants";

interface OutputFormatGridProps {
  selected: string;
  onSelect: (format: string) => void;
}

export default function OutputFormatGrid({
  selected,
  onSelect,
}: OutputFormatGridProps) {
  return (
    <Card padding="md">
      <CardHeader>
        <CardTitle>Output Format</CardTitle>
      </CardHeader>
      <div className="grid grid-cols-3 gap-1.5">
        {OUTPUT_FORMATS.map(({ value, label }) => {
          const Icon = FORMAT_ICONS[value] || ScrollText;
          const isSelected = selected === value;
          return (
            <button
              key={value}
              onClick={() => onSelect(value)}
              className={`flex flex-col items-center gap-1 p-2.5 rounded-lg border text-center transition-all ${
                isSelected
                  ? "border-[rgba(245,158,11,0.4)] bg-[rgba(245,158,11,0.08)]"
                  : "border-[var(--border)] hover:border-[var(--border-strong)] hover:bg-white/5"
              }`}
            >
              <Icon
                size={14}
                style={{
                  color: isSelected ? "#FCD34D" : "var(--text-muted)",
                }}
              />
              <span
                className={`text-[10px] font-medium leading-tight ${isSelected ? "text-[#FCD34D]" : "text-[var(--text-secondary)]"}`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
