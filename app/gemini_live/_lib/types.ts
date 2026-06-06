export const catalogCategories = [
  "Dairy",
  "Bakery",
  "Snacks",
  "Instant Food",
  "Beverages",
  "Personal Care",
  "Household",
  "Medicine",
  "Other"
] as const;

export type CatalogCategory = (typeof catalogCategories)[number];

export type MerchantContext = {
  merchantId: string;
  name: string;
  location: string;
  languageHint: string;
};

export type CatalogItemCandidate = {
  name: string;
  brand: string | null;
  packSize: string | null;
  price: number | null;
  inventory: number | null;
  category: CatalogCategory;
  evidence: {
    visual: string | null;
    voice: string | null;
  };
  confidence: number;
};

export type CatalogItemStatus = "detected" | "needs_review" | "confirmed";

export type CatalogItem = {
  id: string;
  name: string;
  brand: string | null;
  packSize: string | null;
  price: number | null;
  inventory: number | null;
  category: CatalogCategory;
  confidence: number;
  sources: {
    visual?: string;
    voice?: string;
  };
  status: CatalogItemStatus;
  reviewNotes: string[];
  updatedAt: string;
};

export type AnalyzeFrameRequest = {
  scanId: string;
  frameBase64: string;
  transcriptSoFar: string;
  currentCatalog: CatalogItem[];
  merchantContext: MerchantContext;
};

export type AnalyzeFrameResponse = {
  mode: "mock" | "ai";
  products: CatalogItemCandidate[];
  followUpQuestion: string | null;
  assistantMessage: string;
  warnings?: string[];
};

export type ScanStatus =
  | "idle"
  | "requesting_permission"
  | "scanning"
  | "analyzing"
  | "paused"
  | "permission_denied"
  | "error";

export type GeminiLiveState = {
  hydrated: boolean;
  scanId: string;
  merchantContext: MerchantContext;
  transcriptSoFar: string;
  catalog: CatalogItem[];
  assistantMessage: string;
  followUpQuestion: string | null;
  warnings: string[];
  status: ScanStatus;
  lastAnalyzedAt: string | null;
};
