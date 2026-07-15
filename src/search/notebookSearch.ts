import type { Chapter, Subject } from "../types";

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function chapterMatches(chapter: Chapter, query: string): boolean {
  if (normalize(chapter.title).includes(query)) return true;

  return chapter.pages.some(page => {
    if (normalize(page.title).includes(query)) return true;
    if (normalize(page.latex).includes(query)) return true;

    return (page.blocks ?? []).some(block =>
      normalize(block.title).includes(query) ||
      normalize(block.content).includes(query)
    );
  });
}

export function filterSubjects(subjects: Subject[], rawQuery: string): Subject[] {
  const query = normalize(rawQuery.trim());
  if (!query) return subjects;

  return subjects
    .map(subject => {
      const subjectMatches = normalize(subject.title).includes(query);
      const chapters = subjectMatches
        ? subject.chapters
        : subject.chapters.filter(chapter => chapterMatches(chapter, query));

      return { ...subject, chapters };
    })
    .filter(subject =>
      normalize(subject.title).includes(query) || subject.chapters.length > 0
    );
}
