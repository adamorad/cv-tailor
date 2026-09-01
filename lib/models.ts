export interface ModelOption {
  id: string;
  label: string;
  sizeGb: number;
  description: string;
}

export const CURATED_MODELS: ModelOption[] = [
  {
    id: "qwen2.5:7b",
    label: "Qwen 2.5 7B",
    sizeGb: 4.7,
    description:
      "Balanced quality/speed, strong JSON-schema adherence. Recommended default.",
  },
  {
    id: "llama3.1:8b",
    label: "Llama 3.1 8B",
    sizeGb: 4.9,
    description: "Strong instruction-following, slightly slower.",
  },
  {
    id: "mistral:7b",
    label: "Mistral 7B",
    sizeGb: 4.4,
    description:
      "Fastest of the set, somewhat less precise on structured output.",
  },
  {
    id: "qwen2.5:14b",
    label: "Qwen 2.5 14B",
    sizeGb: 9.0,
    description:
      "Higher quality tailoring, noticeably slower and needs more RAM.",
  },
];
