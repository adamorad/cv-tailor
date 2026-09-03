"use client";

import { useRef, useState } from "react";
import type { Cv } from "@/lib/schema";
import { sanitizeFilenameBase } from "@/lib/filename";
import { toMarkdown } from "@/lib/render/toMarkdown";
import { toText } from "@/lib/render/toText";
import { toHtml } from "@/lib/render/toHtml";

const FORMATS = [
  { id: "md", label: "Markdown" },
  { id: "txt", label: "Plain text" },
  { id: "html", label: "HTML" },
  { id: "docx", label: "Word" },
  { id: "pdf", label: "PDF" },
] as const;

type Format = (typeof FORMATS)[number]["id"];

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ExportPanel({ cv }: { cv: Cv }) {
  const [format, setFormat] = useState<Format>("md");
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const filenameBase = sanitizeFilenameBase(cv.name);
  const formatLabel = FORMATS.find((f) => f.id === format)!.label;

  function handleTablistKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const currentIndex = FORMATS.findIndex((f) => f.id === format);
    let nextIndex: number | null = null;

    if (e.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % FORMATS.length;
    } else if (e.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + FORMATS.length) % FORMATS.length;
    } else if (e.key === "Home") {
      nextIndex = 0;
    } else if (e.key === "End") {
      nextIndex = FORMATS.length - 1;
    }

    if (nextIndex === null) return;
    e.preventDefault();
    setFormat(FORMATS[nextIndex].id);
    tabRefs.current[nextIndex]?.focus();
  }

  async function handleDownload() {
    setError(null);
    try {
      if (format === "md") {
        downloadBlob(
          new Blob([toMarkdown(cv)], { type: "text/markdown" }),
          `${filenameBase}.md`,
        );
        return;
      }
      if (format === "txt") {
        downloadBlob(
          new Blob([toText(cv)], { type: "text/plain" }),
          `${filenameBase}.txt`,
        );
        return;
      }
      if (format === "html") {
        downloadBlob(
          new Blob([toHtml(cv)], { type: "text/html" }),
          `${filenameBase}.html`,
        );
        return;
      }

      setDownloading(true);
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cv, format }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Export failed");
      }
      const blob = await res.blob();
      downloadBlob(blob, `${filenameBase}.${format}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div
        role="tablist"
        aria-label="Export format"
        onKeyDown={handleTablistKeyDown}
        className="inline-flex gap-0.5 rounded-[10px] bg-fill-secondary p-0.5"
      >
        {FORMATS.map((f, i) => {
          const selected = format === f.id;
          return (
            <button
              key={f.id}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`export-format-tab-${f.id}`}
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => setFormat(f.id)}
              className={`rounded-[8px] px-3 py-1.5 text-[13px] font-medium transition ${
                selected
                  ? "bg-surface shadow-[0_1px_2px_rgba(0,0,0,0.12)]"
                  : "text-text-secondary hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={handleDownload}
        disabled={downloading}
        className="rounded-full bg-fill-secondary hover:bg-black/10 dark:hover:bg-white/15 active:scale-[0.97] px-5 py-2.5 text-[14px] font-medium text-accent transition disabled:opacity-50 flex items-center gap-1.5"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 3v13m0 0-5-5m5 5 5-5M5 20h14"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {downloading ? "Preparing…" : `Download ${formatLabel}`}
      </button>
      {error && <p className="text-[12px] text-red-600">{error}</p>}
    </div>
  );
}
