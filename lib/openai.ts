import OpenAI from "openai";

import type { AskRequest, AskResponse, ExtractedItem } from "@/lib/types";

const systemInstruction = `You are Point & Ask AI, a visual assistant that answers questions about the user's current camera frame.

Rules:
- Use only what is visible in the image.
- Do not invent brands, prices, text, dates, or quantities.
- If the image is blurry, say so.
- If the answer is uncertain, say what is uncertain.
- If asked to extract products, return only products that are clearly visible or strongly implied by readable labels.
- If asked to read text, preserve visible text carefully.
- If asked for prices and prices are not visible, return price as null/Unknown.
- Keep answers concise and practical.`;

const responseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["answer", "observations", "extractedItems"],
  properties: {
    answer: { type: "string" },
    observations: {
      type: "array",
      items: { type: "string" }
    },
    extractedItems: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "detail", "price", "confidence"],
        properties: {
          name: { type: "string" },
          detail: { type: ["string", "null"] },
          price: { type: ["string", "null"] },
          confidence: { type: "number" }
        }
      }
    }
  }
};

function modeInstruction(mode: AskRequest["mode"]) {
  if (mode === "extract") {
    return "Mode: Extract Text. Focus on readable text, labels, menus, prices, dates, names, and numbers. Preserve visible text carefully and say when text is unclear.";
  }

  if (mode === "catalog") {
    return "Mode: Product/Shelf. List clearly visible products or shelf/menu items. Extract names, visible details, prices only when readable, and confidence from 0 to 1.";
  }

  return "Mode: General. Answer the user's question naturally using only visible evidence from the image.";
}

function buildUserPrompt(body: AskRequest) {
  const history = body.chatHistory?.length
    ? body.chatHistory.map((item) => `${item.role}: ${item.content}`).join("\n")
    : "(none)";

  return [
    modeInstruction(body.mode),
    `Question: ${body.question}`,
    "Recent local chat context:",
    history,
    "",
    "Return JSON with this shape:",
    '{ "answer": string, "observations": string[], "extractedItems": [{ "name": string, "detail": string, "price": string | null, "confidence": number }] }'
  ].join("\n");
}

function asConfidence(value: unknown) {
  if (typeof value !== "number" || Number.isNaN(value)) return undefined;
  return Math.max(0, Math.min(1, value));
}

function sanitizeExtractedItems(value: unknown): ExtractedItem[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item): ExtractedItem | null => {
      if (!item || typeof item !== "object") return null;

      const raw = item as Record<string, unknown>;
      const name = typeof raw.name === "string" ? raw.name.trim() : "";
      if (!name) return null;

      return {
        name,
        detail: typeof raw.detail === "string" && raw.detail.trim() ? raw.detail.trim() : undefined,
        price:
          typeof raw.price === "string" && raw.price.trim()
            ? raw.price.trim()
            : raw.price === null
              ? null
              : undefined,
        confidence: asConfidence(raw.confidence)
      };
    })
    .filter((item): item is ExtractedItem => Boolean(item));
}

function sanitizeAskResponse(value: unknown, rawAnswer: string): AskResponse {
  if (!value || typeof value !== "object") {
    return {
      answer: rawAnswer,
      observations: [],
      extractedItems: []
    };
  }

  const raw = value as Record<string, unknown>;
  const answer = typeof raw.answer === "string" && raw.answer.trim() ? raw.answer.trim() : rawAnswer;

  return {
    answer,
    observations: Array.isArray(raw.observations)
      ? raw.observations
          .filter((item): item is string => typeof item === "string" && Boolean(item.trim()))
          .map((item) => item.trim())
      : [],
    extractedItems: sanitizeExtractedItems(raw.extractedItems)
  };
}

export async function askOpenAIVision(body: AskRequest): Promise<AskResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const client = new OpenAI({ apiKey });
  const response = await client.responses.create({
    model: process.env.OPENAI_VISION_MODEL || "gpt-4.1-mini",
    temperature: 0.1,
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: systemInstruction
          }
        ]
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: buildUserPrompt(body)
          },
          {
            type: "input_image",
            image_url: body.frameBase64,
            detail: "high"
          }
        ]
      }
    ],
    text: {
      format: {
        type: "json_schema",
        name: "point_ask_answer",
        strict: true,
        schema: responseSchema
      }
    }
  });

  const rawAnswer = response.output_text?.trim() || "I analyzed the frame, but the response was empty.";

  try {
    return sanitizeAskResponse(JSON.parse(rawAnswer), rawAnswer);
  } catch {
    return sanitizeAskResponse(null, rawAnswer);
  }
}
