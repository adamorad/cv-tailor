"use client";

import { useRef, useState } from "react";
import type { Cv } from "@/lib/schema";

export function CoverLetterPanel({
  cv,
  jobDescription,
  model,
}: {
  cv: Cv;
  jobDescription: string;
  model: string;
}) {
  const [letter, setLetter] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    const controller = new AbortController();
    abortControllerRef.current = controller;
    try {
      const res = await fetch("/api/cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cv, jobDescription, model }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error ?? "Cover letter generation failed");
      setLetter(data.letter);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(
        err instanceof Error ? err.message : "Cover letter generation failed",
      );
    } finally {
      abortControllerRef.current = null;
      setGenerating(false);
    }
  }

  function handleCancel() {
    abortControllerRef.current?.abort();
  }

  async function handleCopy() {
    if (!letter) return;
    await navigator.clipboard.writeText(letter);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function handleDownload() {
    if (!letter) return;
    const base = (cv.name || "cover_letter")
      .trim()
      .replace(/\s+/g, "_")
      .toLowerCase();
    const blob = new Blob([letter], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${base}_cover_letter.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!letter) {
    return (
      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating}
          className="rounded-full bg-fill-secondary hover:bg-black/10 dark:hover:bg-white/15 px-5 py-2.5 text-[14px] font-medium text-accent transition disabled:opacity-50"
        >
          {generating ? "Writing cover letter…" : "Generate cover letter"}
        </button>
        {generating && (
          <button
            type="button"
            onClick={handleCancel}
            aria-label="Cancel cover letter generation"
            className="rounded-full px-3 py-1.5 text-[13px] font-medium text-text-secondary hover:text-foreground transition"
          >
            Cancel
          </button>
        )}
        {error && <p className="text-[12px] text-red-600 mt-2">{error}</p>}
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[13px] font-medium text-text-secondary">
          Cover letter
        </h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-full px-3 py-1.5 text-[12px] font-medium text-text-secondary hover:text-foreground transition"
          >
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="rounded-full bg-fill-secondary hover:bg-black/10 dark:hover:bg-white/15 px-3 py-1.5 text-[12px] font-medium text-accent transition"
          >
            Download .txt
          </button>
        </div>
      </div>
      <textarea
        value={letter}
        onChange={(e) => setLetter(e.target.value)}
        rows={10}
        className="w-full rounded-[var(--radius-card)] bg-surface border border-hairline p-4 text-[14px] leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
      />
      {error && <p className="text-[12px] text-red-600 mt-2">{error}</p>}
    </div>
  );
}
