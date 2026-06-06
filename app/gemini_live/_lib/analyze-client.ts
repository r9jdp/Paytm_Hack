import type { AnalyzeFrameRequest, AnalyzeFrameResponse } from "./types";

export async function analyzeFrame(payload: AnalyzeFrameRequest): Promise<AnalyzeFrameResponse> {
  const response = await fetch("/api/gemini_live/analyze-frame", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data = (await response.json().catch(() => null)) as
    | (AnalyzeFrameResponse & { error?: string })
    | null;

  if (!response.ok) {
    throw new Error(data?.error ?? "Could not analyze the current frame.");
  }

  if (!data) {
    throw new Error("Analysis response was empty.");
  }

  return data;
}
