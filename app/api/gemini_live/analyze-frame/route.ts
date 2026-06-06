import { NextResponse } from "next/server";

import { getMockAnalyzeResponse } from "@/app/gemini_live/_lib/mock-data";
import { sanitizeCandidates, validateAnalyzeFrameBody } from "@/app/gemini_live/_lib/validation";
import type { AnalyzeFrameResponse } from "@/app/gemini_live/_lib/types";

export const runtime = "nodejs";

const extractionSchema = {
  type: "object",
  additionalProperties: false,
  required: ["products", "followUpQuestion", "assistantMessage"],
  properties: {
    products: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "brand", "packSize", "price", "inventory", "category", "evidence", "confidence"],
        properties: {
          name: { type: "string" },
          brand: { type: ["string", "null"] },
          packSize: { type: ["string", "null"] },
          price: { type: ["number", "null"] },
          inventory: { type: ["number", "null"] },
          category: {
            type: "string",
            enum: [
              "Dairy",
              "Bakery",
              "Snacks",
              "Instant Food",
              "Beverages",
              "Personal Care",
              "Household",
              "Medicine",
              "Other"
            ]
          },
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
    followUpQuestion: { type: ["string", "null"] },
    assistantMessage: { type: "string" }
  }
};

function shouldUseMockMode() {
  return process.env.NEXT_PUBLIC_ENABLE_MOCK_MODE === "true" || !process.env.OPENAI_API_KEY;
}

function extractOutputText(data: unknown) {
  const response = data as {
    output_text?: unknown;
    output?: Array<{ content?: Array<{ type?: string; text?: unknown }> }>;
  };

  if (typeof response.output_text === "string") {
    return response.output_text;
  }

  for (const item of response.output ?? []) {
    for (const content of item.content ?? []) {
      if (
        (content.type === "output_text" || content.type === "text") &&
        typeof content.text === "string"
      ) {
        return content.text;
      }
    }
  }

  return null;
}

async function callOpenAI(body: ReturnType<typeof validateAnalyzeFrameBody>): Promise<AnalyzeFrameResponse> {
  if ("error" in body) {
    throw new Error(body.error);
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.OPENAI_VISION_MODEL || "gpt-4.1-mini",
      temperature: 0.1,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text:
                "You are a catalog extraction assistant for Indian small merchants. Return strict JSON only. Do not hallucinate. Prefer voice evidence for price and stock. Prefer visual evidence for brand, product name, and pack size. If uncertain, lower confidence and ask one short Hindi-English follow-up question."
            }
          ]
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: [
                `Merchant: ${JSON.stringify(body.merchantContext)}`,
                `Transcript so far: ${body.transcriptSoFar || "(empty)"}`,
                `Current catalog: ${JSON.stringify(body.currentCatalog)}`,
                "Extract only products visible or spoken in this scan context."
              ].join("\n")
            },
            {
              type: "input_image",
              image_url: body.frameBase64,
              detail: "low"
            }
          ]
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "shop_catalog_frame",
          strict: true,
          schema: extractionSchema
        }
      }
    })
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(`OpenAI request failed with status ${response.status}.`);
  }

  const outputText = extractOutputText(data);
  if (!outputText) {
    throw new Error("OpenAI response did not include output text.");
  }

  const parsed = JSON.parse(outputText) as Partial<AnalyzeFrameResponse>;
  const products = sanitizeCandidates(parsed.products);

  return {
    mode: "ai",
    products,
    followUpQuestion: typeof parsed.followUpQuestion === "string" ? parsed.followUpQuestion : null,
    assistantMessage:
      typeof parsed.assistantMessage === "string"
        ? parsed.assistantMessage
        : "I analyzed the frame. Please review any low-confidence fields.",
    warnings: products.length === 0 ? ["No confident products were extracted from this frame."] : undefined
  };
}

export async function POST(request: Request) {
  const rawBody = await request.json().catch(() => null);
  const body = validateAnalyzeFrameBody(rawBody);

  if ("error" in body) {
    return NextResponse.json({ error: body.error }, { status: body.status });
  }

  if (shouldUseMockMode()) {
    return NextResponse.json(getMockAnalyzeResponse());
  }

  try {
    return NextResponse.json(await callOpenAI(body));
  } catch {
    return NextResponse.json({
      ...getMockAnalyzeResponse(),
      warnings: [
        "AI analysis failed, so mock shelf data was returned for demo continuity."
      ]
    });
  }
}
