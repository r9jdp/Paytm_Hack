import type { ChatItem } from "@/lib/types";

const DB_NAME = "point-ask-ai";
const STORE_NAME = "chat-items";
const DB_VERSION = 1;
const MAX_STORED_ITEMS = 25;

function openChatDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available in this browser."));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open local chat history."));
  });
}

function withStore<T>(
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest<T> | void
): Promise<T | void> {
  return openChatDb().then(
    (db) =>
      new Promise<T | void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, mode);
        const store = transaction.objectStore(STORE_NAME);
        const request = callback(store);
        let result: T | void;

        if (request) {
          request.onsuccess = () => {
            result = request.result;
          };
          request.onerror = () => reject(request.error ?? new Error("Local history request failed."));
        }

        transaction.oncomplete = () => {
          db.close();
          resolve(result);
        };
        transaction.onerror = () => {
          db.close();
          reject(transaction.error ?? new Error("Local history transaction failed."));
        };
      })
  );
}

function newestFirst(items: ChatItem[]) {
  return items.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function listChatItems(): Promise<ChatItem[]> {
  const result = await withStore<ChatItem[]>("readonly", (store) => store.getAll());
  return newestFirst(Array.isArray(result) ? result : []);
}

export async function saveChatItem(item: ChatItem): Promise<ChatItem[]> {
  await withStore<IDBValidKey>("readwrite", (store) => store.put(item));
  const items = await listChatItems();
  const overflow = items.slice(MAX_STORED_ITEMS);

  if (overflow.length) {
    await Promise.all(
      overflow.map((oldItem) => withStore<undefined>("readwrite", (store) => store.delete(oldItem.id)))
    );
  }

  return items.slice(0, MAX_STORED_ITEMS);
}

export async function clearChatItems(): Promise<void> {
  await withStore<undefined>("readwrite", (store) => store.clear());
}
