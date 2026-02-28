"use client";

import { RefreshCw, Sparkles } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Card, { CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";

interface RegenerateCardProps {
  contentId: string;
  feedback: string;
  onFeedbackChange: (v: string) => void;
  regenerating: boolean;
  onRegenerate: (withFeedback: boolean) => void;
}

export default function RegenerateCard({
  contentId,
  feedback,
  onFeedbackChange,
  regenerating,
  onRegenerate,
}: RegenerateCardProps) {
  return (
    <Card padding="md">
      <CardHeader>
        <CardTitle>Regenerate</CardTitle>
        <Badge variant="default" className="text-[10px]">
          ID: {contentId.slice(0, 8)}
        </Badge>
      </CardHeader>
      <textarea
        value={feedback}
        onChange={(e) => onFeedbackChange(e.target.value)}
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
          onClick={() => onRegenerate(true)}
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
          onClick={() => onRegenerate(false)}
          disabled={regenerating}
        >
          Fresh take
        </Button>
      </div>
    </Card>
  );
}
