"use client";

import { useRef, useState } from "react";

const ACCEPTED_EXTENSIONS = [".pdf", ".docx"];

function hasAcceptedExtension(filename: string): boolean {
  const lower = filename.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export function FileTextInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (text: string) => void;
  placeholder: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dragCounter = useRef(0);

  async function handleFile(file: File) {
    if (!hasAcceptedExtension(file.name)) {
      setError("Only PDF and DOCX files are supported");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/parse-file", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to parse file");
      onChange(data.text);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse file");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div
      onDragEnter={(e) => {
        e.preventDefault();
        if (e.dataTransfer.types.includes("Files")) {
          dragCounter.current += 1;
          setIsDragging(true);
        }
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={(e) => {
        e.preventDefault();
        dragCounter.current -= 1;
        if (dragCounter.current <= 0) {
          dragCounter.current = 0;
          setIsDragging(false);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        dragCounter.current = 0;
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleFile(file);
      }}
      className={`relative rounded-[var(--radius-card)] bg-surface border p-4 flex flex-col gap-3 transition-all focus-within:ring-2 focus-within:ring-accent/50 ${
        isDragging
          ? "border-accent border-dashed border-2 bg-accent/5"
          : "border-hairline shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
      }`}
    >
      {isDragging && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[var(--radius-card)] bg-surface/90 pointer-events-none">
          <p className="text-[14px] font-medium text-accent">
            Drop to upload PDF or DOCX
          </p>
        </div>
      )}
      <div className="flex items-center justify-between">
        <label className="text-[13px] font-medium text-text-secondary">
          {label}
        </label>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="rounded-full bg-fill-secondary hover:bg-black/10 dark:hover:bg-white/15 px-3 py-1.5 text-[12px] font-medium text-accent transition disabled:opacity-50"
        >
          {uploading ? "Reading…" : "Upload PDF/DOCX"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={12}
        className="w-full bg-transparent text-[13px] font-mono leading-relaxed resize-y outline-none focus-visible:outline-none placeholder:text-text-secondary/60"
      />
      <p className="text-[11px] text-text-secondary/70">
        Drag & drop a PDF or DOCX anywhere on this card to fill it in.
      </p>
      {error && <p className="text-[12px] text-red-600">{error}</p>}
    </div>
  );
}
