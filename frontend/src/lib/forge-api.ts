/**
 * Forge API client — TypeScript types and fetch functions
 * matching the backend schemas exactly.
 */

// ── Response Types ──────────────────────────────────────

export interface StageInfo {
  stage: string;
  success: boolean;
  duration_seconds: number;
  error: string | null;
  warnings: string[];
  metadata: Record<string, unknown>;
}

export interface SemanticSummary {
  message_essence: string;
  key_topics: string[];
  key_entities: string[];
  sentiment: string | null;
  intent: string | null;
  dominant_emotion: string | null;
  tone_formality: number | null;
  tone_energy: number | null;
  tone_warmth: number | null;
  tone_humor: number | null;
  tone_authority: number | null;
}

export interface QualitySummary {
  overall_score: number;
  word_count: number;
  estimated_duration_minutes: number;
  issues: string[];
  passed: boolean;
}

export interface TransformResponse {
  content_id: string;
  success: boolean;
  generated_script: string | null;
  output_format: string;
  semantic_summary: SemanticSummary | null;
  quality: QualitySummary | null;
  stages: StageInfo[];
  total_duration_seconds: number;
  generation_metadata: Record<string, any>;
  error: string | null;
}

export interface RegenerateResponse {
  content_id: string;
  success: boolean;
  generated_script: string | null;
  output_format: string;
  quality: QualitySummary | null;
  stages: StageInfo[];
  total_duration_seconds: number;
  generation_metadata: Record<string, any>;
  regeneration_type: string;
  error: string | null;
}

export interface ProviderInfo {
  name: string;
  healthy: boolean;
  model: string | null;
  error: string | null;
}

export interface ProvidersResponse {
  default_provider: string;
  providers: ProviderInfo[];
}

export interface HealthResponse {
  status: string;
  providers: Record<string, boolean>;
}

// ── API Base ────────────────────────────────────────────
// The Forge backend is proxied through Next.js rewrites at /api/forge/*
// which maps to FORGE_BACKEND_URL/api/v1/* on the server side.
// If NEXT_PUBLIC_FORGE_API_URL is set (e.g. for direct access), use that.

declare const process: { env: Record<string, string | undefined> };

const API_BASE: string =
  process.env.NEXT_PUBLIC_FORGE_API_URL || "/api/forge";

// ── Safe JSON helper ────────────────────────────────────

async function safeJson<T>(res: Response, fallbackMsg: string): Promise<T> {
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    // The proxy may return raw text ("Internal Server Error") on timeout
    throw new Error(
      res.ok ? fallbackMsg : `${res.status}: ${text.slice(0, 200) || fallbackMsg}`
    );
  }
}

// ── Fetch helpers ───────────────────────────────────────

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error("Health check failed");
  return safeJson<HealthResponse>(res, "Health check returned invalid data");
}

export async function fetchProviders(): Promise<ProvidersResponse> {
  const res = await fetch(`${API_BASE}/providers`);
  if (!res.ok) throw new Error("Failed to fetch providers");
  return safeJson<ProvidersResponse>(res, "Providers returned invalid data");
}

export async function transformContent(params: {
  files?: File[];
  textInput?: string;
  urls?: string[];
  outputFormat?: string;
  outputDescription?: string;
  durationSeconds?: number;
  additionalInstructions?: string;
  preferredProvider?: string;
}): Promise<TransformResponse> {
  const formData = new FormData();

  if (params.files) {
    params.files.forEach((file) => formData.append("files", file));
  }
  if (params.textInput) {
    formData.append("text_input", params.textInput);
  }
  if (params.urls && params.urls.length > 0) {
    formData.append("urls", JSON.stringify(params.urls));
  }
  if (params.outputFormat) {
    formData.append("output_format", params.outputFormat);
  }
  if (params.outputDescription) {
    formData.append("output_description", params.outputDescription);
  }
  if (params.durationSeconds != null) {
    formData.append("duration_seconds", params.durationSeconds.toString());
  }
  if (params.additionalInstructions) {
    formData.append("additional_instructions", params.additionalInstructions);
  }
  if (params.preferredProvider) {
    formData.append("preferred_provider", params.preferredProvider);
  }

  const res = await fetch(`${API_BASE}/transform`, {
    method: "POST",
    body: formData,
  });

  const data = await safeJson<TransformResponse & { detail?: string }>(
    res,
    "Transform request failed"
  );
  if (!res.ok) throw new Error(data.detail || "Transform request failed");
  return data;
}

export async function regenerateContent(params: {
  contentId: string;
  feedback?: string;
  preferredProvider?: string;
}): Promise<RegenerateResponse> {
  const formData = new FormData();
  formData.append("content_id", params.contentId);

  if (params.feedback) {
    formData.append("feedback", params.feedback);
  }
  if (params.preferredProvider) {
    formData.append("preferred_provider", params.preferredProvider);
  }

  const res = await fetch(`${API_BASE}/regenerate`, {
    method: "POST",
    body: formData,
  });

  const data = await safeJson<RegenerateResponse & { detail?: string }>(
    res,
    "Regeneration request failed"
  );
  if (!res.ok) throw new Error(data.detail || "Regeneration request failed");
  return data;
}

// ── Constants matching backend enums ────────────────────

export const OUTPUT_FORMATS = [
  { value: "podcast_script",     label: "Podcast Script" },
  { value: "video_script",       label: "Video Script" },
  { value: "blog_post",          label: "Blog Post" },
  { value: "twitter_thread",     label: "Twitter Thread" },
  { value: "instagram_carousel", label: "Instagram Carousel" },
  { value: "linkedin_article",   label: "LinkedIn Article" },
  { value: "youtube_script",     label: "YouTube Script" },
  { value: "newsletter",         label: "Newsletter" },
  { value: "short_form_script",  label: "Short-Form Script" },
  { value: "presentation",       label: "Presentation" },
  { value: "generic_script",     label: "Generic Script" },
] as const;

export const LLM_PROVIDERS = ["ollama", "openai", "anthropic", "gemini"] as const;