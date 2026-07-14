export type PaperType = "blank" | "grid" | "dots" | "lined";

export interface NotePage {
  id: string;
  title: string;
  dataUrl: string;
  paper: PaperType;
  latex: string;
}

export interface Chapter {
  id: string;
  title: string;
  favorite: boolean;
  pages: NotePage[];
}

export interface Subject {
  id: string;
  title: string;
  chapters: Chapter[];
}

export interface NotebookState {
  subjects: Subject[];
  selectedSubjectId: string | null;
  selectedChapterId: string | null;
  selectedPageId: string | null;
}