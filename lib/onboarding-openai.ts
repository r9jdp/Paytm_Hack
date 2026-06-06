import OpenAI from "openai";

import { sanitizeInventoryItems } from "@/lib/onboarding-validation";
import type {
  InventoryExtraction,
  OnboardingExtractionRequest,
  OnboardingExtractionResponse
} from "@/lib/types";

const inventorySchema = {
  type: "object",
  additionalProperties: false,
  required: ["items", "transcriptSummary", "confidence", "isComplete", "warnings"],
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "name", "category", "quantity", "unit", "packSize", "price", "evidence", "confidence"],
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          category: { type: ["string", "null"] },
          quantity: { type: ["number", "null"] },
          unit: { type: ["string", "null"] },
          packSize: { type: ["string", "null"] },
          price: { type: ["string", "null"] },
          evidence: {
            type: "object",
            additionalProperties: false,
            required: ["visual", "voice"],
            properties: {
              visual: { type: ["string", "null"] },
              voice: { type: ["string", "null"] }
            }
          },
          confidence: { type: "number" }
        }
      }
    },
    transcriptSummary: { type: ["string", "null"] },
    confidence: { type: "number" },
    isComplete: { type: "boolean" },
    warnings: {
      type: "array",
      items: { type: "string" }
    }
  }
};

const inventoryInstruction = `You extract store inventory from a camera frame plus spoken transcript.

Rules:
- Merge visible product labels with spoken quantities.
- Do not invent products, quantities, prices, brands, or pack sizes.
- Prefer the transcript for quantity and unit.
- Prefer the frame for product names, categories, packaging, pack sizes, and visible prices.
- If price is not visible or spoken, return null.
- Mark isComplete true when at least one inventory item has a name and quantity, or when the transcript says the user is done.`;

function createClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  return new OpenAI({ apiKey });
}

function parseJsonObject(outputText: string) {
  try {
    return JSON.parse(outputText) as unknown;
  } catch {
    return null;
  }
}

export async function extractInventory(body: OnboardingExtractionRequest): Promise<InventoryExtraction> {
  const existingItems = body.previousState?.inventory ?? [];
  const response = await createClient().responses.create({
    model: process.env.OPENAI_VISION_MODEL || "gpt-4.1-mini",
    temperature: 0.05,
    input: [
      {
        role: "system",
        content: [{ type: "input_text", text: inventoryInstruction }]
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: [
              "Extract visible/spoken inventory from this frame and transcript.",
              `Voice transcript so far: ${body.transcript || "(none)"}`,
              `Existing inventory to merge with: ${JSON.stringify(existingItems)}`,
              "Return only the requested JSON shape."
            ].join("\n")
          },
          { type: "input_image", image_url: body.frameBase64, detail: "high" }
        ]
      }
    ],
    text: {
      format: {
        type: "json_schema",
        name: "inventory_capture",
        strict: true,
        schema: inventorySchema
      }
    }
  });

  const parsed = parseJsonObject(response.output_text ?? "");
  const raw = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};

  return {
    items: sanitizeInventoryItems(raw.items),
    transcriptSummary: typeof raw.transcriptSummary === "string" ? raw.transcriptSummary : null,
    confidence: typeof raw.confidence === "number" ? Math.max(0, Math.min(1, raw.confidence)) : 0,
    isComplete: Boolean(raw.isComplete),
    warnings: Array.isArray(raw.warnings)
      ? raw.warnings.filter((item): item is string => typeof item === "string" && Boolean(item.trim()))
      : []
  };
}

export async function extractOnboardingFrame(
  body: OnboardingExtractionRequest
): Promise<OnboardingExtractionResponse> {
  return {
    stage: "inventory",
    inventory: await extractInventory(body)
  };
}
