export type InputMode = "stylus" | "hybrid" | "read";

export type DrawingTool =
  | "pen"
  | "highlighter"
  | "eraser"
  | "pan"
  | "select"
  | "line"
  | "rectangle"
  | "ellipse";

export interface DrawingSettings {
  tool: DrawingTool;
  width: number;
  color: string;
  zoom: number;
  inputMode: InputMode;
  palmRejection: boolean;
}

export const PEN_PRESETS = [
  { label: "Noir", value: "#111827" },
  { label: "Bleu", value: "#2563eb" },
  { label: "Rouge", value: "#dc2626" },
  { label: "Vert", value: "#16a34a" }
] as const;

export const WIDTH_PRESETS = [2, 4, 7] as const;
