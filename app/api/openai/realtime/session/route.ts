import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getOpenAISafetyIdentifier, getRealtimeSessionConfig } from "@/lib/openai-realtime";

export const runtime = "nodejs";

export async function POST() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!session.user.role) {
    return NextResponse.json({ error: "Choose buyer or merchant before starting vision." }, { status: 403 });
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY is not configured." }, { status: 500 });
  }

  const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "OpenAI-Safety-Identifier": getOpenAISafetyIdentifier(session.user.id)
    },
    body: JSON.stringify(getRealtimeSessionConfig())
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    return NextResponse.json(
      { error: "Failed to create OpenAI realtime session.", details: data },
      { status: response.status }
    );
  }

  return NextResponse.json(data);
}
