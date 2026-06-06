import { Bot, MessageCircleWarning } from "lucide-react";

import { useGeminiLiveStore } from "../_state/scan-store";
import styles from "../styles.module.css";

export function AssistantPanel() {
  const { state } = useGeminiLiveStore();

  return (
    <section className={styles.assistantPanel} aria-label="AI assistant">
      <div className={styles.assistantHeader}>
        <span className={styles.assistantIcon}>
          <Bot aria-hidden="true" size={18} />
        </span>
        <span>OpenStore scan assistant</span>
      </div>
      <p>{state.assistantMessage}</p>
      {state.followUpQuestion ? (
        <div className={styles.followUp}>
          <MessageCircleWarning aria-hidden="true" size={16} />
          <span>{state.followUpQuestion}</span>
        </div>
      ) : null}
      {state.warnings.length ? (
        <ul className={styles.warningList}>
          {state.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
