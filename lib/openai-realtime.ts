import { createHash } from "node:crypto";

export function getOpenAISafetyIdentifier(userId: string) {
  const salt = process.env.AUTH_SECRET ?? "development";
  return createHash("sha256").update(`${salt}:${userId}`).digest("hex");
}

export function getRealtimeSessionConfig() {
  return {
    session: {
      type: "realtime",
      model: process.env.OPENAI_REALTIME_MODEL ?? "gpt-realtime-2",
      instructions:
        "You are a realtime vision assistant for a commerce PWA. Wait for the application to provide task-specific instructions."
    }
  };
}
