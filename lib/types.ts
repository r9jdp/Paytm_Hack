export const onboardingStages = [
  "idle",
  "inventory_prompt",
  "inventory_scanning",
  "export_ready"
] as const;

export type OnboardingStage = (typeof onboardingStages)[number];

export type OnboardingExtractionStage = "inventory";

export type TranscriptEntry = {
  id: string;
  role: "assistant" | "user" | "system";
  text: string;
  createdAt: string;
};

export type SourceFrame = {
  id: string;
  stage: OnboardingExtractionStage;
  frameBase64: string;
  capturedAt: string;
};

export type InventoryItem = {
  id: string;
  name: string;
  category?: string | null;
  quantity?: number | null;
  unit?: string | null;
  packSize?: string | null;
  price?: string | null;
  evidence: {
    visual?: string | null;
    voice?: string | null;
  };
  confidence: number;
};

export type InventoryExtraction = {
  items: InventoryItem[];
  transcriptSummary?: string | null;
  confidence: number;
  isComplete: boolean;
  warnings?: string[];
};

export type StorefrontExport = {
  id: string;
  createdAt: string;
  inventory: InventoryItem[];
  transcript: TranscriptEntry[];
  sourceFrames: SourceFrame[];
};

export type OnboardingExtractionRequest = {
  stage: OnboardingExtractionStage;
  frameBase64: string;
  transcript: string;
  previousState?: {
    inventory?: InventoryItem[];
  };
};

export type OnboardingExtractionResponse = {
  stage: OnboardingExtractionStage;
  inventory?: InventoryExtraction;
};
