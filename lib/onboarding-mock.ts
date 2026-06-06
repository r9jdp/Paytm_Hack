import type {
  InventoryExtraction,
  OnboardingExtractionResponse,
  OnboardingExtractionStage
} from "@/lib/types";

export function getMockInventoryExtraction(): InventoryExtraction {
  return {
    items: [
      {
        id: "maggi-70g",
        name: "Maggi 2-Minute Noodles",
        category: "Packaged food",
        quantity: 24,
        unit: "packets",
        packSize: "70g",
        price: "₹14",
        evidence: {
          visual: "Yellow Maggi packs visible on shelf.",
          voice: "User said twenty four packets."
        },
        confidence: 0.86
      },
      {
        id: "amul-taaza-500ml",
        name: "Amul Taaza",
        category: "Dairy",
        quantity: 12,
        unit: "packets",
        packSize: "500ml",
        price: "₹28",
        evidence: {
          visual: "Amul milk packets visible.",
          voice: "User said twelve packets."
        },
        confidence: 0.8
      }
    ],
    transcriptSummary: "Mock inventory detected from frame and spoken quantities.",
    confidence: 0.84,
    isComplete: true,
    warnings: ["Mock inventory data returned for demo continuity."]
  };
}

export function getMockOnboardingExtraction(stage: OnboardingExtractionStage): OnboardingExtractionResponse {
  return {
    stage,
    inventory: getMockInventoryExtraction()
  };
}
