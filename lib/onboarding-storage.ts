import type { StorefrontExport } from "@/lib/types";

const DB_NAME = "point-ask-onboarding";
const EXPORT_STORE = "storefront-exports";
const DB_VERSION = 1;

function openOnboardingDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available in this browser."));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(EXPORT_STORE)) {
        db.createObjectStore(EXPORT_STORE, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open onboarding storage."));
  });
}

function withExportStore<T>(
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest<T> | void
): Promise<T | void> {
  return openOnboardingDb().then(
    (db) =>
      new Promise<T | void>((resolve, reject) => {
        const transaction = db.transaction(EXPORT_STORE, mode);
        const store = transaction.objectStore(EXPORT_STORE);
        const request = callback(store);
        let result: T | void;

        if (request) {
          request.onsuccess = () => {
            result = request.result;
          };
          request.onerror = () => reject(request.error ?? new Error("Onboarding storage request failed."));
        }

        transaction.oncomplete = () => {
          db.close();
          resolve(result);
        };
        transaction.onerror = () => {
          db.close();
          reject(transaction.error ?? new Error("Onboarding storage transaction failed."));
        };
      })
  );
}

export async function saveStorefrontExport(payload: StorefrontExport): Promise<void> {
  await withExportStore<IDBValidKey>("readwrite", (store) => store.put(payload));
}

export async function listStorefrontExports(): Promise<StorefrontExport[]> {
  const result = await withExportStore<StorefrontExport[]>("readonly", (store) => store.getAll());
  return Array.isArray(result)
    ? result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    : [];
}

export async function clearStorefrontExports(): Promise<void> {
  await withExportStore<undefined>("readwrite", (store) => store.clear());
}
