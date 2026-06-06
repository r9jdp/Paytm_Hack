import type { Metadata } from "next";

import { OnboardingAgentApp } from "@/components/OnboardingAgentApp";

export const metadata: Metadata = {
  title: "Voice-Led Merchant Onboarding",
  description: "Capture KYC and inventory through one voice-led camera flow."
};

export default function GeminiPage() {
  return <OnboardingAgentApp />;
}
