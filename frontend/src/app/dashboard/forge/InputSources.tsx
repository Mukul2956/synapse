"use client";

import { useState, useRef, useCallback } from "react";
import {
  FileText,
  Upload,
  Link2,
  X,
  Plus,
} from "lucide-react";
import Card, { CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import {
  getFileIcon,
  formatBytes,
  MAX_FILE_SIZE,
  ACCEPTED_TYPES,
} from "./constants";

interface InputSourcesProps {
  textInput: string;
  onTextChange: (v: string) => void;
  files: File[];
  onFilesChange: (files: File[]) => void;
  urls: string[];
  onUrlsChange: (urls: string[]) => void;
}

export default function InputSources({
  textInput,
  onTextChange,
  files,
  onFilesChange,
  urls,
  onUrlsChange,
}: InputSourcesProps) {
  const [urlInput, setUrlInput] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── File validation ───────────────────────────────── */
  const validateAndAddFiles = useCallback(
    (incoming: File[]) => {
      setFileError(null);
      const rejected: string[] = [];
      const accepted: File[] = [];
      for (const f of incoming) {
        if (f.size > MAX_FILE_SIZE) {
          rejected.push(
            `${f.name} (${formatBytes(f.size)} exceeds 50 MB limit)`
          );
        } else {
          accepted.push(f);
        }
      }
      if (rejected.length > 0) {
        setFileError(`Rejected: ${rejected.join(", ")}`);
      }
      if (accepted.length > 0) {
        onFilesChange([...files, ...accepted]);
      }
    },
    [files, onFilesChange]
  );

  /* ── Drag-and-drop ─────────────────────────────────── */
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      validateAndAddFiles(Array.from(e.dataTransfer.files));
    },
    [validateAndAddFiles]
  );
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);
  const handleDragLeave = useCallback(() => setDragOver(false), []);

  const removeFile = (i: number) =>
    onFilesChange(files.filter((_, idx) => idx !== i));

  /* ── URL helpers ───────────────────────────────────── */
  const addUrl = () => {
    const trimmed = urlInput.trim();
    if (
      trimmed &&
      (trimmed.startsWith("http://") || trimmed.startsWith("https://")) &&
      urls.length < 10
    ) {
      onUrlsChange([...urls, trimmed]);
      setUrlInput("");
    }
  };
  const removeUrl = (i: number) =>
    onUrlsChange(urls.filter((_, idx) => idx !== i));

  return (
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
          onChange={(e) => onTextChange(e.target.value)}
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
        {/* Hidden file input — kept outside drop zone to avoid event issues */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED_TYPES}
          className="hidden"
          onChange={(e) => {
            if (e.target.files) {
              validateAndAddFiles(Array.from(e.target.files));
            }
            e.target.value = "";
          }}
        />
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
            Images, video, audio, text, PDF — max 50 MB per file
          </p>
        </div>
        {fileError && (
          <p className="text-[10px] text-[#F87171] mt-1.5">{fileError}</p>
        )}
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
          <p className="text-[10px] text-[#FBBF24] mt-1">Maximum 10 URLs</p>
        )}
      </div>
    </Card>
  );
}
