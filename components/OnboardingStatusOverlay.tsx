"use client";

import { CheckCircle2, FileScan, PackageSearch } from "lucide-react";

import type { InventoryItem, KycExtraction, OnboardingStage, TranscriptEntry } from "@/lib/types";

import styles from "./point-ask.module.css";

type OnboardingStatusOverlayProps = {
  inventory: InventoryItem[];
  isExtracting: boolean;
  kyc: KycExtraction | null;
  stage: OnboardingStage;
  transcript: TranscriptEntry[];
};

const stageLabels: Record<OnboardingStage, string> = {
  idle: "Start camera and voice",
  kyc_prompt: "Asking for KYC",
  kyc_scanning: "Scanning KYC",
  inventory_prompt: "Asking for inventory",
  inventory_scanning: "Capturing inventory",
  export_ready: "JSON export ready"
};

export function OnboardingStatusOverlay({
  inventory,
  isExtracting,
  kyc,
  stage,
  transcript
}: OnboardingStatusOverlayProps) {
  const latestTranscript = transcript.at(-1);

  return (
    <aside className={styles.statusPanel} aria-label="Onboarding status">
      <div className={styles.statusPanelHeader}>
        <span>{stageLabels[stage]}</span>
        {isExtracting ? <span className={styles.pulseDot}>Analyzing</span> : null}
      </div>

      <div className={styles.statusGrid}>
        <div className={styles.statusTile}>
          <FileScan aria-hidden="true" size={18} />
          <span>KYC</span>
          <strong>{kyc?.isComplete ? "Captured" : "Waiting"}</strong>
        </div>
        <div className={styles.statusTile}>
          <PackageSearch aria-hidden="true" size={18} />
          <span>Inventory</span>
          <strong>{inventory.length ? `${inventory.length} items` : "Waiting"}</strong>
        </div>
        <div className={styles.statusTile}>
          <CheckCircle2 aria-hidden="true" size={18} />
          <span>Export</span>
          <strong>{stage === "export_ready" ? "Ready" : "Pending"}</strong>
        </div>
      </div>

      <div className={styles.captionBox}>
        <span>{latestTranscript?.role ?? "assistant"}</span>
        <p>{latestTranscript?.text ?? "The assistant will guide you by voice."}</p>
      </div>
    </aside>
  );
}
