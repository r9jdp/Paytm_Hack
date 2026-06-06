export const askModes = ["general", "extract", "catalog"] as const;

export type AskMode = (typeof askModes)[number];

export type ExtractedItem = {
  name: string;
  detail?: string;
  price?: string | null;
  confidence?: number;
};

export type AskResponse = {
  answer: string;
  observations?: string[];
  extractedItems?: ExtractedItem[];
};

export type AskChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AskRequest = {
  question: string;
  frameBase64: string;
  mode: AskMode;
  chatHistory?: AskChatMessage[];
};

export type ChatItem = {
  id: string;
  question: string;
  answer: string;
  frameThumbnail: string;
  createdAt: string;
  mode: AskMode;
  observations?: string[];
  extractedItems?: ExtractedItem[];
  sourceType?: "camera" | "upload";
};
