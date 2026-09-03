"use client";

import { useEffect, useState } from "react";

// Ollama's chat API gives no incremental progress for a single completion,
// so this is an honest "trickle" bar: it eases toward ~90% and holds there
// for as long as generation takes, rather than faking a real percentage.
const TIME_CONSTANT_SECONDS = 12;
const CEILING_PERCENT = 90;

export function GenerationProgress({ active }: { active: boolean }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!active) return;
    const start = Date.now();
    const id = setInterval(() => {
      const elapsed = (Date.now() - start) / 1000;
      setProgress(
        CEILING_PERCENT * (1 - Math.exp(-elapsed / TIME_CONSTANT_SECONDS)),
      );
    }, 100);
    return () => {
      clearInterval(id);
      setProgress(0);
    };
  }, [active]);

  if (!active) return null;

  return (
    <div
      className="h-1 w-full overflow-hidden rounded-full bg-fill-secondary"
      role="progressbar"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Generating your tailored CV"
    >
      <div
        className="h-full rounded-full bg-accent progress-fill"
        style={{ width: `${progress}%`, transition: "width 0.2s linear" }}
      />
    </div>
  );
}
