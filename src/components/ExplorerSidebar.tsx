import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  FolderPlus,
  Pencil,
  Plus,
  Star,
  Trash2
} from "lucide-react";
import type { Subject } from "../types";

interface ExplorerSidebarProps {
  subjects: Subject[];
  selectedSubjectId: string | null;
  selectedChapterId: string | null;
  expandedSubjects: Record<string, boolean>;
  searchActive: boolean;
  onToggleSubject: (subjectId: string, expanded: boolean) => void;
  onSelectSubject: (subjectId: string) => void;
  onSelectChapter: (subjectId: string, chapterId: string) => void;
  onAddSubject: () => void;
  onAddChapter: (subjectId: string) => void;
  onRenameSubject: (subjectId: string) => void;
  onRenameChapter: (subjectId: string, chapterId: string) => void;
  onDeleteSubject: (subjectId: string) => void;
  onDeleteChapter: (subjectId: string, chapterId: string) => void;
}

export default function ExplorerSidebar({
  subjects,
  selectedSubjectId,
  selectedChapterId,
  expandedSubjects,
  searchActive,
  onToggleSubject,
  onSelectSubject,
  onSelectChapter,
  onAddSubject,
  onAddChapter,
  onRenameSubject,
  onRenameChapter,
  onDeleteSubject,
  onDeleteChapter
}: ExplorerSidebarProps) {
  return (
    <aside className="sidebar explorer">
      <div className="panel-title">
        <span>Mes cours</span>
        <div className="panel-title-actions">
          {selectedSubjectId && (
            <button
              className="danger-action"
              title="Supprimer la matière sélectionnée"
              onClick={() => onDeleteSubject(selectedSubjectId)}
            >
              <Trash2 size={18} />
            </button>
          )}
          <button title="Ajouter une matière" onClick={onAddSubject}>
            <FolderPlus size={18} />
          </button>
        </div>
      </div>

      <div className="tree">
        {subjects.map(subject => {
          const expanded = searchActive || expandedSubjects[subject.id] === true;
          const selected = subject.id === selectedSubjectId;

          return (
            <div className="tree-subject" key={subject.id}>
              <div className={`tree-row subject-row ${selected ? "selected" : ""}`}>
                <button
                  className="tree-chevron"
                  title={expanded ? "Replier" : "Déplier"}
                  onClick={() => onToggleSubject(subject.id, expanded)}
                >
                  {expanded ? <ChevronDown size={17} /> : <ChevronRight size={17} />}
                </button>

                <button
                  className="tree-label"
                  onClick={() => onSelectSubject(subject.id)}
                  onDoubleClick={() => onRenameSubject(subject.id)}
                >
                  {expanded ? <FolderOpen size={18} /> : <Folder size={18} />}
                  <span>{subject.title}</span>
                </button>

                <div className="tree-actions">
                  <button title="Ajouter un chapitre" onClick={() => onAddChapter(subject.id)}>
                    <Plus size={15} />
                  </button>
                  <button title="Renommer la matière" onClick={() => onRenameSubject(subject.id)}>
                    <Pencil size={15} />
                  </button>
                  <button
                    className="danger"
                    title="Supprimer la matière"
                    onClick={() => onDeleteSubject(subject.id)}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {expanded && (
                <div className="tree-children">
                  {subject.chapters.length === 0 && (
                    <button className="tree-empty" onClick={() => onAddChapter(subject.id)}>
                      + Ajouter un premier chapitre
                    </button>
                  )}

                  {subject.chapters.map(chapter => (
                    <div
                      className={`tree-row chapter-row ${chapter.id === selectedChapterId ? "selected" : ""}`}
                      key={chapter.id}
                    >
                      <button
                        className="tree-label"
                        onClick={() => onSelectChapter(subject.id, chapter.id)}
                        onDoubleClick={() => onRenameChapter(subject.id, chapter.id)}
                      >
                        <BookOpen size={16} />
                        <span>{chapter.title}</span>
                        {chapter.favorite && <Star size={14} fill="currentColor" />}
                      </button>

                      <div className="tree-actions">
                        <button
                          title="Renommer le chapitre"
                          onClick={() => onRenameChapter(subject.id, chapter.id)}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          className="danger"
                          title="Supprimer le chapitre"
                          onClick={() => onDeleteChapter(subject.id, chapter.id)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
