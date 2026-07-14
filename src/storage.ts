import type { NotebookState } from "./types";

const STORAGE_KEY = "mathmaster-notes-v2";

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
              latex: ""
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

export function loadState(): NotebookState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : initialState;
  } catch {
    return initialState;
  }
}

export function saveState(state: NotebookState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function createBackup(state: NotebookState): NotebookBackup {
  return {
    format: "mathmaster-notes-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    state
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
    throw new Error("Ce fichier n'est pas une sauvegarde MathMaster Notes valide.");
  }

  return parsed.state;
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
