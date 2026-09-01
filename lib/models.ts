export interface ModelOption {
  id: string;
  label: string;
  sizeGb: number;
  description: string;
}

export const CURATED_MODELS: ModelOption[] = [
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
