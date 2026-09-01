"use client";

import { useRef, useState } from "react";

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
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
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
    <div className="rounded-[var(--radius-card)] bg-surface border border-hairline shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-4 flex flex-col gap-3">
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
        className="w-full bg-transparent text-[13px] font-mono leading-relaxed resize-y outline-none placeholder:text-text-secondary/60"
      />
      {error && <p className="text-[12px] text-red-600">{error}</p>}
    </div>
  );
}
