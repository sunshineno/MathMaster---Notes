import { useEffect, useRef } from "react";
import { Grip, Pencil, Trash2 } from "lucide-react";
import type { CanvasLatexObject as CanvasLatexObjectType } from "../types";

declare global {
  interface Window {
    MathJax?: {
      typesetClear?: (elements?: HTMLElement[]) => void;
      typesetPromise?: (elements?: HTMLElement[]) => Promise<void>;
    };
  }
}

interface Props {
  object: CanvasLatexObjectType;
  zoom: number;
  selected: boolean;
  onSelect: () => void;
  onChange: (changes: Partial<CanvasLatexObjectType>) => void;
  onEdit: () => void;
  onDelete: () => void;
}

export default function CanvasLatexObject({ object, zoom, selected, onSelect, onChange, onEdit, onDelete }: Props) {
  const previewRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number; originX: number; originY: number } | null>(null);

  useEffect(() => {
    const element = previewRef.current;
    if (!element) return;
    element.textContent = `\\(${object.latex}\\)`;
    window.MathJax?.typesetClear?.([element]);
    void window.MathJax?.typesetPromise?.([element]).catch(() => undefined);
  }, [object.latex, object.fontSize]);

  return (
    <div
      className={`canvas-latex-object ${selected ? "selected" : ""}`}
      style={{
        left: object.x * zoom,
        top: object.y * zoom,
        width: object.width * zoom,
        fontSize: object.fontSize * zoom
      }}
      onPointerDown={event => {
        event.stopPropagation();
        onSelect();
      }}
      onDoubleClick={event => {
        event.stopPropagation();
        onEdit();
      }}
    >
      {selected && (
        <div
          className="canvas-latex-drag-handle"
          title="Déplacer"
          onPointerDown={event => {
            event.preventDefault();
            event.stopPropagation();
            dragRef.current = { x: event.clientX, y: event.clientY, originX: object.x, originY: object.y };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={event => {
            const drag = dragRef.current;
            if (!drag) return;
            onChange({
              x: Math.max(0, drag.originX + (event.clientX - drag.x) / zoom),
              y: Math.max(0, drag.originY + (event.clientY - drag.y) / zoom)
            });
          }}
          onPointerUp={event => {
            dragRef.current = null;
            event.currentTarget.releasePointerCapture(event.pointerId);
          }}
        ><Grip size={15} /></div>
      )}
      <div ref={previewRef} className="canvas-latex-render" />
      {selected && (
        <div className="canvas-latex-actions">
          <button onClick={event => { event.stopPropagation(); onEdit(); }} title="Modifier"><Pencil size={14} /></button>
          <button onClick={event => { event.stopPropagation(); onDelete(); }} title="Supprimer"><Trash2 size={14} /></button>
        </div>
      )}
      {selected && (
        <input
          className="canvas-latex-width"
          type="range"
          min="180"
          max="1000"
          step="20"
          value={object.width}
          onChange={event => onChange({ width: Number(event.target.value) })}
          aria-label="Largeur de la formule"
        />
      )}
    </div>
  );
}
