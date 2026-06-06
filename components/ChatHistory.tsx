"use client";

import { Trash2 } from "lucide-react";

import type { ChatItem } from "@/lib/types";

import styles from "./point-ask.module.css";

type ChatHistoryProps = {
  items: ChatItem[];
  onClear: () => void;
};

function HistoryThumbnail({ src }: { src: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img className={styles.historyThumb} src={src} alt="" />;
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "short"
  });
}

export function ChatHistory({ items, onClear }: ChatHistoryProps) {
  return (
    <section className={`${styles.card} ${styles.historyCard}`} aria-label="Chat history">
      <div className={styles.cardHeader}>
        <div>
          <p className={styles.cardEyebrow}>History Card</p>
          <h2>Chat History</h2>
        </div>
        <button className={styles.secondaryButton} disabled={!items.length} onClick={onClear} type="button">
          <Trash2 aria-hidden="true" size={16} />
          Clear History
        </button>
      </div>

      {items.length ? (
        <div className={styles.historyList}>
          {items.map((item) => (
            <article className={styles.historyItem} key={item.id}>
              <HistoryThumbnail src={item.frameThumbnail} />
              <div className={styles.historyText}>
                <div className={styles.historyMeta}>
                  <span>{item.mode.replace("_", " ")}</span>
                  <span>{item.sourceType === "upload" ? "Uploaded image" : "Camera frame"}</span>
                  <time dateTime={item.createdAt}>{formatTime(item.createdAt)}</time>
                </div>
                <p className={styles.historyQuestion}>Q: {item.question}</p>
                <p className={styles.historyAnswer}>A: {item.answer}</p>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className={styles.emptyCopy}>
          Your last 10 interactions will appear here automatically after you ask.
        </p>
      )}
    </section>
  );
}
