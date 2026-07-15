import type { MathBlock } from "../types";

export type ChapterTemplate = "cours" | "td" | "annales" | "recherche" | "vide";

const templateLabels: Record<ChapterTemplate, string> = {
  cours: "Cours",
  td: "TD",
  annales: "Annales",
  recherche: "Recherche",
  vide: "Vide"
};

function createBlock(
  type: MathBlock["type"],
  title: string,
  content = ""
): MathBlock {
  return {
    id: crypto.randomUUID(),
    type,
    title,
    content,
    collapsed: false
  };
}

export function createTemplateBlocks(template: ChapterTemplate): MathBlock[] {
  switch (template) {
    case "cours":
      return [
        createBlock("definition", "Définition"),
        createBlock("theoreme", "Théorème"),
        createBlock("proof", "Démonstration"),
        createBlock("exemple", "Exemple")
      ];
    case "td":
      return [
        createBlock("exercice", "Exercice"),
        createBlock("correction", "Correction")
      ];
    case "annales":
      return [
        createBlock("text", "Énoncé / informations"),
        createBlock("exercice", "Question"),
        createBlock("correction", "Correction")
      ];
    case "recherche":
      return [
        createBlock("text", "Notes de recherche"),
        createBlock("proposition", "Proposition"),
        createBlock("proof", "Démonstration")
      ];
    case "vide":
      return [];
  }
}

export function parseChapterTemplate(value: string): ChapterTemplate {
  const normalized = value.trim().toLowerCase();
  if (
    normalized === "cours" ||
    normalized === "td" ||
    normalized === "annales" ||
    normalized === "recherche" ||
    normalized === "vide"
  ) {
    return normalized;
  }

  return "vide";
}

export function describeTemplates(): string {
  return (Object.keys(templateLabels) as ChapterTemplate[])
    .map(key => `${key} (${templateLabels[key]})`)
    .join(", ");
}
