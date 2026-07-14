import { useEffect, useRef, useState } from "react";
import {
  Circle,
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
  | "line"
  | "rectangle"
  | "ellipse";

interface Point {
  x: number;
  y: number;
  pressure: number;
}

export default function CanvasBoard({ dataUrl, paper, onSave }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const drawing = useRef(false);
  const last = useRef<Point>({ x: 0, y: 0, pressure: 0.5 });
  const shapeStart = useRef<Point | null>(null);
  const shapeSnapshot = useRef<string | null>(null);
  const panStart = useRef({ x: 0, y: 0, left: 0, top: 0 });
  const autosaveTimer = useRef<number | null>(null);

  const [tool, setTool] = useState<Tool>("pen");
  const [width, setWidth] = useState(4);
  const [color, setColor] = useState("#111827");
  const [zoom, setZoom] = useState(1);
  const [history, setHistory] = useState<string[]>([]);
  const [future, setFuture] = useState<string[]>([]);

  const canvasWidth = 1400;
  const canvasHeight = 1000;

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

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    loadImage(dataUrl);
    setHistory([]);
    setFuture([]);
  }, [dataUrl, paper]);

  const point = (event: React.PointerEvent<HTMLCanvasElement>): Point => {
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

    setHistory(previous => [...previous.slice(-29), canvas.toDataURL()]);
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
      ctx.globalCompositeOperation = "destination-out";
      ctx.globalAlpha = 1;
      ctx.lineWidth = Math.max(12, width * 3);
      return;
    }

    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = color;

    if (tool === "highlighter") {
      ctx.globalAlpha = 0.28;
      ctx.lineWidth = Math.max(14, width * 4);
      return;
    }

    ctx.globalAlpha = 1;
    const pressureFactor =
      currentPoint.pressure > 0 ? Math.max(0.45, currentPoint.pressure * 1.35) : 1;
    ctx.lineWidth = width * pressureFactor;
  };

  const pointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const currentPoint = point(event);

    canvas.setPointerCapture(event.pointerId);
    drawing.current = true;
    last.current = currentPoint;

    if (tool === "pan") {
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

    rememberCurrentState();

    if (tool === "line" || tool === "rectangle" || tool === "ellipse") {
      shapeStart.current = currentPoint;
      shapeSnapshot.current = canvas.toDataURL();
    }
  };

  const drawShapePreview = (currentPoint: Point) => {
    const canvas = canvasRef.current;
    const start = shapeStart.current;
    const snapshot = shapeSnapshot.current;
    if (!canvas || !start || !snapshot) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const image = new Image();
    image.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      ctx.save();
      configureStroke(ctx, currentPoint);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      ctx.lineWidth = width;
      ctx.strokeStyle = color;

      if (tool === "line") {
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(currentPoint.x, currentPoint.y);
        ctx.stroke();
      }

      if (tool === "rectangle") {
        ctx.strokeRect(
          start.x,
          start.y,
          currentPoint.x - start.x,
          currentPoint.y - start.y
        );
      }

      if (tool === "ellipse") {
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
    image.src = snapshot;
  };

  const pointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;

    if (tool === "pan") {
      const wrap = wrapRef.current;
      if (!wrap) return;

      wrap.scrollLeft =
        panStart.current.left - (event.clientX - panStart.current.x);
      wrap.scrollTop =
        panStart.current.top - (event.clientY - panStart.current.y);
      return;
    }

    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const currentPoint = point(event);

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

    if (autosaveTimer.current !== null) {
      window.clearTimeout(autosaveTimer.current);
    }

    autosaveTimer.current = window.setTimeout(() => {
      onSave(canvas.toDataURL("image/png"));
      autosaveTimer.current = null;
    }, 700);
  };

  const pointerUp = () => {
    const shouldSave = drawing.current && tool !== "pan";
    drawing.current = false;
    shapeStart.current = null;
    shapeSnapshot.current = null;

    if (shouldSave) {
      scheduleAutosave();
    }
  };

  const undo = () => {
    const canvas = canvasRef.current;
    const previous = history.at(-1);
    if (!canvas || !previous) return;

    setFuture(items => [...items, canvas.toDataURL()]);
    setHistory(items => items.slice(0, -1));
    restoreFromUrl(previous);
    window.setTimeout(scheduleAutosave, 50);
  };

  const redo = () => {
    const canvas = canvasRef.current;
    const next = future.at(-1);
    if (!canvas || !next) return;

    setHistory(items => [...items, canvas.toDataURL()]);
    setFuture(items => items.slice(0, -1));
    restoreFromUrl(next);
    window.setTimeout(scheduleAutosave, 50);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    rememberCurrentState();
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    drawPaper(ctx, canvas.width, canvas.height);
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
    setZoom(Math.min(2.5, Math.max(0.5, nextZoom)));
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (!event.ctrlKey) return;
    event.preventDefault();
    changeZoom(zoom + (event.deltaY < 0 ? 0.1 : -0.1));
  };

  return (
    <div className="canvas-section">
      <div className="toolbar">
        <div className="tool-group">
          <button
            className={tool === "pen" ? "active" : ""}
            onClick={() => setTool("pen")}
          >
            <PenLine size={18} /> Stylo
          </button>
          <button
            className={tool === "highlighter" ? "active" : ""}
            onClick={() => setTool("highlighter")}
          >
            <Highlighter size={18} /> Surligneur
          </button>
          <button
            className={tool === "eraser" ? "active" : ""}
            onClick={() => setTool("eraser")}
          >
            <Eraser size={18} /> Gomme
          </button>
          <button
            className={tool === "pan" ? "active" : ""}
            onClick={() => setTool("pan")}
          >
            <Hand size={18} /> Déplacer
          </button>
        </div>

        <div className="tool-group">
          <button
            className={tool === "line" ? "active" : ""}
            onClick={() => setTool("line")}
            title="Tracer un segment"
          >
            <Slash size={18} />
          </button>
          <button
            className={tool === "rectangle" ? "active" : ""}
            onClick={() => setTool("rectangle")}
            title="Tracer un rectangle"
          >
            <RectangleHorizontal size={18} />
          </button>
          <button
            className={tool === "ellipse" ? "active" : ""}
            onClick={() => setTool("ellipse")}
            title="Tracer une ellipse"
          >
            <Circle size={18} />
          </button>
        </div>

        <label>
          Épaisseur
          <input
            type="range"
            min="1"
            max="30"
            value={width}
            onChange={event => setWidth(Number(event.target.value))}
          />
        </label>

        <input
          className="color-picker"
          type="color"
          value={color}
          onChange={event => setColor(event.target.value)}
          aria-label="Couleur du trait"
        />

        <div className="tool-group">
          <button onClick={undo} disabled={history.length === 0}>
            <RotateCcw size={18} /> Annuler
          </button>
          <button onClick={redo} disabled={future.length === 0}>
            <Redo2 size={18} /> Rétablir
          </button>
          <button onClick={clear}>
            <Trash2 size={18} /> Effacer
          </button>
        </div>

        <div className="tool-group zoom-controls">
          <button onClick={() => changeZoom(zoom - 0.1)} title="Dézoomer">
            <Minus size={17} />
          </button>
          <button
            className="zoom-value"
            onClick={() => changeZoom(1)}
            title="Réinitialiser le zoom"
          >
            {Math.round(zoom * 100)} %
          </button>
          <button onClick={() => changeZoom(zoom + 0.1)} title="Zoomer">
            <Plus size={17} />
          </button>
        </div>

        <div className="tool-group">
          <button onClick={save}>
            <Save size={18} /> Enregistrer
          </button>
          <button onClick={download}>
            <Download size={18} /> PNG
          </button>
        </div>
      </div>

      <p className="canvas-help">
        Sauvegarde automatique activée. Maintiens <strong>Ctrl</strong> et utilise
        la molette pour zoomer. Active « Déplacer » pour faire glisser la feuille.
      </p>

      <div className="canvas-wrap" ref={wrapRef} onWheel={handleWheel}>
        <div
          className="canvas-stage"
          style={{
            width: `${canvasWidth * zoom}px`,
            height: `${canvasHeight * zoom}px`
          }}
        >
          <canvas
            ref={canvasRef}
            style={{
              width: `${canvasWidth * zoom}px`,
              height: `${canvasHeight * zoom}px`,
              cursor: tool === "pan" ? "grab" : "crosshair"
            }}
            onPointerDown={pointerDown}
            onPointerMove={pointerMove}
            onPointerUp={pointerUp}
            onPointerCancel={pointerUp}
          />
        </div>
      </div>
    </div>
  );
}
