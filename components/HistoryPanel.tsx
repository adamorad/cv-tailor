"use client";

import type { HistoryEntry } from "@/lib/storage";

function timeAgo(ms: number): string {
  const seconds = Math.round((Date.now() - ms) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export function HistoryPanel({
  history,
  onSelect,
  onClear,
}: {
  history: HistoryEntry[];
  onSelect: (entry: HistoryEntry) => void;
  onClear: () => void;
}) {
  if (history.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 min-h-0">
      <div className="flex items-center justify-between">
        <h2 className="text-[11px] font-medium text-text-secondary uppercase tracking-wide">
          History
        </h2>
        <button
          type="button"
          onClick={onClear}
          className="text-[11px] text-text-secondary hover:text-foreground transition"
        >
          Clear
        </button>
      </div>
      <div className="flex flex-col gap-1 overflow-y-auto">
        {history.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => onSelect(entry)}
            className="text-left rounded-lg px-2 py-1.5 hover:bg-fill-secondary transition"
          >
            <p className="text-[12px] font-medium truncate">
              {entry.cv.name || "Untitled"}
            </p>
            <p className="text-[11px] text-text-secondary truncate">
              {entry.cv.title || "—"} · {timeAgo(entry.createdAt)}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
