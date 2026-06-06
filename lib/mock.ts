import type { AskMode, AskResponse } from "@/lib/types";

export function getMockAskResponse(mode: AskMode): AskResponse {
  if (mode === "extract") {
    return {
      answer:
        "I can read parts of the visible text, but the frame is not clear enough to extract everything reliably. Move closer, hold steady, and ask again.",
      observations: [
        "Mock mode is active or the AI request failed.",
        "Use a sharper close-up for OCR-like questions."
      ],
      extractedItems: []
    };
  }

  if (mode === "catalog") {
    return {
      answer:
        "I can see a shelf-like scene with packaged products. Some labels appear visible, but prices should only be trusted when they are readable in the frame.",
      observations: [
        "Mock mode is active or the AI request failed.",
        "Unknown prices are left blank instead of invented."
      ],
      extractedItems: [
        {
          name: "Amul Taaza",
          detail: "Milk packet, likely 500ml",
          price: "₹28",
          confidence: 0.86
        },
        {
          name: "Maggi",
          detail: "Instant noodles packet",
          price: null,
          confidence: 0.78
        }
      ]
    };
  }

  return {
    answer:
      "I can see a scene through the camera frame. Some details may be unclear, so move closer or improve lighting if you want a more precise answer.",
    observations: [
      "Mock mode is active or the AI request failed.",
      "The real answer will use the current frame when OPENAI_API_KEY is configured."
    ],
    extractedItems: []
  };
}
