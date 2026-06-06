import type { Metadata } from "next";

import { OnboardingAgentApp } from "@/components/OnboardingAgentApp";

export const metadata: Metadata = {
  title: "Voice-Led Inventory Capture",
  description: "Capture product inventory through one voice-led camera flow."
};

export default function GeminiPage() {
  return <OnboardingAgentApp />;
}
