"use client";

import { Volume2 } from "lucide-react";

import type { AskResponse, ExtractedItem } from "@/lib/types";

import styles from "./point-ask.module.css";

type AnswerPanelProps = {
  error: string | null;
  isLoading: boolean;
  loadingLabel: string;
  response: AskResponse | null;
};

function formatConfidence(item: ExtractedItem) {
  return typeof item.confidence === "number" ? item.confidence.toFixed(2) : "Unknown";
}

export function AnswerPanel({ error, isLoading, loadingLabel, response }: AnswerPanelProps) {
  function speakAnswer() {
    if (!response?.answer || typeof speechSynthesis === "undefined") return;

    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(response.answer);
    utterance.rate = 0.96;
    speechSynthesis.speak(utterance);
  }

  return (
    <section className={styles.card} aria-label="AI answer">
      <div className={styles.cardHeader}>
        <div>
          <p className={styles.cardEyebrow}>Answer Card</p>
          <h2>AI Answer</h2>
        </div>
        {response?.answer ? (
          <button className={styles.secondaryButton} onClick={speakAnswer} type="button">
            <Volume2 aria-hidden="true" size={16} />
            Speak Answer
          </button>
        ) : null}
      </div>

      {isLoading ? (
        <div className={styles.loadingBox}>
          <span className={styles.loader} aria-hidden="true" />
          <p>{loadingLabel}</p>
        </div>
      ) : null}

      {error ? <p className={styles.inlineError}>{error}</p> : null}

      {!isLoading && !error && !response ? (
        <p className={styles.emptyCopy}>
          Start the camera or upload an image, then ask what you want to know about the scene.
        </p>
      ) : null}

      {response ? (
        <div className={styles.answerBody}>
          <p>{response.answer}</p>

          {response.observations?.length ? (
            <ul className={styles.observationList}>
              {response.observations.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}

          {response.extractedItems?.length ? (
            <div className={styles.tableWrap}>
              <h3>Detected Items</h3>
              <table className={styles.itemsTable}>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Detail</th>
                    <th>Price</th>
                    <th>Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {response.extractedItems.map((item, index) => (
                    <tr key={`${item.name}-${index}`}>
                      <td>{item.name}</td>
                      <td>{item.detail || "Unknown"}</td>
                      <td>{item.price || "Unknown"}</td>
                      <td>{formatConfidence(item)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
