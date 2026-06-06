"use client";

import { Check, Copy, Download } from "lucide-react";
import { useState } from "react";

import type { StorefrontExport } from "@/lib/types";

import styles from "./point-ask.module.css";

type StorefrontJsonPanelProps = {
  payload: StorefrontExport | null;
};

export function StorefrontJsonPanel({ payload }: StorefrontJsonPanelProps) {
  const [copied, setCopied] = useState(false);

  if (!payload) return null;

  const safePayload = payload;
  const json = JSON.stringify(safePayload, null, 2);

  async function copyJson() {
    await navigator.clipboard.writeText(json);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  function downloadJson() {
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `storefront-export-${safePayload.id}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className={styles.exportPanel} aria-label="Storefront JSON export">
      <div className={styles.exportHeader}>
        <div>
          <span>Storefront JSON</span>
          <h2>Captured onboarding export</h2>
        </div>
        <div className={styles.exportActions}>
          <button className={styles.secondaryButton} onClick={() => void copyJson()} type="button">
            {copied ? <Check aria-hidden="true" size={16} /> : <Copy aria-hidden="true" size={16} />}
            {copied ? "Copied" : "Copy"}
          </button>
          <button className={styles.primaryButton} onClick={downloadJson} type="button">
            <Download aria-hidden="true" size={16} />
            Download JSON
          </button>
        </div>
      </div>
      <pre className={styles.jsonPreview}>{json}</pre>
    </section>
  );
}
