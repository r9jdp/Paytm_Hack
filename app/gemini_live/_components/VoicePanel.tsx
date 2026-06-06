"use client";

import { Mic, MicOff, PencilLine } from "lucide-react";
import { useCallback } from "react";

import { useBrowserSpeechRecognition } from "../_hooks/useBrowserSpeechRecognition";
import { useGeminiLiveStore } from "../_state/scan-store";
import styles from "../styles.module.css";

export function VoicePanel() {
  const { state, dispatch } = useGeminiLiveStore();
  const appendSpeechText = useCallback(
    (text: string) => {
      if (!text) return;
      const prefix = state.transcriptSoFar.trim();
      dispatch({
        type: "SET_TRANSCRIPT",
        transcript: `${prefix ? `${prefix}\n` : ""}${text}`
      });
    },
    [dispatch, state.transcriptSoFar]
  );
  const speech = useBrowserSpeechRecognition(appendSpeechText);

  return (
    <section className={styles.voicePanel} aria-label="Transcript controls">
      <div className={styles.sectionHeading}>
        <PencilLine aria-hidden="true" size={18} />
        <div>
          <h2>Merchant transcript</h2>
          <p>Speak naturally or type what the merchant is saying.</p>
        </div>
      </div>

      <textarea
        className={styles.transcriptBox}
        onChange={(event) => dispatch({ type: "SET_TRANSCRIPT", transcript: event.target.value })}
        placeholder="Example: Amul Taaza 28 rupees, 20 packet. Maggi 14 rupees, 35 packets."
        rows={5}
        value={state.transcriptSoFar}
      />

      <div className={styles.voiceActions}>
        <button
          className={styles.secondaryAction}
          disabled={!speech.isSupported || speech.isListening}
          onClick={speech.start}
          type="button"
        >
          <Mic aria-hidden="true" size={16} />
          Listen
        </button>
        <button
          className={styles.secondaryAction}
          disabled={!speech.isListening}
          onClick={speech.stop}
          type="button"
        >
          <MicOff aria-hidden="true" size={16} />
          Stop voice
        </button>
      </div>

      {!speech.isSupported ? (
        <p className={styles.helperText}>Browser speech recognition is unavailable here. Manual input is active.</p>
      ) : null}
      {speech.error ? <p className={styles.helperText}>{speech.error}</p> : null}
    </section>
  );
}
