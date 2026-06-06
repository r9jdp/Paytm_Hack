"use client";

import { FileText, PackageSearch, Sparkles } from "lucide-react";

import { askModes, type AskMode } from "@/lib/types";

import styles from "./point-ask.module.css";

type ModeSelectorProps = {
  mode: AskMode;
  onModeChange: (mode: AskMode) => void;
};

const modeLabels: Record<AskMode, string> = {
  general: "General",
  extract: "Extract Text",
  catalog: "Product/Shelf"
};

const modeIcons = {
  general: Sparkles,
  extract: FileText,
  catalog: PackageSearch
} satisfies Record<AskMode, typeof Sparkles>;

export function ModeSelector({ mode, onModeChange }: ModeSelectorProps) {
  return (
    <div className={styles.modeSelector} role="tablist" aria-label="Answer mode">
      {askModes.map((option) => {
        const Icon = modeIcons[option];
        const isActive = option === mode;

        return (
          <button
            aria-selected={isActive}
            className={`${styles.modeButton} ${isActive ? styles.modeButtonActive : ""}`}
            key={option}
            onClick={() => onModeChange(option)}
            role="tab"
            type="button"
          >
            <Icon aria-hidden="true" size={16} />
            {modeLabels[option]}
          </button>
        );
      })}
    </div>
  );
}
