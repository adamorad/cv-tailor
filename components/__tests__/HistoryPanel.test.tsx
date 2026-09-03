// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { HistoryPanel } from "../HistoryPanel";
import { sampleCv, minimalCv } from "@/lib/render/__tests__/fixtures";
import type { HistoryEntry } from "@/lib/storage";

const NOW = new Date("2024-01-01T00:00:00Z").getTime();

function makeEntry(overrides: Partial<HistoryEntry> = {}): HistoryEntry {
  return {
    id: "entry-1",
    createdAt: NOW,
    cv: sampleCv,
    ...overrides,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("HistoryPanel", () => {
  it("renders nothing when history is empty", () => {
    const { container } = render(
      <HistoryPanel history={[]} onSelect={vi.fn()} onClear={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders each history entry's name, title, and relative time", () => {
    const entries: HistoryEntry[] = [
      makeEntry({
        id: "recent",
        cv: sampleCv,
        createdAt: NOW - 30 * 1000, // "just now"
      }),
      makeEntry({
        id: "hours-ago",
        cv: minimalCv,
        createdAt: NOW - 3 * 60 * 60 * 1000, // "3h ago"
      }),
    ];
    render(
      <HistoryPanel history={entries} onSelect={vi.fn()} onClear={vi.fn()} />,
    );

    expect(screen.getByText(sampleCv.name)).toBeInTheDocument();
    expect(
      screen.getByText(`${sampleCv.title} · just now`),
    ).toBeInTheDocument();

    expect(screen.getByText(minimalCv.name)).toBeInTheDocument();
    // minimalCv has an empty title, which the component falls back to "—" for.
    expect(screen.getByText("— · 3h ago")).toBeInTheDocument();
  });

  it("calls onSelect with the clicked entry", () => {
    const entry = makeEntry();
    const onSelect = vi.fn();
    render(
      <HistoryPanel history={[entry]} onSelect={onSelect} onClear={vi.fn()} />,
    );

    fireEvent.click(screen.getByText(sampleCv.name));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(entry);
  });

  it("calls onClear when Clear is clicked", () => {
    const onClear = vi.fn();
    render(
      <HistoryPanel
        history={[makeEntry()]}
        onSelect={vi.fn()}
        onClear={onClear}
      />,
    );

    fireEvent.click(screen.getByText("Clear"));

    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
