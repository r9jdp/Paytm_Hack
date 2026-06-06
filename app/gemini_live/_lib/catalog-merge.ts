import type { CatalogItem, CatalogItemCandidate } from "./types";

const VOICE_OVERRIDE_CONFIDENCE = 0.65;
const DETECTED_CONFIDENCE = 0.75;

export function normalizeCatalogText(value: string | null | undefined) {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizePackSize(value: string | null | undefined) {
  const text = normalizeCatalogText(value);
  if (!text) return "";

  const liters = text.match(/^(\d+(?:\.\d+)?)\s*l$/);
  if (liters) {
    return `${Math.round(Number(liters[1]) * 1000)}ml`;
  }

  return text
    .replace(/\bmillilitres?\b/g, "ml")
    .replace(/\bgrams?\b/g, "g")
    .replace(/\bkilograms?\b/g, "kg")
    .replace(/\s+/g, "");
}

function getMergeKey(item: Pick<CatalogItem, "brand" | "name" | "packSize">) {
  return [
    normalizeCatalogText(item.brand),
    normalizeCatalogText(item.name),
    normalizePackSize(item.packSize)
  ].join("|");
}

function tokenOverlap(left: string, right: string) {
  const leftTokens = new Set(normalizeCatalogText(left).split(" ").filter(Boolean));
  const rightTokens = new Set(normalizeCatalogText(right).split(" ").filter(Boolean));
  if (!leftTokens.size || !rightTokens.size) return 0;

  let hits = 0;
  leftTokens.forEach((token) => {
    if (rightTokens.has(token)) hits += 1;
  });

  return hits / Math.max(leftTokens.size, rightTokens.size);
}

function getItemStatus(candidate: CatalogItemCandidate): CatalogItem["status"] {
  if (candidate.confidence < DETECTED_CONFIDENCE || candidate.price === null || candidate.inventory === null) {
    return "needs_review";
  }

  return "detected";
}

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `item-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function candidateToItem(candidate: CatalogItemCandidate): CatalogItem {
  const reviewNotes: string[] = [];

  if (candidate.price === null) {
    reviewNotes.push("Price missing. Ask merchant to confirm.");
  }

  if (candidate.inventory === null) {
    reviewNotes.push("Stock missing. Ask merchant to confirm.");
  }

  if (candidate.confidence < DETECTED_CONFIDENCE) {
    reviewNotes.push("Low confidence detection.");
  }

  return {
    id: createId(),
    name: candidate.name.trim(),
    brand: candidate.brand,
    packSize: candidate.packSize,
    price: candidate.price,
    inventory: candidate.inventory,
    category: candidate.category,
    confidence: candidate.confidence,
    sources: {
      visual: candidate.evidence.visual ?? undefined,
      voice: candidate.evidence.voice ?? undefined
    },
    status: getItemStatus(candidate),
    reviewNotes,
    updatedAt: new Date().toISOString()
  };
}

export function findMergeTarget(catalog: CatalogItem[], candidate: CatalogItemCandidate) {
  const candidateKey = getMergeKey({
    brand: candidate.brand,
    name: candidate.name,
    packSize: candidate.packSize
  });

  const exactIndex = catalog.findIndex((item) => getMergeKey(item) === candidateKey);
  if (exactIndex >= 0) return exactIndex;

  const candidatePack = normalizePackSize(candidate.packSize);
  const candidateBrand = normalizeCatalogText(candidate.brand);

  const fuzzyMatches = catalog
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => {
      const itemPack = normalizePackSize(item.packSize);
      const itemBrand = normalizeCatalogText(item.brand);
      const packCompatible = !candidatePack || !itemPack || candidatePack === itemPack;
      const brandCompatible = !candidateBrand || !itemBrand || candidateBrand === itemBrand;
      return packCompatible && brandCompatible && tokenOverlap(item.name, candidate.name) >= 0.82;
    });

  return fuzzyMatches.length === 1 ? fuzzyMatches[0].index : -1;
}

export function mergeCatalogCandidate(catalog: CatalogItem[], candidate: CatalogItemCandidate) {
  const index = findMergeTarget(catalog, candidate);

  if (index < 0) {
    return [...catalog, candidateToItem(candidate)];
  }

  return catalog.map((item, itemIndex) => {
    if (itemIndex !== index) return item;

    const notes = [...item.reviewNotes];

    if (item.status === "confirmed") {
      const priceConflict = candidate.price !== null && item.price !== null && candidate.price !== item.price;
      const stockConflict =
        candidate.inventory !== null && item.inventory !== null && candidate.inventory !== item.inventory;

      if (priceConflict || stockConflict) {
        notes.push("New AI evidence conflicts with confirmed merchant values.");
      }

      return {
        ...item,
        confidence: Math.max(item.confidence, candidate.confidence),
        sources: {
          visual: candidate.evidence.visual ?? item.sources.visual,
          voice: candidate.evidence.voice ?? item.sources.voice
        },
        reviewNotes: Array.from(new Set(notes)),
        updatedAt: new Date().toISOString()
      };
    }

    const voiceCanOverride = Boolean(candidate.evidence.voice) && candidate.confidence >= VOICE_OVERRIDE_CONFIDENCE;
    const nextPrice = voiceCanOverride && candidate.price !== null ? candidate.price : item.price ?? candidate.price;
    const nextInventory =
      voiceCanOverride && candidate.inventory !== null ? candidate.inventory : item.inventory ?? candidate.inventory;

    const merged: CatalogItem = {
      ...item,
      name: item.name || candidate.name,
      brand: item.brand ?? candidate.brand,
      packSize: item.packSize ?? candidate.packSize,
      price: nextPrice,
      inventory: nextInventory,
      category: candidate.category ?? item.category,
      confidence: Math.max(item.confidence, candidate.confidence),
      sources: {
        visual: candidate.evidence.visual ?? item.sources.visual,
        voice: candidate.evidence.voice ?? item.sources.voice
      },
      reviewNotes: Array.from(new Set(notes)),
      updatedAt: new Date().toISOString()
    };

    merged.status =
      merged.price === null || merged.inventory === null || merged.confidence < DETECTED_CONFIDENCE
        ? "needs_review"
        : item.status;

    return merged;
  });
}

export function mergeCatalogCandidates(catalog: CatalogItem[], candidates: CatalogItemCandidate[]) {
  return candidates.reduce((nextCatalog, candidate) => mergeCatalogCandidate(nextCatalog, candidate), catalog);
}
