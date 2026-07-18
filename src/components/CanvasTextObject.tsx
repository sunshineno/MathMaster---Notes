import { useEffect, useRef, useState } from "react";
import { AlignCenter, AlignLeft, AlignRight, Bold, Italic, Trash2, Underline } from "lucide-react";
import type { CanvasTextObject as CanvasTextObjectType } from "../types";

interface Props {
  object: CanvasTextObjectType;
  zoom: number;
  selected: boolean;
  onSelect: () => void;
  onChange: (changes: Partial<CanvasTextObjectType>) => void;
  onDelete: () => void;
}

export default function CanvasTextObject({ object, zoom, selected, onSelect, onChange, onDelete }: Props) {
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, left: 0, top: 0 });
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== object.html) {
      editorRef.current.innerHTML = object.html;
    }
  }, [object.html]);

  const pointerMove = (event: PointerEvent) => {
    if (!dragging) return;
    onChange({
      x: Math.max(0, dragStart.current.left + (event.clientX - dragStart.current.x) / zoom),
      y: Math.max(0, dragStart.current.top + (event.clientY - dragStart.current.y) / zoom)
    });
  };

  const pointerUp = () => setDragging(false);

  useEffect(() => {
    if (!dragging) return;
    window.addEventListener("pointermove", pointerMove);
    window.addEventListener("pointerup", pointerUp, { once: true });
    return () => {
      window.removeEventListener("pointermove", pointerMove);
      window.removeEventListener("pointerup", pointerUp);
    };
  }, [dragging, zoom]);

  const format = (command: "bold" | "italic" | "underline") => {
    editorRef.current?.focus();
    document.execCommand(command);
    onChange({ html: editorRef.current?.innerHTML ?? object.html });
  };

  return (
    <div
      className={`canvas-text-object ${selected ? "selected" : ""}`}
      style={{
        left: object.x * zoom,
        top: object.y * zoom,
        width: object.width * zoom,
        minHeight: object.height * zoom,
        fontSize: object.fontSize * zoom,
        color: object.color,
        textAlign: object.align
      }}
      onPointerDown={event => {
        event.stopPropagation();
        onSelect();
      }}
    >
      {selected && (
        <div className="canvas-text-toolbar" contentEditable={false}>
          <button title="Déplacer" onPointerDown={event => {
            event.preventDefault();
            event.stopPropagation();
            dragStart.current = { x: event.clientX, y: event.clientY, left: object.x, top: object.y };
            setDragging(true);
          }}>↕</button>
          <button title="Gras" onMouseDown={event => { event.preventDefault(); format("bold"); }}><Bold size={14} /></button>
          <button title="Italique" onMouseDown={event => { event.preventDefault(); format("italic"); }}><Italic size={14} /></button>
          <button title="Souligné" onMouseDown={event => { event.preventDefault(); format("underline"); }}><Underline size={14} /></button>
          <button title="Aligner à gauche" onClick={() => onChange({ align: "left" })}><AlignLeft size={14} /></button>
          <button title="Centrer" onClick={() => onChange({ align: "center" })}><AlignCenter size={14} /></button>
          <button title="Aligner à droite" onClick={() => onChange({ align: "right" })}><AlignRight size={14} /></button>
          <input title="Couleur" type="color" value={object.color} onChange={event => onChange({ color: event.target.value })} />
          <select title="Taille" value={object.fontSize} onChange={event => onChange({ fontSize: Number(event.target.value) })}>
            {[16, 20, 24, 28, 32, 40, 48].map(size => <option key={size} value={size}>{size}</option>)}
          </select>
          <button className="danger" title="Supprimer" onClick={onDelete}><Trash2 size={14} /></button>
        </div>
      )}
      <div
        ref={editorRef}
        className="canvas-text-editor"
        contentEditable
        suppressContentEditableWarning
        spellCheck
        data-placeholder="Écris ici…"
        onFocus={onSelect}
        onInput={event => onChange({ html: event.currentTarget.innerHTML })}
      />
      {selected && (
        <input
          className="canvas-text-width"
          type="range"
          min="180"
          max="1100"
          step="20"
          value={object.width}
          onChange={event => onChange({ width: Number(event.target.value) })}
          title="Largeur du bloc de texte"
        />
      )}
    </div>
  );
}
