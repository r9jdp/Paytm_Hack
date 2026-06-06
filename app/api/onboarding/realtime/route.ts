import { NextResponse } from "next/server";

export const runtime = "nodejs";

const realtimeInstructions = `You are the voice layer for a merchant onboarding prototype.

The app controls the onboarding stages and may ask you to say exact scripted prompts.
Keep all spontaneous responses short and helpful.
Guide the user through product inventory capture only.
When asked to speak exact text, say only that text.`;

function getRealtimeModel() {
  const configuredModel = process.env.OPENAI_REALTIME_MODEL?.trim();
  if (!configuredModel || configuredModel === "gpt-realtime-2") {
    return "gpt-realtime";
  }

  return configuredModel;
}

function getOpenAIErrorMessage(value: unknown) {
  if (!value || typeof value !== "object") return null;

  const error = (value as { error?: unknown }).error;
  if (!error || typeof error !== "object") return null;

  const message = (error as { message?: unknown }).message;
  return typeof message === "string" && message.trim() ? message.trim() : null;
}

export async function GET() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey?.trim()) {
    return NextResponse.json({ error: "OPENAI_API_KEY is not configured." }, { status: 500 });
  }

  const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "OpenAI-Safety-Identifier": "point-ask-onboarding-prototype"
    },
    body: JSON.stringify({
      session: {
        type: "realtime",
        model: getRealtimeModel(),
        instructions: realtimeInstructions,
        output_modalities: ["audio"],
        audio: {
          input: {
            transcription: {
              model: "whisper-1",
              language: "en",
              prompt: "Merchant onboarding conversation about shop product inventory."
            },
            turn_detection: {
              type: "server_vad",
              silence_duration_ms: 700,
              create_response: true,
              interrupt_response: true
            }
          },
          output: {
            voice: "marin"
          }
        }
      }
    })
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = getOpenAIErrorMessage(data);

    return NextResponse.json(
      {
        error: message ? `Failed to create realtime session: ${message}` : "Failed to create realtime session.",
        details: data
      },
      { status: response.status }
    );
  }

  return NextResponse.json(data);
}
