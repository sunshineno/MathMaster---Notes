export type PaperType = "blank" | "grid" | "dots" | "lined";

export type MathBlockType =
  | "text"
  | "definition"
  | "theoreme"
  | "proposition"
  | "lemme"
  | "corollaire"
  | "remarque"
  | "exemple"
  | "proof"
  | "exercice"
  | "correction"
  | "equation";

export interface MathBlock {
  id: string;
  type: MathBlockType;
  title: string;
  content: string;
  collapsed: boolean;
}

export interface NotePage {
  id: string;
  title: string;
  dataUrl: string;
  paper: PaperType;
  latex: string;
  blocks?: MathBlock[];
  backgroundDataUrl?: string;
  sourcePdfName?: string;
  sourcePdfPage?: number;
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