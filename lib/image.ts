import { askModes, type AskChatMessage, type AskMode, type AskRequest } from "@/lib/types";

const MAX_FRAME_CHARS = 7_000_000;
const MAX_QUESTION_CHARS = 1_500;
const MAX_HISTORY_MESSAGES = 12;

export function isValidImageDataUrl(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^data:image\/(?:jpeg|jpg|png|webp);base64,[a-zA-Z0-9+/=]+$/.test(value)
  );
}

export function isOversizedImageDataUrl(value: string) {
  return value.length > MAX_FRAME_CHARS;
}

export function isAskMode(value: unknown): value is AskMode {
  return typeof value === "string" && askModes.includes(value as AskMode);
}

function normalizeHistory(value: unknown): AskChatMessage[] | undefined {
  if (!Array.isArray(value)) return undefined;

  const messages = value
    .slice(-MAX_HISTORY_MESSAGES)
    .map((item): AskChatMessage | null => {
      if (!item || typeof item !== "object") return null;

      const raw = item as Record<string, unknown>;
      if ((raw.role !== "user" && raw.role !== "assistant") || typeof raw.content !== "string") {
        return null;
      }

      const content = raw.content.trim().slice(0, 2_000);
      if (!content) return null;

      return {
        role: raw.role,
        content
      };
    })
    .filter((item): item is AskChatMessage => Boolean(item));

  return messages.length ? messages : undefined;
}

export function validateAskRequestBody(
  value: unknown
): AskRequest | { error: string; status: 400 | 413 } {
  if (!value || typeof value !== "object") {
    return { error: "Request body must be a JSON object.", status: 400 };
  }

  const body = value as Record<string, unknown>;
  const question = typeof body.question === "string" ? body.question.trim() : "";

  if (!question) {
    return { error: "Please ask a question first.", status: 400 };
  }

  if (question.length > MAX_QUESTION_CHARS) {
    return { error: "Question is too long. Please ask something shorter.", status: 400 };
  }

  if (!isValidImageDataUrl(body.frameBase64)) {
    return { error: "frameBase64 must be a base64 image data URL.", status: 400 };
  }

  if (isOversizedImageDataUrl(body.frameBase64)) {
    return { error: "frameBase64 is too large.", status: 413 };
  }

  return {
    question,
    frameBase64: body.frameBase64,
    mode: isAskMode(body.mode) ? body.mode : "general",
    chatHistory: normalizeHistory(body.chatHistory)
  };
}
