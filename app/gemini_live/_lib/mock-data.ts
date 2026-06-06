import type { CatalogItemCandidate, MerchantContext } from "./types";

export const defaultMerchantContext: MerchantContext = {
  merchantId: "M12345",
  name: "Ramesh Kirana Store",
  location: "Andheri West, Mumbai",
  languageHint: "Hindi-English / Hinglish"
};

export const sampleProducts: CatalogItemCandidate[] = [
  {
    name: "Amul Taaza",
    brand: "Amul",
    packSize: "500ml",
    price: 28,
    inventory: 20,
    category: "Dairy",
    evidence: {
      visual: "Blue Amul Taaza pack visible on shelf.",
      voice: "Merchant said Amul Taaza 28 rupees, 20 packets."
    },
    confidence: 0.94
  },
  {
    name: "Britannia Bread",
    brand: "Britannia",
    packSize: "400g",
    price: 45,
    inventory: 10,
    category: "Bakery",
    evidence: {
      visual: "Bread pack visible near the counter.",
      voice: "Merchant said bread 45 rupees, 10 pieces."
    },
    confidence: 0.89
  },
  {
    name: "Maggi 2-Minute Noodles",
    brand: "Maggi",
    packSize: "70g",
    price: 14,
    inventory: 35,
    category: "Instant Food",
    evidence: {
      visual: "Yellow Maggi packs visible in the shelf stack.",
      voice: "Merchant said Maggi 14 rupees, 35 packets."
    },
    confidence: 0.92
  },
  {
    name: "Lays Classic",
    brand: "Lays",
    packSize: "52g",
    price: 20,
    inventory: 25,
    category: "Snacks",
    evidence: {
      visual: "Classic Lays pack visible with other snacks.",
      voice: "Merchant said Lays 20 rupees, 25 packets."
    },
    confidence: 0.84
  }
];

export function getMockAnalyzeResponse() {
  return {
    mode: "mock" as const,
    products: sampleProducts,
    followUpQuestion: "I found four demo products. Please confirm price and stock before exporting.",
    assistantMessage:
      "Demo shelf data loaded. You can edit quantities, confirm items, or keep scanning with a clearer shelf view.",
    warnings: ["Mock mode is active, so these products are sample detections."]
  };
}
