import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Camera, CircleCheckBig } from "lucide-react";

import { OnboardingAgentApp } from "@/components/OnboardingAgentApp";

export const metadata: Metadata = {
  title: "Gemini Merchant Onboarding",
  description: "Capture product inventory through one voice-led camera flow."
};

export default function GeminiPage() {
  return (
    <div className="gemini-page-shell">
      <section className="gemini-page-intro" aria-labelledby="gemini-title">
        <p className="eyebrow">Merchant onboarding lane</p>
        <h1 id="gemini-title">Voice + camera inventory onboarding</h1>
        <p className="lede">
          Capture shelf-facing inventory fast, keep a clear audit trail, and push products into the
          storefront with one guided flow.
        </p>
        <div className="gemini-meta">
          <div className="gemini-chip">
            <CircleCheckBig aria-hidden="true" size={16} />
            Local export preview
          </div>
          <div className="gemini-chip">
            <Camera aria-hidden="true" size={16} />
            Guided camera capture
          </div>
          <Link className="secondary-button" href="/">
            <ArrowLeft aria-hidden="true" size={16} />
            Back to home
          </Link>
        </div>
      </section>

      <OnboardingAgentApp />
    </div>
  );
}
