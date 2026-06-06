import styles from "../styles.module.css";

export function ConfidencePill({ confidence }: { confidence: number }) {
  const percent = Math.round(confidence * 100);
  const tone = confidence >= 0.85 ? styles.high : confidence >= 0.75 ? styles.medium : styles.low;

  return <span className={`${styles.confidencePill} ${tone}`}>{percent}% confidence</span>;
}
