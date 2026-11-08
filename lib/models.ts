export interface ModelOption {
  id: string;
  label: string;
  sizeGb: number;
  description: string;
}

export const CURATED_MODELS: ModelOption[] = [
  {
    id: "smollm2:360m",
    label: "SmolLM2 360M",
    sizeGb: 0.3,
    description:
      "As small as it gets. Fastest option, best for a quick smoke test — not for final output.",
  },
  {
    id: "qwen2.5:0.5b",
    label: "Qwen 2.5 0.5B",
    sizeGb: 0.4,
    description: "Extremely small footprint. Works on almost any machine.",
  },
  {
    id: "llama3.2:1b",
    label: "Llama 3.2 1B",
    sizeGb: 1.3,
    description: "Very small and fast, better instruction-following than the 0.5B tier.",
  },
  {
    id: "qwen2.5:1.5b",
    label: "Qwen 2.5 1.5B",
    sizeGb: 1.0,
    description:
      "Tiny and fast. Good for quick iteration, lower tailoring quality.",
  },
  {
    id: "llama3.2:3b",
    label: "Llama 3.2 3B",
    sizeGb: 2.0,
    description: "Small and capable, solid instruction-following.",
  },
  {
    id: "qwen2.5:3b",
    label: "Qwen 2.5 3B",
    sizeGb: 1.9,
    description: "Best balance of size and quality. Recommended default.",
  },
  {
    id: "qwen2.5:7b",
    label: "Qwen 2.5 7B",
    sizeGb: 4.7,
    description:
      "Highest quality of this set, still a fraction of a 14B model.",
  },
];
