import { useEffect, useRef, useState } from "react";
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
  Slash,
  Trash2
} from "lucide-react";
import type { PaperType } from "../types";

interface Props {
  dataUrl: string;
  paper: PaperType;
  onSave: (dataUrl: string) => void;
}

type Tool =
  | "pen"
  | "highlighter"
  | "eraser"
  | "pan"
  | "select"
  | "line"
  | "rectangle"
  | "ellipse";

interface Point {
  x: number;
  y: number;
  pressure: number;
}

interface SelectionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TouchPoint {
  clientX: number;
  clientY: number;
}

const CANVAS_WIDTH = 1400;
const CANVAS_HEIGHT = 2400;

export default function CanvasBoard({ dataUrl, paper, onSave }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const drawing = useRef(false);
  const last = useRef<Point>({ x: 0, y: 0, pressure: 0.5 });
  const shapeStart = useRef<Point | null>(null);
  const shapeSnapshot = useRef<ImageData | null>(null);
  const panStart = useRef({ x: 0, y: 0, left: 0, top: 0 });
  const autosaveTimer = useRef<number | null>(null);
  const activeTouches = useRef<Map<number, TouchPoint>>(new Map());
  const pinchStart = useRef({
    distance: 0,
    zoom: 1,
    midpointX: 0,
    midpointY: 0,
    scrollLeft: 0,
    scrollTop: 0
  });
  const selectionStart = useRef<Point | null>(null);
  const selectionMoveStart = useRef<Point | null>(null);
  const selectionOrigin = useRef<SelectionRect | null>(null);
  const clipboardRef = useRef<HTMLCanvasElement | null>(null);

  const [tool, setTool] = useState<Tool>("pen");
  const [width, setWidth] = useState(4);
  const [color, setColor] = useState("#111827");
  const [zoom, setZoom] = useState(0.75);
  const [history, setHistory] = useState<string[]>([]);
  const [future, setFuture] = useState<string[]>([]);
  const [selection, setSelection] = useState<SelectionRect | null>(null);
  const [selectionOffset, setSelectionOffset] = useState({ x: 0, y: 0 });

  const drawPaper = (
    ctx: CanvasRenderingContext2D,
    widthPx: number,
    heightPx: number
  ) => {
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, widthPx, heightPx);
    ctx.strokeStyle = "#dbeafe";
    ctx.fillStyle = "#bfdbfe";
    ctx.lineWidth = 1;

    if (paper === "grid") {
      for (let x = 0; x < widthPx; x += 24) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, heightPx);
        ctx.stroke();
      }
      for (let y = 0; y < heightPx; y += 24) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(widthPx, y);
        ctx.stroke();
      }
    }

    if (paper === "lined") {
      for (let y = 40; y < heightPx; y += 32) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(widthPx, y);
        ctx.stroke();
      }
    }

    if (paper === "dots") {
      for (let x = 16; x < widthPx; x += 24) {
        for (let y = 16; y < heightPx; y += 24) {
          ctx.beginPath();
          ctx.arc(x, y, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    ctx.restore();
  };

  const redrawPaperRegion = (
    ctx: CanvasRenderingContext2D,
    rect: SelectionRect
  ) => {
    const x = Math.max(0, Math.floor(rect.x));
    const y = Math.max(0, Math.floor(rect.y));
    const right = Math.min(CANVAS_WIDTH, Math.ceil(rect.x + rect.width));
    const bottom = Math.min(CANVAS_HEIGHT, Math.ceil(rect.y + rect.height));

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, right - x, bottom - y);
    ctx.clip();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x, y, right - x, bottom - y);
    ctx.strokeStyle = "#dbeafe";
    ctx.fillStyle = "#bfdbfe";
    ctx.lineWidth = 1;

    if (paper === "grid") {
      for (let gx = Math.floor(x / 24) * 24; gx <= right; gx += 24) {
        ctx.beginPath();
        ctx.moveTo(gx, y);
        ctx.lineTo(gx, bottom);
        ctx.stroke();
      }
      for (let gy = Math.floor(y / 24) * 24; gy <= bottom; gy += 24) {
        ctx.beginPath();
        ctx.moveTo(x, gy);
        ctx.lineTo(right, gy);
        ctx.stroke();
      }
    }

    if (paper === "lined") {
      for (let gy = 40 + Math.floor((y - 40) / 32) * 32; gy <= bottom; gy += 32) {
        ctx.beginPath();
        ctx.moveTo(x, gy);
        ctx.lineTo(right, gy);
        ctx.stroke();
      }
    }

    if (paper === "dots") {
      for (let gx = 16 + Math.floor((x - 16) / 24) * 24; gx <= right; gx += 24) {
        for (let gy = 16 + Math.floor((y - 16) / 24) * 24; gy <= bottom; gy += 24) {
          ctx.beginPath();
          ctx.arc(gx, gy, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    ctx.restore();
  };

  const loadImage = (url: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    drawPaper(ctx, canvas.width, canvas.height);
    if (!url) return;

    const image = new Image();
    image.onload = () => {
      ctx.save();
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      ctx.restore();
    };
    image.src = url;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    loadImage(dataUrl);
    setHistory([]);
    setFuture([]);
    setSelection(null);
  }, [dataUrl, paper]);

  const eventPoint = (event: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
      pressure: event.pointerType === "pen" ? event.pressure || 0.55 : 0.7
    };
  };

  const rememberCurrentState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setHistory(previous => [...previous.slice(-11), canvas.toDataURL()]);
    setFuture([]);
  };

  const restoreFromUrl = (url: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const image = new Image();
    image.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    };
    image.src = url;
  };

  const configureStroke = (
    ctx: CanvasRenderingContext2D,
    currentPoint: Point
  ) => {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (tool === "eraser") {
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = Math.max(16, width * 3.5);
      return;
    }

    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = color;

    if (tool === "highlighter") {
      ctx.globalAlpha = 0.25;
      ctx.lineWidth = Math.max(16, width * 4.5);
      return;
    }

    ctx.globalAlpha = 1;
    const pressureFactor = Math.max(0.45, currentPoint.pressure * 1.4);
    ctx.lineWidth = width * pressureFactor;
  };

  const distance = (a: TouchPoint, b: TouchPoint) =>
    Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);

  const midpoint = (a: TouchPoint, b: TouchPoint) => ({
    x: (a.clientX + b.clientX) / 2,
    y: (a.clientY + b.clientY) / 2
  });

  const beginPinch = () => {
    const touches = Array.from(activeTouches.current.values());
    const wrap = wrapRef.current;
    if (touches.length !== 2 || !wrap) return;
    const mid = midpoint(touches[0], touches[1]);
    pinchStart.current = {
      distance: distance(touches[0], touches[1]),
      zoom,
      midpointX: mid.x,
      midpointY: mid.y,
      scrollLeft: wrap.scrollLeft,
      scrollTop: wrap.scrollTop
    };
    drawing.current = false;
  };

  const updatePinch = () => {
    const touches = Array.from(activeTouches.current.values());
    const wrap = wrapRef.current;
    if (touches.length !== 2 || !wrap || pinchStart.current.distance === 0) return;

    const mid = midpoint(touches[0], touches[1]);
    const ratio = distance(touches[0], touches[1]) / pinchStart.current.distance;
    const nextZoom = Math.min(2.5, Math.max(0.4, pinchStart.current.zoom * ratio));
    const zoomRatio = nextZoom / pinchStart.current.zoom;

    setZoom(nextZoom);
    requestAnimationFrame(() => {
      wrap.scrollLeft =
        (pinchStart.current.scrollLeft + pinchStart.current.midpointX - wrap.getBoundingClientRect().left) *
          zoomRatio -
        (mid.x - wrap.getBoundingClientRect().left);
      wrap.scrollTop =
        (pinchStart.current.scrollTop + pinchStart.current.midpointY - wrap.getBoundingClientRect().top) *
          zoomRatio -
        (mid.y - wrap.getBoundingClientRect().top);
    });
  };

  const isInsideSelection = (point: Point, rect: SelectionRect) =>
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height;

  const pointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    canvas.setPointerCapture(event.pointerId);

    if (event.pointerType === "touch") {
      activeTouches.current.set(event.pointerId, {
        clientX: event.clientX,
        clientY: event.clientY
      });
      if (activeTouches.current.size === 2) {
        beginPinch();
        return;
      }
    }

    if (activeTouches.current.size >= 2) return;

    const currentPoint = eventPoint(event);
    drawing.current = true;
    last.current = currentPoint;

    if (tool === "pan" || (event.pointerType === "touch" && tool !== "select")) {
      const wrap = wrapRef.current;
      if (!wrap) return;
      panStart.current = {
        x: event.clientX,
        y: event.clientY,
        left: wrap.scrollLeft,
        top: wrap.scrollTop
      };
      return;
    }

    if (tool === "select") {
      if (selection && isInsideSelection(currentPoint, selection)) {
        selectionMoveStart.current = currentPoint;
        selectionOrigin.current = selection;
        setSelectionOffset({ x: 0, y: 0 });
      } else {
        selectionStart.current = currentPoint;
        setSelection({ x: currentPoint.x, y: currentPoint.y, width: 0, height: 0 });
      }
      return;
    }

    rememberCurrentState();
    if (tool === "line" || tool === "rectangle" || tool === "ellipse") {
      shapeStart.current = currentPoint;
      const ctx = canvas.getContext("2d");
      shapeSnapshot.current = ctx?.getImageData(0, 0, canvas.width, canvas.height) ?? null;
    }
  };

  const drawShapePreview = (currentPoint: Point) => {
    const canvas = canvasRef.current;
    const start = shapeStart.current;
    const snapshot = shapeSnapshot.current;
    if (!canvas || !start || !snapshot) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.putImageData(snapshot, 0, 0);
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = width;
    ctx.strokeStyle = color;

    if (tool === "line") {
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(currentPoint.x, currentPoint.y);
      ctx.stroke();
    } else if (tool === "rectangle") {
      ctx.strokeRect(start.x, start.y, currentPoint.x - start.x, currentPoint.y - start.y);
    } else if (tool === "ellipse") {
      const centerX = (start.x + currentPoint.x) / 2;
      const centerY = (start.y + currentPoint.y) / 2;
      const radiusX = Math.abs(currentPoint.x - start.x) / 2;
      const radiusY = Math.abs(currentPoint.y - start.y) / 2;
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  };

  const pointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (event.pointerType === "touch" && activeTouches.current.has(event.pointerId)) {
      activeTouches.current.set(event.pointerId, {
        clientX: event.clientX,
        clientY: event.clientY
      });
      if (activeTouches.current.size === 2) {
        updatePinch();
        return;
      }
    }

    if (!drawing.current || activeTouches.current.size >= 2) return;

    if (tool === "pan" || (event.pointerType === "touch" && tool !== "select")) {
      const wrap = wrapRef.current;
      if (!wrap) return;
      wrap.scrollLeft = panStart.current.left - (event.clientX - panStart.current.x);
      wrap.scrollTop = panStart.current.top - (event.clientY - panStart.current.y);
      return;
    }

    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const currentPoint = eventPoint(event);

    if (tool === "select") {
      if (selectionMoveStart.current && selectionOrigin.current) {
        setSelectionOffset({
          x: currentPoint.x - selectionMoveStart.current.x,
          y: currentPoint.y - selectionMoveStart.current.y
        });
      } else if (selectionStart.current) {
        const start = selectionStart.current;
        setSelection({
          x: Math.min(start.x, currentPoint.x),
          y: Math.min(start.y, currentPoint.y),
          width: Math.abs(currentPoint.x - start.x),
          height: Math.abs(currentPoint.y - start.y)
        });
      }
      return;
    }

    if (tool === "line" || tool === "rectangle" || tool === "ellipse") {
      drawShapePreview(currentPoint);
      return;
    }

    ctx.save();
    configureStroke(ctx, currentPoint);
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.quadraticCurveTo(
      last.current.x,
      last.current.y,
      (last.current.x + currentPoint.x) / 2,
      (last.current.y + currentPoint.y) / 2
    );
    ctx.stroke();
    ctx.restore();
    last.current = currentPoint;
  };

  const scheduleAutosave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (autosaveTimer.current !== null) window.clearTimeout(autosaveTimer.current);
    autosaveTimer.current = window.setTimeout(() => {
      onSave(canvas.toDataURL("image/png"));
      autosaveTimer.current = null;
    }, 700);
  };

  const moveSelectionOnCanvas = () => {
    const canvas = canvasRef.current;
    const rect = selectionOrigin.current;
    if (!canvas || !rect || (selectionOffset.x === 0 && selectionOffset.y === 0)) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    rememberCurrentState();
    const sx = Math.max(0, Math.round(rect.x));
    const sy = Math.max(0, Math.round(rect.y));
    const sw = Math.min(canvas.width - sx, Math.max(1, Math.round(rect.width)));
    const sh = Math.min(canvas.height - sy, Math.max(1, Math.round(rect.height)));
    const temp = document.createElement("canvas");
    temp.width = sw;
    temp.height = sh;
    temp.getContext("2d")?.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);

    redrawPaperRegion(ctx, { x: sx, y: sy, width: sw, height: sh });
    const dx = Math.max(0, Math.min(canvas.width - sw, sx + Math.round(selectionOffset.x)));
    const dy = Math.max(0, Math.min(canvas.height - sh, sy + Math.round(selectionOffset.y)));
    ctx.drawImage(temp, dx, dy);
    setSelection({ x: dx, y: dy, width: sw, height: sh });
    scheduleAutosave();
  };

  const pointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (event.pointerType === "touch") {
      activeTouches.current.delete(event.pointerId);
      if (activeTouches.current.size < 2) pinchStart.current.distance = 0;
    }

    const shouldSave = drawing.current && !["pan", "select"].includes(tool);

    if (tool === "select") {
      if (selectionMoveStart.current) moveSelectionOnCanvas();
      if (selection && (selection.width < 8 || selection.height < 8)) setSelection(null);
      selectionStart.current = null;
      selectionMoveStart.current = null;
      selectionOrigin.current = null;
      setSelectionOffset({ x: 0, y: 0 });
    }

    drawing.current = false;
    shapeStart.current = null;
    shapeSnapshot.current = null;
    if (shouldSave) scheduleAutosave();
  };

  const undo = () => {
    const canvas = canvasRef.current;
    const previous = history.at(-1);
    if (!canvas || !previous) return;
    setFuture(items => [...items, canvas.toDataURL()]);
    setHistory(items => items.slice(0, -1));
    restoreFromUrl(previous);
    setSelection(null);
    window.setTimeout(scheduleAutosave, 80);
  };

  const redo = () => {
    const canvas = canvasRef.current;
    const next = future.at(-1);
    if (!canvas || !next) return;
    setHistory(items => [...items, canvas.toDataURL()]);
    setFuture(items => items.slice(0, -1));
    restoreFromUrl(next);
    setSelection(null);
    window.setTimeout(scheduleAutosave, 80);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    rememberCurrentState();
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawPaper(ctx, canvas.width, canvas.height);
    setSelection(null);
    scheduleAutosave();
  };

  const copySelection = () => {
    const canvas = canvasRef.current;
    if (!canvas || !selection) return;
    const sx = Math.max(0, Math.round(selection.x));
    const sy = Math.max(0, Math.round(selection.y));
    const sw = Math.min(canvas.width - sx, Math.max(1, Math.round(selection.width)));
    const sh = Math.min(canvas.height - sy, Math.max(1, Math.round(selection.height)));
    const copy = document.createElement("canvas");
    copy.width = sw;
    copy.height = sh;
    copy.getContext("2d")?.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);
    clipboardRef.current = copy;
  };

  const cutSelection = () => {
    const canvas = canvasRef.current;
    if (!canvas || !selection) return;
    copySelection();
    rememberCurrentState();
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    redrawPaperRegion(ctx, selection);
    setSelection(null);
    scheduleAutosave();
  };

  const pasteSelection = () => {
    const canvas = canvasRef.current;
    const copy = clipboardRef.current;
    if (!canvas || !copy) return;
    rememberCurrentState();
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const x = Math.min(canvas.width - copy.width, Math.max(0, (selection?.x ?? 40) + 30));
    const y = Math.min(canvas.height - copy.height, Math.max(0, (selection?.y ?? 40) + 30));
    ctx.drawImage(copy, x, y);
    setSelection({ x, y, width: copy.width, height: copy.height });
    scheduleAutosave();
  };

  const deleteSelection = () => {
    const canvas = canvasRef.current;
    if (!canvas || !selection) return;
    rememberCurrentState();
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    redrawPaperRegion(ctx, selection);
    setSelection(null);
    scheduleAutosave();
  };

  const save = () => {
    const canvas = canvasRef.current;
    if (canvas) onSave(canvas.toDataURL("image/png"));
  };

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "mathmaster-note.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const changeZoom = (nextZoom: number) => {
    setZoom(Math.min(2.5, Math.max(0.4, nextZoom)));
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (!event.ctrlKey) return;
    event.preventDefault();
    changeZoom(zoom + (event.deltaY < 0 ? 0.1 : -0.1));
  };

  const displayedSelection = selection
    ? {
        x: selection.x + selectionOffset.x,
        y: selection.y + selectionOffset.y,
        width: selection.width,
        height: selection.height
      }
    : null;

  return (
    <div className="canvas-section">
      <div className="toolbar">
        <div className="tool-group">
          <button className={tool === "pen" ? "active" : ""} onClick={() => setTool("pen")}>
            <PenLine size={18} /> Stylo
          </button>
          <button className={tool === "highlighter" ? "active" : ""} onClick={() => setTool("highlighter")}>
            <Highlighter size={18} /> Surligneur
          </button>
          <button className={tool === "eraser" ? "active" : ""} onClick={() => setTool("eraser")}>
            <Eraser size={18} /> Gomme
          </button>
          <button className={tool === "pan" ? "active" : ""} onClick={() => setTool("pan")}>
            <Hand size={18} /> Déplacer
          </button>
          <button className={tool === "select" ? "active" : ""} onClick={() => setTool("select")}>
            <MousePointer2 size={18} /> Sélection
          </button>
        </div>

        <div className="tool-group">
          <button className={tool === "line" ? "active" : ""} onClick={() => setTool("line")} title="Tracer un segment">
            <Slash size={18} />
          </button>
          <button className={tool === "rectangle" ? "active" : ""} onClick={() => setTool("rectangle")} title="Tracer un rectangle">
            <RectangleHorizontal size={18} />
          </button>
          <button className={tool === "ellipse" ? "active" : ""} onClick={() => setTool("ellipse")} title="Tracer une ellipse">
            <Circle size={18} />
          </button>
        </div>

        {selection && (
          <div className="tool-group selection-tools">
            <button onClick={copySelection} title="Copier la sélection"><Copy size={17} /></button>
            <button onClick={cutSelection} title="Couper la sélection"><Scissors size={17} /></button>
            <button onClick={pasteSelection} title="Coller"><Clipboard size={17} /></button>
            <button onClick={deleteSelection} title="Supprimer la sélection"><Trash2 size={17} /></button>
          </div>
        )}
        {!selection && clipboardRef.current && (
          <div className="tool-group selection-tools">
            <button onClick={pasteSelection} title="Coller"><ClipboardCopy size={17} /> Coller</button>
          </div>
        )}

        <label>
          Épaisseur
          <input type="range" min="1" max="30" value={width} onChange={event => setWidth(Number(event.target.value))} />
        </label>
        <input className="color-picker" type="color" value={color} onChange={event => setColor(event.target.value)} aria-label="Couleur du trait" />

        <div className="tool-group">
          <button onClick={undo} disabled={history.length === 0}><RotateCcw size={18} /> Annuler</button>
          <button onClick={redo} disabled={future.length === 0}><Redo2 size={18} /> Rétablir</button>
          <button onClick={clear}><Trash2 size={18} /> Effacer</button>
        </div>

        <div className="tool-group zoom-controls">
          <button onClick={() => changeZoom(zoom - 0.1)} title="Dézoomer"><Minus size={17} /></button>
          <button className="zoom-value" onClick={() => changeZoom(0.75)} title="Réinitialiser le zoom">{Math.round(zoom * 100)} %</button>
          <button onClick={() => changeZoom(zoom + 0.1)} title="Zoomer"><Plus size={17} /></button>
        </div>

        <div className="tool-group">
          <button onClick={save}><Save size={18} /> Enregistrer</button>
          <button onClick={download}><Download size={18} /> PNG</button>
        </div>
      </div>

      <p className="canvas-help">
        Page longue activée. Sur tablette : pince à deux doigts pour zoomer et utilise deux doigts pour te déplacer. L’outil Sélection permet de déplacer, copier, couper ou supprimer une zone.
      </p>

      <div className="canvas-wrap canvas-wrap-long" ref={wrapRef} onWheel={handleWheel}>
        <div className="canvas-stage" style={{ width: `${CANVAS_WIDTH * zoom}px`, height: `${CANVAS_HEIGHT * zoom}px` }}>
          <canvas
            ref={canvasRef}
            style={{
              width: `${CANVAS_WIDTH * zoom}px`,
              height: `${CANVAS_HEIGHT * zoom}px`,
              cursor: tool === "pan" ? "grab" : tool === "select" ? "default" : "crosshair"
            }}
            onPointerDown={pointerDown}
            onPointerMove={pointerMove}
            onPointerUp={pointerUp}
            onPointerCancel={pointerUp}
          />
          {displayedSelection && (
            <div
              className="canvas-selection-box"
              style={{
                left: `${displayedSelection.x * zoom}px`,
                top: `${displayedSelection.y * zoom}px`,
                width: `${displayedSelection.width * zoom}px`,
                height: `${displayedSelection.height * zoom}px`
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
