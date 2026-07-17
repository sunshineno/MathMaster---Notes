import type { NotebookState } from "./types";

const DATABASE_NAME = "mathmaster-notes-safety";
const DATABASE_VERSION = 1;
const STORE_NAME = "snapshots";
const MAX_SNAPSHOTS = 5;

export interface NotebookSnapshot {
  id: string;
  createdAt: string;
  reason: "automatic" | "manual";
  state: NotebookState;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Impossible d’ouvrir l’historique local."));
  });
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Opération IndexedDB impossible."));
  });
}

export async function listNotebookSnapshots(): Promise<NotebookSnapshot[]> {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const snapshots = await requestToPromise(
      transaction.objectStore(STORE_NAME).getAll() as IDBRequest<NotebookSnapshot[]>
    );
    return snapshots.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } finally {
    database.close();
  }
}

export async function createNotebookSnapshot(
  state: NotebookState,
  reason: NotebookSnapshot["reason"] = "automatic"
): Promise<NotebookSnapshot> {
  const snapshot: NotebookSnapshot = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    reason,
    state: structuredClone(state)
  };

  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(snapshot);
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("Instantané impossible."));
      transaction.onabort = () => reject(transaction.error ?? new Error("Instantané annulé."));
    });
  } finally {
    database.close();
  }

  const snapshots = await listNotebookSnapshots();
  await Promise.all(
    snapshots.slice(MAX_SNAPSHOTS).map(item => deleteNotebookSnapshot(item.id))
  );

  return snapshot;
}

export async function deleteNotebookSnapshot(id: string): Promise<void> {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(id);
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("Suppression impossible."));
    });
  } finally {
    database.close();
  }
}

export function countSnapshotPages(snapshot: NotebookSnapshot): number {
  return snapshot.state.subjects.reduce(
    (total, subject) => total + subject.chapters.reduce(
      (chapterTotal, chapter) => chapterTotal + chapter.pages.length,
      0
    ),
    0
  );
}
