import { NextResponse } from "next/server";

import { getMockOnboardingExtraction } from "@/lib/onboarding-mock";
import { extractOnboardingFrame } from "@/lib/onboarding-openai";
import { validateOnboardingExtractionBody } from "@/lib/onboarding-validation";

export const runtime = "nodejs";

function shouldForceMock() {
  return process.env.NEXT_PUBLIC_ENABLE_MOCK_MODE?.toLowerCase() === "force";
}

export async function POST(request: Request) {
  const rawBody = await request.json().catch(() => null);
  const body = validateOnboardingExtractionBody(rawBody);

  if ("error" in body) {
    return NextResponse.json({ error: body.error }, { status: body.status });
  }

  if (shouldForceMock() || !process.env.OPENAI_API_KEY?.trim()) {
    return NextResponse.json(getMockOnboardingExtraction(body.stage));
  }

  try {
    return NextResponse.json(await extractOnboardingFrame(body));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown OpenAI request error.";
    console.error("/api/onboarding/extract failed:", message);

    const fallback = getMockOnboardingExtraction(body.stage);
    if (fallback.inventory) {
      fallback.inventory.warnings = [
        ...(fallback.inventory.warnings ?? []),
        `OpenAI extraction failed: ${message}`
      ];
    }

    return NextResponse.json(fallback);
  }
}
