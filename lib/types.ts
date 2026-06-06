export const onboardingStages = [
  "idle",
  "kyc_prompt",
  "kyc_scanning",
  "inventory_prompt",
  "inventory_scanning",
  "export_ready"
] as const;

export type OnboardingStage = (typeof onboardingStages)[number];

export type OnboardingExtractionStage = "kyc" | "inventory";

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

export type KycFields = {
  name?: string | null;
  aadhaarNumber?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  address?: string | null;
  issuer?: string | null;
};

export type KycExtraction = {
  documentType: string;
  rawOcrText: string;
  fields: KycFields;
  confidence: number;
  isComplete: boolean;
  warnings?: string[];
};

export type InventoryItem = {
  id: string;
  name: string;
  quantity?: number | null;
  unit?: string | null;
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
  kyc: KycExtraction | null;
  inventory: InventoryItem[];
  transcript: TranscriptEntry[];
  sourceFrames: SourceFrame[];
};

export type OnboardingExtractionRequest = {
  stage: OnboardingExtractionStage;
  frameBase64: string;
  transcript: string;
  previousState?: {
    kyc?: KycExtraction | null;
    inventory?: InventoryItem[];
  };
};

export type OnboardingExtractionResponse = {
  stage: OnboardingExtractionStage;
  kyc?: KycExtraction;
  inventory?: InventoryExtraction;
};
