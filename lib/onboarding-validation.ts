import {
  type InventoryItem,
  type OnboardingExtractionRequest,
  type OnboardingExtractionStage
} from "@/lib/types";

const MAX_FRAME_CHARS = 7_000_000;
const MAX_TRANSCRIPT_CHARS = 12_000;

export function isOnboardingStage(value: unknown): value is OnboardingExtractionStage {
  return value === "inventory";
}

export function isValidOnboardingImage(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^data:image\/(?:jpeg|jpg|png|webp);base64,[a-zA-Z0-9+/=]+$/.test(value)
  );
}

function clampConfidence(value: unknown) {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function asStringOrNull(value: unknown) {
  if (typeof value === "string" && value.trim()) return value.trim();
  return null;
}

function asOptionalNumber(value: unknown) {
  if (value === null || value === undefined) return null;
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  return value;
}

export function sanitizeInventoryItems(value: unknown): InventoryItem[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item): InventoryItem | null => {
      if (!item || typeof item !== "object") return null;

      const raw = item as Record<string, unknown>;
      const evidence = raw.evidence && typeof raw.evidence === "object" ? (raw.evidence as Record<string, unknown>) : {};
      const name = asStringOrNull(raw.name);
      if (!name) return null;

      return {
        id: asStringOrNull(raw.id) ?? `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`,
        name,
        category: asStringOrNull(raw.category),
        quantity: asOptionalNumber(raw.quantity),
        unit: asStringOrNull(raw.unit),
        packSize: asStringOrNull(raw.packSize),
        price: asStringOrNull(raw.price),
        evidence: {
          visual: asStringOrNull(evidence.visual),
          voice: asStringOrNull(evidence.voice)
        },
        confidence: clampConfidence(raw.confidence)
      };
    })
    .filter((item): item is InventoryItem => Boolean(item));
}

export function validateOnboardingExtractionBody(
  value: unknown
): OnboardingExtractionRequest | { error: string; status: 400 | 413 } {
  if (!value || typeof value !== "object") {
    return { error: "Request body must be a JSON object.", status: 400 };
  }

  const body = value as Record<string, unknown>;

  if (!isOnboardingStage(body.stage)) {
    return { error: "stage must be inventory.", status: 400 };
  }

  if (!isValidOnboardingImage(body.frameBase64)) {
    return { error: "frameBase64 must be a base64 image data URL.", status: 400 };
  }

  if (body.frameBase64.length > MAX_FRAME_CHARS) {
    return { error: "frameBase64 is too large.", status: 413 };
  }

  const transcript = typeof body.transcript === "string" ? body.transcript.slice(0, MAX_TRANSCRIPT_CHARS) : "";
  const previousState =
    body.previousState && typeof body.previousState === "object"
      ? (body.previousState as OnboardingExtractionRequest["previousState"])
      : undefined;

  return {
    stage: body.stage,
    frameBase64: body.frameBase64,
    transcript,
    previousState
  };
}
