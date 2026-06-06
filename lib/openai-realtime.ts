import { createHash } from "node:crypto";

export function getOpenAISafetyIdentifier(userId: string) {
  const salt = process.env.AUTH_SECRET ?? "development";
  return createHash("sha256").update(`${salt}:${userId}`).digest("hex");
}

function getRealtimeModel() {
  const configuredModel = process.env.OPENAI_REALTIME_MODEL?.trim();
  if (!configuredModel) {
    return "gpt-realtime-2";
  }

  return configuredModel;
}

export function getRealtimeSessionConfig() {
  return {
    session: {
      type: "realtime",
      model: getRealtimeModel(),
      output_modalities: ["audio"],
      instructions:
        "You are a realtime vision assistant for a commerce PWA. Wait for the application to provide task-specific instructions.",
      audio: {
        output: {
          voice: "marin"
        }
      }
    }
  };
}
