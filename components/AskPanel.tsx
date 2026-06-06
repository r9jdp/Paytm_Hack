"use client";

import { Send } from "lucide-react";
import type { FormEvent } from "react";

import { ModeSelector } from "@/components/ModeSelector";
import { VoiceInput } from "@/components/VoiceInput";
import type { AskMode } from "@/lib/types";

import styles from "./point-ask.module.css";

type AskPanelProps = {
  disabled: boolean;
  isAsking: boolean;
  loadingLabel: string;
  mode: AskMode;
  onAsk: () => void;
  onModeChange: (mode: AskMode) => void;
  onQuestionChange: (question: string) => void;
  onVoiceTranscript: (transcript: string) => void;
  question: string;
};

const placeholders: Record<AskMode, string> = {
  general: "What do you see?",
  extract: "What is written here?",
  catalog: "List the products and visible prices."
};

export function AskPanel({
  disabled,
  isAsking,
  loadingLabel,
  mode,
  onAsk,
  onModeChange,
  onQuestionChange,
  onVoiceTranscript,
  question
}: AskPanelProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onAsk();
  }

  return (
    <section className={styles.card} aria-label="Ask a question">
      <div className={styles.cardHeader}>
        <div>
          <p className={styles.cardEyebrow}>Question Card</p>
          <h2>Ask something</h2>
        </div>
      </div>

      <ModeSelector mode={mode} onModeChange={onModeChange} />

      <form className={styles.askForm} onSubmit={handleSubmit}>
        <label className={styles.inputLabel} htmlFor="point-ask-question">
          Question
        </label>
        <textarea
          className={styles.questionInput}
          disabled={disabled}
          id="point-ask-question"
          onChange={(event) => onQuestionChange(event.target.value)}
          placeholder={placeholders[mode]}
          rows={3}
          value={question}
        />

        <div className={styles.askActions}>
          <VoiceInput disabled={disabled} onTranscript={onVoiceTranscript} />
          <button
            className={styles.primaryButton}
            disabled={disabled || !question.trim()}
            type="submit"
          >
            <Send aria-hidden="true" size={18} />
            {isAsking ? loadingLabel : "Ask AI"}
          </button>
        </div>
      </form>
    </section>
  );
}
