import {
  FileText,
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
} from "lucide-react";

/* ── Icon map for output formats ─────────────────────── */
export const FORMAT_ICONS: Record<string, typeof FileText> = {
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

export function getFileIcon(file: File) {
  const type = file.type.split("/")[0];
  return FILE_TYPE_ICON[type] || FileText;
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  if (bytes >= 1_024) return `${(bytes / 1_024).toFixed(1)} KB`;
  return `${bytes} B`;
}

export const MAX_FILE_SIZE = 50 * 1_048_576; // 50 MB

/* Use file extensions for reliable browser matching + MIME fallbacks */
export const ACCEPTED_TYPES = [
  ".jpg",".jpeg",".png",".webp",".gif",".bmp",".tiff",".tif",
  ".mp4",".mpeg",".avi",".webm",".mov",".mkv",
  ".mp3",".wav",".ogg",".flac",".aac",".m4a",
  ".txt",".html",".md",".pdf",
  "image/*","video/*","audio/*",
  "text/plain","text/html","text/markdown",
  "application/pdf",
].join(",");

/* ── Tab type ────────────────────────────────────────── */
export type OutputTab = "quality" | "analysis" | "pipeline";

/* ── Pipeline stages for progress indicator ──────────── */
export const PIPELINE_STAGES = [
  { key: "ingestion",     label: "Ingestion",    desc: "Extracting content from sources…",      delay: 3000  },
  { key: "analysis",      label: "Analysis",     desc: "Analyzing semantics, tone & emotion…",  delay: 15000 },
  { key: "generation",    label: "Generation",   desc: "Generating script with LLM…",           delay: 40000 },
  { key: "quality_check", label: "Quality Check", desc: "Validating output quality…",           delay: 10000 },
] as const;
