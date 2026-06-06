import { NextResponse } from "next/server";

import { validateAskRequestBody } from "@/lib/image";
import { getMockAskResponse } from "@/lib/mock";
import { askOpenAIVision } from "@/lib/openai";

export const runtime = "nodejs";

function shouldUseMockMode() {
  const mockSetting = process.env.NEXT_PUBLIC_ENABLE_MOCK_MODE?.toLowerCase();

  return mockSetting === "force" || !process.env.OPENAI_API_KEY?.trim();
}

export async function POST(request: Request) {
  const rawBody = await request.json().catch(() => null);
  const body = validateAskRequestBody(rawBody);

  if ("error" in body) {
    return NextResponse.json({ error: body.error }, { status: body.status });
  }

  if (shouldUseMockMode()) {
    return NextResponse.json(getMockAskResponse(body.mode));
  }

  try {
    return NextResponse.json(await askOpenAIVision(body));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown OpenAI request error.";
    console.error("/api/ask OpenAI request failed:", message);

    return NextResponse.json({
      ...getMockAskResponse(body.mode),
      observations: [
        "AI analysis failed, so a mock answer was returned for demo continuity.",
        `OpenAI error: ${message}`,
        "Try again with a clearer frame or check the server API key."
      ]
    });
  }
}
