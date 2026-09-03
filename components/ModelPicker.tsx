"use client";

import { useEffect, useRef, useState } from "react";
import type { ModelOption } from "@/lib/models";

type ModelStatus = ModelOption & { downloaded: boolean };

const RING_RADIUS = 9;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function ProgressRing({ percent }: { percent: number | null }) {
  const pct = percent ?? 0;
  const offset = RING_CIRCUMFERENCE * (1 - pct / 100);
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" className="shrink-0">
      <circle
        cx="11"
        cy="11"
        r={RING_RADIUS}
        fill="none"
        strokeWidth="2"
        className="stroke-fill-secondary"
      />
      <circle
        cx="11"
        cy="11"
        r={RING_RADIUS}
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        stroke="var(--accent)"
        strokeDasharray={RING_CIRCUMFERENCE}
        strokeDashoffset={offset}
        transform="rotate(-90 11 11)"
        style={{ transition: "stroke-dashoffset 0.3s ease" }}
      />
    </svg>
  );
}

function StatusBadge({
  downloaded,
  selected,
  pulling,
  percent,
}: {
  downloaded: boolean;
  selected: boolean;
  pulling: boolean;
  percent: number | null;
}) {
  if (pulling) return <ProgressRing percent={percent} />;

  if (selected) {
    return (
      <span className="flex items-center justify-center w-[22px] h-[22px] rounded-full bg-accent text-white shrink-0">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
          <path
            d="M20 6 9 17l-5-5"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }

  if (downloaded) {
    return (
      <span className="w-[22px] h-[22px] rounded-full border-2 border-hairline shrink-0" />
    );
  }

  return (
    <span className="rounded-full border border-accent text-accent text-[11px] font-semibold px-2.5 py-0.5 shrink-0">
      GET
    </span>
  );
}

export function ModelPicker({
  selected,
  onSelect,
}: {
  selected: string | null;
  onSelect: (model: string | null) => void;
}) {
  const [models, setModels] = useState<ModelStatus[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pulling, setPulling] = useState<string | null>(null);
  const [pullPercent, setPullPercent] = useState<number | null>(null);
  const [pullStatus, setPullStatus] = useState<string>("");
  const abortControllerRef = useRef<AbortController | null>(null);

  async function refresh() {
    try {
      const res = await fetch("/api/models");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load models");
      setModels(data.models);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load models");
    }
  }

  useEffect(() => {
    // fetch-on-mount: setState only fires after the async response resolves, not synchronously
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, []);

  async function pull(modelId: string) {
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setPulling(modelId);
    setPullPercent(null);
    setPullStatus("Preparing…");
    try {
      const res = await fetch("/api/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: modelId }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Download failed");
      }
      if (!res.body) throw new Error("No response stream");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const processLine = (line: string) => {
        if (!line.trim()) return;
        const chunk = JSON.parse(line);
        if (chunk.error) throw new Error(chunk.error);
        if (chunk.total && chunk.completed) {
          setPullPercent(Math.round((chunk.completed / chunk.total) * 100));
        }
        setPullStatus(chunk.status ?? "");
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) processLine(line);
      }
      processLine(buffer);

      await refresh();
      onSelect(modelId);
    } catch (err) {
      // A cancelled pull isn't a failure — reset quietly instead of surfacing an error.
      if (!(err instanceof Error && err.name === "AbortError")) {
        setError(err instanceof Error ? err.message : "Download failed");
      }
    } finally {
      abortControllerRef.current = null;
      setPulling(null);
      setPullPercent(null);
      setPullStatus("");
    }
  }

  function cancelPull() {
    abortControllerRef.current?.abort();
  }

  async function deleteModel(modelId: string) {
    try {
      const res = await fetch("/api/models", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: modelId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Delete failed");
      }
      await refresh();
      if (selected === modelId) onSelect(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-[13px] font-medium text-text-secondary">Model</h2>
      {error && <p className="text-[12px] text-red-600">{error}</p>}
      {!models && !error && (
        <p className="text-[13px] text-text-secondary">Loading models…</p>
      )}
      <div
        role="group"
        aria-label="Model"
        className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3"
      >
        {models?.map((m) => {
          const isSelected = selected === m.id;
          const isPulling = pulling === m.id;
          return (
            <div
              key={m.id}
              className={`rounded-[var(--radius-card)] bg-surface border p-4 flex flex-col gap-2 transition ${
                isSelected
                  ? "border-accent shadow-[0_0_0_1px_var(--accent)]"
                  : "border-hairline hover:border-black/20 dark:hover:border-white/25"
              }`}
            >
              <button
                type="button"
                aria-pressed={isSelected}
                disabled={pulling !== null}
                onClick={() => (m.downloaded ? onSelect(m.id) : pull(m.id))}
                className="text-left flex flex-col gap-2 w-full disabled:opacity-40"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[15px] font-semibold tracking-tight">
                    {m.label}
                  </span>
                  <StatusBadge
                    downloaded={m.downloaded}
                    selected={isSelected}
                    pulling={isPulling}
                    percent={pullPercent}
                  />
                </div>
                <span className="text-[12px] text-text-secondary">
                  {isPulling ? pullStatus || "Downloading…" : `${m.sizeGb} GB`}
                </span>
                <span className="text-[12px] text-text-secondary leading-snug">
                  {m.description}
                </span>
              </button>
              {isPulling && (
                <button
                  type="button"
                  onClick={cancelPull}
                  className="self-end text-[11px] text-text-secondary hover:text-foreground transition"
                >
                  Cancel
                </button>
              )}
              {!isPulling && m.downloaded && (
                <button
                  type="button"
                  disabled={pulling !== null}
                  onClick={() => deleteModel(m.id)}
                  aria-label={`Remove ${m.label}`}
                  className="self-end text-[11px] text-text-secondary hover:text-red-600 transition disabled:opacity-40"
                >
                  Remove
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
