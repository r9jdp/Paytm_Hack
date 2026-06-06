import { CheckCircle2, CircleAlert, Package, Trash2 } from "lucide-react";

import type { CatalogItem } from "../_lib/types";
import { useGeminiLiveStore } from "../_state/scan-store";
import styles from "../styles.module.css";
import { ConfidencePill } from "./ConfidencePill";

export function ProductCard({ item }: { item: CatalogItem }) {
  const { dispatch } = useGeminiLiveStore();
  const sourceLabel = [item.sources.voice ? "voice" : null, item.sources.visual ? "vision" : null]
    .filter(Boolean)
    .join(" + ");

  return (
    <article className={styles.productCard}>
      <div className={styles.productTop}>
        <span className={styles.productIcon}>
          <Package aria-hidden="true" size={18} />
        </span>
        <div>
          <h3>{[item.brand, item.name, item.packSize].filter(Boolean).join(" ")}</h3>
          <p>
            {item.price !== null ? `Rs ${item.price}` : "Price missing"} ·{" "}
            {item.inventory !== null ? `${item.inventory} units` : "Stock missing"}
          </p>
        </div>
      </div>

      <div className={styles.productMeta}>
        <span className={styles.categoryChip}>{item.category}</span>
        <ConfidencePill confidence={item.confidence} />
        <span className={`${styles.statusChip} ${styles[item.status]}`}>{item.status.replace("_", " ")}</span>
      </div>

      {sourceLabel ? <p className={styles.sourceLine}>Source: {sourceLabel}</p> : null}

      {item.reviewNotes.length ? (
        <div className={styles.reviewNotes}>
          <CircleAlert aria-hidden="true" size={16} />
          <span>{item.reviewNotes.join(" ")}</span>
        </div>
      ) : null}

      <div className={styles.cardActions}>
        <button
          className={styles.smallButton}
          onClick={() => dispatch({ type: "CONFIRM_ITEM", id: item.id })}
          type="button"
        >
          <CheckCircle2 aria-hidden="true" size={16} />
          Confirm
        </button>
        <button
          className={styles.smallButtonDanger}
          onClick={() => dispatch({ type: "DELETE_ITEM", id: item.id })}
          type="button"
        >
          <Trash2 aria-hidden="true" size={16} />
          Delete
        </button>
      </div>
    </article>
  );
}
