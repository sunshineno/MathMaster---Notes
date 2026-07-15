import {
  Circle,
  Clipboard,
  ClipboardCopy,
  Copy,
  Download,
  Eraser,
  Hand,
  Highlighter,
  Minus,
  MousePointer2,
  PenLine,
  Plus,
  RectangleHorizontal,
  Redo2,
  RotateCcw,
  Save,
  Scissors,
  Settings2,
  Slash,
  Trash2
} from "lucide-react";
import {
  PEN_PRESETS,
  WIDTH_PRESETS,
  type DrawingTool,
  type InputMode
} from "../editor/drawingTypes";

interface DrawingToolbarProps {
  tool: DrawingTool;
  width: number;
  color: string;
  zoom: number;
  inputMode: InputMode;
  palmRejection: boolean;
  compactToolbar: boolean;
  hasSelection: boolean;
  hasClipboard: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onToolChange: (tool: DrawingTool) => void;
  onWidthChange: (width: number) => void;
  onColorChange: (color: string) => void;
  onZoomChange: (zoom: number) => void;
  onInputModeChange: (mode: InputMode) => void;
  onPalmRejectionChange: (enabled: boolean) => void;
  onCompactToolbarChange: (compact: boolean) => void;
  onCopySelection: () => void;
  onCutSelection: () => void;
  onPasteSelection: () => void;
  onDeleteSelection: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onSave: () => void;
  onDownload: () => void;
}

export default function DrawingToolbar({
  tool,
  width,
  color,
  zoom,
  inputMode,
  palmRejection,
  compactToolbar,
  hasSelection,
  hasClipboard,
  canUndo,
  canRedo,
  onToolChange,
  onWidthChange,
  onColorChange,
  onZoomChange,
  onInputModeChange,
  onPalmRejectionChange,
  onCompactToolbarChange,
  onCopySelection,
  onCutSelection,
  onPasteSelection,
  onDeleteSelection,
  onUndo,
  onRedo,
  onClear,
  onSave,
  onDownload
}: DrawingToolbarProps) {
  return (
    <>
      <div className="input-mode-bar">
        <label>
          Mode d’entrée
          <select
            value={inputMode}
            onChange={event =>
              onInputModeChange(event.target.value as InputMode)
            }
          >
            <option value="stylus">Stylet uniquement</option>
            <option value="hybrid">Stylet + doigt</option>
            <option value="read">Lecture / déplacement</option>
          </select>
        </label>

        <label className="palm-toggle">
          <input
            type="checkbox"
            checked={palmRejection}
            onChange={event => onPalmRejectionChange(event.target.checked)}
          />
          Rejet de paume
        </label>

        <span className="input-mode-hint">
          {inputMode === "stylus"
            ? "Le doigt ne dessine pas ; deux doigts servent au zoom."
            : inputMode === "hybrid"
              ? "Le stylet et le doigt peuvent dessiner."
              : "L’écriture est désactivée."}
        </span>
      </div>

      <div className="drawing-quickbar">
        <div className="pen-presets" aria-label="Stylos rapides">
          {PEN_PRESETS.map(preset => (
            <button
              key={preset.value}
              className={`pen-preset ${color === preset.value ? "selected" : ""}`}
              title={`Stylo ${preset.label}`}
              onClick={() => {
                onColorChange(preset.value);
                onToolChange("pen");
              }}
            >
              <span style={{ backgroundColor: preset.value }} />
              {preset.label}
            </button>
          ))}
        </div>

        <div className="width-presets" aria-label="Épaisseurs rapides">
          {WIDTH_PRESETS.map(presetWidth => (
            <button
              key={presetWidth}
              className={width === presetWidth ? "selected" : ""}
              onClick={() => onWidthChange(presetWidth)}
              title={`Épaisseur ${presetWidth}`}
            >
              <span style={{ height: `${Math.max(2, presetWidth)}px` }} />
              {presetWidth}
            </button>
          ))}
        </div>

        <button
          className={`compact-toggle ${compactToolbar ? "selected" : ""}`}
          onClick={() => onCompactToolbarChange(!compactToolbar)}
          title="Afficher ou masquer les outils avancés"
        >
          <Settings2 size={17} />
          {compactToolbar ? "Outils complets" : "Mode compact"}
        </button>
      </div>

      <div className={`toolbar ${compactToolbar ? "toolbar-compact" : ""}`}>
        <div className="tool-group">
          <button className={tool === "pen" ? "active" : ""} onClick={() => onToolChange("pen")}>
            <PenLine size={18} /> Stylo
          </button>
          <button className={tool === "highlighter" ? "active" : ""} onClick={() => onToolChange("highlighter")}>
            <Highlighter size={18} /> Surligneur
          </button>
          <button className={tool === "eraser" ? "active" : ""} onClick={() => onToolChange("eraser")}>
            <Eraser size={18} /> Gomme
          </button>
          <button className={tool === "pan" ? "active" : ""} onClick={() => onToolChange("pan")}>
            <Hand size={18} /> Déplacer
          </button>
          <button className={tool === "select" ? "active" : ""} onClick={() => onToolChange("select")}>
            <MousePointer2 size={18} /> Sélection
          </button>
        </div>

        <div className="tool-group advanced-tools">
          <button className={tool === "line" ? "active" : ""} onClick={() => onToolChange("line")} title="Tracer un segment">
            <Slash size={18} />
          </button>
          <button className={tool === "rectangle" ? "active" : ""} onClick={() => onToolChange("rectangle")} title="Tracer un rectangle">
            <RectangleHorizontal size={18} />
          </button>
          <button className={tool === "ellipse" ? "active" : ""} onClick={() => onToolChange("ellipse")} title="Tracer une ellipse">
            <Circle size={18} />
          </button>
        </div>

        {hasSelection && (
          <div className="tool-group selection-tools">
            <button onClick={onCopySelection} title="Copier la sélection"><Copy size={17} /></button>
            <button onClick={onCutSelection} title="Couper la sélection"><Scissors size={17} /></button>
            <button onClick={onPasteSelection} title="Coller"><Clipboard size={17} /></button>
            <button onClick={onDeleteSelection} title="Supprimer la sélection"><Trash2 size={17} /></button>
          </div>
        )}
        {!hasSelection && hasClipboard && (
          <div className="tool-group selection-tools">
            <button onClick={onPasteSelection} title="Coller"><ClipboardCopy size={17} /> Coller</button>
          </div>
        )}

        <label>
          Épaisseur
          <input
            type="range"
            min="1"
            max="30"
            value={width}
            onChange={event => onWidthChange(Number(event.target.value))}
          />
        </label>
        <input
          className="color-picker"
          type="color"
          value={color}
          onChange={event => onColorChange(event.target.value)}
          aria-label="Couleur du trait"
        />

        <div className="tool-group advanced-tools">
          <button onClick={onUndo} disabled={!canUndo}><RotateCcw size={18} /> Annuler</button>
          <button onClick={onRedo} disabled={!canRedo}><Redo2 size={18} /> Rétablir</button>
          <button onClick={onClear}><Trash2 size={18} /> Effacer</button>
        </div>

        <div className="tool-group zoom-controls advanced-tools">
          <button onClick={() => onZoomChange(zoom - 0.1)} title="Dézoomer"><Minus size={17} /></button>
          <button className="zoom-value" onClick={() => onZoomChange(0.75)} title="Réinitialiser le zoom">{Math.round(zoom * 100)} %</button>
          <button onClick={() => onZoomChange(zoom + 0.1)} title="Zoomer"><Plus size={17} /></button>
        </div>

        <div className="tool-group">
          <button onClick={onSave}><Save size={18} /> Enregistrer</button>
          <button onClick={onDownload}><Download size={18} /> PNG</button>
        </div>
      </div>
    </>
  );
}
