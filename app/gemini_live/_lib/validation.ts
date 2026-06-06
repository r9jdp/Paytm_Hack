import { catalogCategories, type AnalyzeFrameRequest, type CatalogCategory, type CatalogItemCandidate } from "./types";

const MAX_FRAME_CHARS = 6_500_000;

export function isValidImageDataUrl(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^data:image\/(?:jpeg|jpg|png|webp);base64,[a-zA-Z0-9+/=]+$/.test(value)
  );
}

export function isOversizedFrame(value: string) {
  return value.length > MAX_FRAME_CHARS;
}

export function isCatalogCategory(value: unknown): value is CatalogCategory {
  return typeof value === "string" && catalogCategories.includes(value as never);
}

function asNumberOrNull(value: unknown) {
  if (value === null) return null;
  if (typeof value !== "number" || Number.isNaN(value)) return undefined;
  return value;
}

function clampConfidence(value: unknown) {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export function sanitizeCandidate(value: unknown): CatalogItemCandidate | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const evidence = raw.evidence as Record<string, unknown> | undefined;
  const price = asNumberOrNull(raw.price);
  const inventory = asNumberOrNull(raw.inventory);

  if (
    typeof raw.name !== "string" ||
    !raw.name.trim() ||
    price === undefined ||
    inventory === undefined ||
    !isCatalogCategory(raw.category)
  ) {
    return null;
  }

  return {
    name: raw.name.trim(),
    brand: typeof raw.brand === "string" && raw.brand.trim() ? raw.brand.trim() : null,
    packSize: typeof raw.packSize === "string" && raw.packSize.trim() ? raw.packSize.trim() : null,
    price,
    inventory,
    category: raw.category,
    evidence: {
      visual: typeof evidence?.visual === "string" && evidence.visual.trim() ? evidence.visual.trim() : null,
      voice: typeof evidence?.voice === "string" && evidence.voice.trim() ? evidence.voice.trim() : null
    },
    confidence: clampConfidence(raw.confidence)
  };
}

export function sanitizeCandidates(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map(sanitizeCandidate).filter((candidate): candidate is CatalogItemCandidate => Boolean(candidate));
}

export function validateAnalyzeFrameBody(value: unknown): AnalyzeFrameRequest | { error: string; status: 400 | 413 } {
  if (!value || typeof value !== "object") {
    return { error: "Request body must be a JSON object.", status: 400 };
  }

  const body = value as AnalyzeFrameRequest;

  if (typeof body.scanId !== "string" || !body.scanId.trim()) {
    return { error: "scanId is required.", status: 400 };
  }

  if (!isValidImageDataUrl(body.frameBase64)) {
    return { error: "frameBase64 must be a base64 image data URL.", status: 400 };
  }

  if (isOversizedFrame(body.frameBase64)) {
    return { error: "frameBase64 is too large.", status: 413 };
  }

  if (typeof body.transcriptSoFar !== "string") {
    return { error: "transcriptSoFar must be a string.", status: 400 };
  }

  if (!Array.isArray(body.currentCatalog)) {
    return { error: "currentCatalog must be an array.", status: 400 };
  }

  if (!body.merchantContext || typeof body.merchantContext.name !== "string") {
    return { error: "merchantContext is required.", status: 400 };
  }

  return body;
}
