"use client";

import { Clipboard, Plus, RotateCcw, Save } from "lucide-react";
import { useMemo, useState } from "react";

import { catalogCategories, type CatalogCategory, type CatalogItem } from "../_lib/types";
import { useGeminiLiveStore } from "../_state/scan-store";
import styles from "../styles.module.css";

const emptyDraft = {
  name: "",
  brand: "",
  packSize: "",
  price: "",
  inventory: "",
  category: "Other" as CatalogCategory
};

export function CatalogReviewPanel() {
  const { state, dispatch } = useGeminiLiveStore();
  const [draft, setDraft] = useState(emptyDraft);
  const exportJson = useMemo(
    () =>
      JSON.stringify(
        {
          scanId: state.scanId,
          merchant: state.merchantContext,
          confirmedAt: new Date().toISOString(),
          catalog: state.catalog
        },
        null,
        2
      ),
    [state.catalog, state.merchantContext, state.scanId]
  );

  function updateItem(id: string, item: Partial<CatalogItem>) {
    dispatch({ type: "UPDATE_ITEM", id, item });
  }

  function addManualItem() {
    if (!draft.name.trim()) return;

    dispatch({
      type: "ADD_ITEM",
      item: {
        name: draft.name.trim(),
        brand: draft.brand.trim() || null,
        packSize: draft.packSize.trim() || null,
        price: draft.price ? Number(draft.price) : null,
        inventory: draft.inventory ? Number(draft.inventory) : null,
        category: draft.category,
        confidence: 1,
        sources: { voice: "Manually added by merchant." },
        status: "confirmed",
        reviewNotes: []
      }
    });
    setDraft(emptyDraft);
  }

  async function copyExport() {
    await navigator.clipboard?.writeText(exportJson);
  }

  return (
    <section className={styles.reviewPanel} aria-label="Catalog review">
      <div className={styles.sectionHeading}>
        <Save aria-hidden="true" size={18} />
        <div>
          <h2>Review catalog</h2>
          <p>Edit extracted fields, add missing products, and export the reviewed JSON.</p>
        </div>
      </div>

      <div className={styles.reviewList}>
        {state.catalog.length ? (
          state.catalog.map((item) => (
            <div className={styles.reviewRow} key={item.id}>
              <input
                aria-label="Product name"
                value={item.name}
                onChange={(event) => updateItem(item.id, { name: event.target.value })}
              />
              <input
                aria-label="Brand"
                value={item.brand ?? ""}
                onChange={(event) => updateItem(item.id, { brand: event.target.value || null })}
              />
              <input
                aria-label="Pack size"
                value={item.packSize ?? ""}
                onChange={(event) => updateItem(item.id, { packSize: event.target.value || null })}
              />
              <input
                aria-label="Price"
                inputMode="numeric"
                value={item.price ?? ""}
                onChange={(event) =>
                  updateItem(item.id, { price: event.target.value ? Number(event.target.value) : null })
                }
              />
              <input
                aria-label="Inventory"
                inputMode="numeric"
                value={item.inventory ?? ""}
                onChange={(event) =>
                  updateItem(item.id, { inventory: event.target.value ? Number(event.target.value) : null })
                }
              />
              <select
                aria-label="Category"
                value={item.category}
                onChange={(event) => updateItem(item.id, { category: event.target.value as CatalogCategory })}
              >
                {catalogCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          ))
        ) : (
          <p className={styles.emptyState}>No catalog items yet. Start scanning or use demo shelf data.</p>
        )}
      </div>

      <div className={styles.manualAdd}>
        <input
          aria-label="Manual product name"
          placeholder="Product"
          value={draft.name}
          onChange={(event) => setDraft({ ...draft, name: event.target.value })}
        />
        <input
          aria-label="Manual brand"
          placeholder="Brand"
          value={draft.brand}
          onChange={(event) => setDraft({ ...draft, brand: event.target.value })}
        />
        <input
          aria-label="Manual pack size"
          placeholder="Pack"
          value={draft.packSize}
          onChange={(event) => setDraft({ ...draft, packSize: event.target.value })}
        />
        <input
          aria-label="Manual price"
          inputMode="numeric"
          placeholder="Price"
          value={draft.price}
          onChange={(event) => setDraft({ ...draft, price: event.target.value })}
        />
        <input
          aria-label="Manual stock"
          inputMode="numeric"
          placeholder="Stock"
          value={draft.inventory}
          onChange={(event) => setDraft({ ...draft, inventory: event.target.value })}
        />
        <button className={styles.secondaryAction} onClick={addManualItem} type="button">
          <Plus aria-hidden="true" size={16} />
          Add
        </button>
      </div>

      <div className={styles.exportHeader}>
        <h3>Reviewed catalog JSON</h3>
        <div className={styles.exportActions}>
          <button className={styles.secondaryAction} onClick={copyExport} type="button">
            <Clipboard aria-hidden="true" size={16} />
            Copy JSON
          </button>
          <button className={styles.secondaryAction} onClick={() => dispatch({ type: "RESET" })} type="button">
            <RotateCcw aria-hidden="true" size={16} />
            Reset scan
          </button>
        </div>
      </div>
      <pre className={styles.jsonBox}>{exportJson}</pre>
    </section>
  );
}
