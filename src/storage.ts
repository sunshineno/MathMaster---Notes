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