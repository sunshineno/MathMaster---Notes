import type { NotebookState } from "./types";

const STORAGE_KEY = "mathmaster-notes-v2";
const RECOVERY_KEY = "mathmaster-notes-recovery-v1";

export const initialState: NotebookState = {
  subjects: [
    {
      id: crypto.randomUUID(),
      title: "Algèbre",
      chapters: [
        {
          id: crypto.randomUUID(),
          title: "Chapitre 1",
          favorite: false,
          pages: [
            {
              id: crypto.randomUUID(),
              title: "Page 1",
              dataUrl: "",
              paper: "grid",
              latex: "",
              blocks: []
            }
          ]
        }
      ]
    }
  ],
  selectedSubjectId: null,
  selectedChapterId: null,
  selectedPageId: null
};

export interface NotebookBackup {
  format: "mathmaster-notes-backup";
  version: 1;
  exportedAt: string;
  state: NotebookState;
}

export interface StorageInfo {
  usedBytes: number;
  quotaBytes: number;
  usageRatio: number;
}

function normalizeState(state: NotebookState): NotebookState {
  return {
    ...state,
    subjects: state.subjects.map(subject => ({
      ...subject,
      chapters: subject.chapters.map(chapter => ({
        ...chapter,
        pages: chapter.pages.map(page => ({
          ...page,
          blocks: page.blocks ?? []
        }))
      }))
    }))
  };
}

export function loadState(): NotebookState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return normalizeState(JSON.parse(saved));

    const recovery = localStorage.getItem(RECOVERY_KEY);
    if (recovery) return normalizeState(JSON.parse(recovery));

    return initialState;
  } catch {
    return initialState;
  }
}

export function saveState(state: NotebookState) {
  const content = JSON.stringify(normalizeState(state));

  try {
    localStorage.setItem(RECOVERY_KEY, content);
    localStorage.setItem(STORAGE_KEY, content);
  } catch (error) {
    if (
      error instanceof DOMException &&
      (error.name === "QuotaExceededError" ||
        error.name === "NS_ERROR_DOM_QUOTA_REACHED")
    ) {
      throw new Error(
        "L’espace de stockage local est presque plein. Télécharge une sauvegarde puis supprime quelques pages volumineuses."
      );
    }

    throw error;
  }
}

export function clearRecoverySnapshot() {
  localStorage.removeItem(RECOVERY_KEY);
}

export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) return false;

  try {
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

export async function getStorageInfo(): Promise<StorageInfo | null> {
  if (!navigator.storage?.estimate) return null;

  try {
    const estimate = await navigator.storage.estimate();
    const usedBytes = estimate.usage ?? 0;
    const quotaBytes = estimate.quota ?? 0;

    return {
      usedBytes,
      quotaBytes,
      usageRatio: quotaBytes > 0 ? usedBytes / quotaBytes : 0
    };
  } catch {
    return null;
  }
}

export function createBackup(state: NotebookState): NotebookBackup {
  return {
    format: "mathmaster-notes-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    state: normalizeState(state)
  };
}

export function parseBackup(content: string): NotebookState {
  const parsed = JSON.parse(content) as Partial<NotebookBackup>;

  if (
    parsed.format !== "mathmaster-notes-backup" ||
    parsed.version !== 1 ||
    !parsed.state ||
    !Array.isArray(parsed.state.subjects)
  ) {
    throw new Error("Ce fichier n’est pas une sauvegarde MathMaster Notes valide.");
  }

  return normalizeState(parsed.state);
}

export function downloadBackup(state: NotebookState) {
  const backup = createBackup(state);
  const content = JSON.stringify(backup, null, 2);
  const blob = new Blob([content], {
    type: "application/json;charset=utf-8"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);

  link.href = url;
  link.download = `mathmaster-notes-sauvegarde-${date}.json`;
  link.click();

  URL.revokeObjectURL(url);
}
