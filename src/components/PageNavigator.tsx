import { Copy, FilePlus2, GripVertical, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import type { NotePage } from "../types";

interface PageNavigatorProps {
  pages: NotePage[];
  selectedPageId: string;
  onSelect: (pageId: string) => void;
  onAdd: () => void;
  onRename: (pageId: string) => void;
  onDuplicate: (pageId: string) => void;
  onDelete: (pageId: string) => void;
  onReorder: (sourcePageId: string, targetPageId: string) => void;
}

export default function PageNavigator({
  pages,
  selectedPageId,
  onSelect,
  onAdd,
  onRename,
  onDuplicate,
  onDelete,
  onReorder
}: PageNavigatorProps) {
  const [draggedPageId, setDraggedPageId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  return (
    <section className="page-manager" aria-label="Gestionnaire de pages">
      <div className="page-manager-header">
        <div>
          <strong>Pages</strong>
          <span>{pages.length} page{pages.length > 1 ? "s" : ""}</span>
        </div>
        <button onClick={onAdd} title="Ajouter une page">
          <FilePlus2 size={17} />
          Nouvelle page
        </button>
      </div>

      <div className="page-cards">
        {pages.map((page, index) => {
          const selected = page.id === selectedPageId;
          const thumbnail = page.dataUrl || page.backgroundDataUrl;

          return (
            <article
              key={page.id}
              className={`page-card ${selected ? "selected" : ""} ${
                dropTargetId === page.id ? "drop-target" : ""
              }`}
              draggable
              onDragStart={event => {
                setDraggedPageId(page.id);
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", page.id);
              }}
              onDragOver={event => {
                event.preventDefault();
                if (draggedPageId && draggedPageId !== page.id) {
                  setDropTargetId(page.id);
                }
              }}
              onDragLeave={() => {
                if (dropTargetId === page.id) setDropTargetId(null);
              }}
              onDrop={event => {
                event.preventDefault();
                const sourceId =
                  draggedPageId || event.dataTransfer.getData("text/plain");
                setDraggedPageId(null);
                setDropTargetId(null);
                if (sourceId && sourceId !== page.id) {
                  onReorder(sourceId, page.id);
                }
              }}
              onDragEnd={() => {
                setDraggedPageId(null);
                setDropTargetId(null);
              }}
            >
              <button
                className="page-card-main"
                onClick={() => onSelect(page.id)}
                onDoubleClick={() => onRename(page.id)}
              >
                <span className="page-drag-handle" title="Glisser pour déplacer">
                  <GripVertical size={16} />
                </span>

                <span className="page-preview">
                  {thumbnail ? (
                    <img src={thumbnail} alt="" />
                  ) : (
                    <span className={`paper-preview paper-${page.paper}`} />
                  )}
                  <small>{index + 1}</small>
                </span>

                <span className="page-card-title">
                  <strong>{page.title}</strong>
                  <small>
                    {page.sourcePdfName
                      ? `PDF · page ${page.sourcePdfPage ?? index + 1}`
                      : page.paper === "grid"
                        ? "Petits carreaux"
                        : page.paper === "lined"
                          ? "Lignes"
                          : page.paper === "dots"
                            ? "Points"
                            : "Blanche"}
                  </small>
                </span>
              </button>

              <div className="page-card-actions">
                <button title="Renommer" onClick={() => onRename(page.id)}>
                  <Pencil size={15} />
                </button>
                <button title="Dupliquer" onClick={() => onDuplicate(page.id)}>
                  <Copy size={15} />
                </button>
                <button
                  className="danger"
                  title="Supprimer"
                  onClick={() => onDelete(page.id)}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
