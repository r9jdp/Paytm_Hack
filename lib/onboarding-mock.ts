import type {
  InventoryExtraction,
  KycExtraction,
  OnboardingExtractionResponse,
  OnboardingExtractionStage
} from "@/lib/types";

export function getMockKycExtraction(): KycExtraction {
  return {
    documentType: "Aadhaar card",
    rawOcrText:
      "Mock OCR: Government of India Aadhaar sample. Name: Ramesh Kumar. DOB: 1988. Aadhaar number visible in the demo frame.",
    fields: {
      name: "Ramesh Kumar",
      aadhaarNumber: "XXXX XXXX 1234",
      dateOfBirth: "1988",
      gender: "Male",
      address: "Demo address from mock OCR",
      issuer: "Government of India"
    },
    confidence: 0.82,
    isComplete: true,
    warnings: ["Mock KYC data. This is not official verification."]
  };
}

export function getMockInventoryExtraction(): InventoryExtraction {
  return {
    items: [
      {
        id: "maggi-70g",
        name: "Maggi 2-Minute Noodles",
        quantity: 24,
        unit: "packets",
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
        quantity: 12,
        unit: "packets",
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
  if (stage === "kyc") {
    return {
      stage,
      kyc: getMockKycExtraction()
    };
  }

  return {
    stage,
    inventory: getMockInventoryExtraction()
  };
}
