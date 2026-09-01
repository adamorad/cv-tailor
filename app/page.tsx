"use client";

import { useState } from "react";
import type { Cv } from "@/lib/schema";
import { FileTextInput } from "@/components/FileTextInput";
import { ModelPicker } from "@/components/ModelPicker";
import { CvPreview } from "@/components/CvPreview";
import { CvSkeleton } from "@/components/CvSkeleton";
import { ExportPanel } from "@/components/ExportPanel";

export default function Home() {
  const [cvText, setCvText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [model, setModel] = useState<string | null>(null);
  const [cv, setCv] = useState<Cv | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canGenerate =
    cvText.trim() && jobDescription.trim() && model && !generating;

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cvText, jobDescription, model }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      setCv(data.cv);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-hairline bg-background/70 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-6 h-[52px] flex items-center justify-between">
          <span className="text-[15px] font-semibold tracking-tight">
            CV Tailor
          </span>
          <span className="flex items-center gap-1.5 rounded-full bg-fill-secondary px-3 py-1 text-[12px] font-medium text-text-secondary">
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              className="text-success"
            >
              <path
                d="M12 2 4 5v6c0 5 3.5 8.5 8 9 4.5-.5 8-4 8-9V5l-8-3Z"
                fill="currentColor"
              />
            </svg>
            On-device
          </span>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 pb-24">
        <div className="pt-14 pb-10">
          <h1 className="text-[40px] sm:text-[48px] font-semibold tracking-tight leading-[1.05]">
            Tailor your CV.
            <br />
            <span className="text-accent">Nothing leaves your Mac.</span>
          </h1>
          <p className="mt-3 text-[19px] text-text-secondary max-w-xl">
            Paste your CV and a job description. Pick a model that runs locally.
            Get a version that speaks to the role — without sending anything to
            the cloud.
          </p>
        </div>

        <section className="grid md:grid-cols-2 gap-4">
          <FileTextInput
            label="Your CV"
            value={cvText}
            onChange={setCvText}
            placeholder="Paste your CV text, or upload a PDF/DOCX above"
          />
          <FileTextInput
            label="Job description"
            value={jobDescription}
            onChange={setJobDescription}
            placeholder="Paste the job description text, or upload a PDF/DOCX above"
          />
        </section>

        <section className="mt-8">
          <ModelPicker selected={model} onSelect={setModel} />
        </section>

        <section className="mt-8 flex items-center gap-4">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="rounded-full bg-accent hover:bg-accent-hover active:bg-accent-active active:scale-[0.97] text-white px-6 py-3 text-[15px] font-medium transition disabled:opacity-40 disabled:pointer-events-none"
          >
            {generating ? "Generating…" : "Generate tailored CV"}
          </button>
          {error && <p className="text-[13px] text-red-600">{error}</p>}
        </section>

        {generating && (
          <section className="mt-16 pt-10 border-t border-hairline">
            <h2 className="text-[22px] font-semibold tracking-tight mb-5">
              Preview
            </h2>
            <div className="rounded-[var(--radius-card)] bg-surface border border-hairline shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_28px_rgba(0,0,0,0.06)] p-8 sm:p-10">
              <CvSkeleton />
            </div>
          </section>
        )}

        {!generating && cv && (
          <section className="mt-16 pt-10 border-t border-hairline reveal">
            <h2 className="text-[22px] font-semibold tracking-tight mb-5">
              Preview
            </h2>
            <div className="mx-auto max-w-2xl rounded-[var(--radius-card)] bg-surface border border-hairline shadow-[0_1px_2px_rgba(0,0,0,0.04),0_20px_40px_rgba(0,0,0,0.08)] p-8 sm:p-12">
              <CvPreview cv={cv} />
            </div>
            <div className="mt-6">
              <ExportPanel cv={cv} />
            </div>
          </section>
        )}
      </main>
    </>
  );
}
