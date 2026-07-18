import { useEffect, useRef, useState } from "react";
import type { PaperType } from "../types";
import DrawingToolbar from "./DrawingToolbar";
import { type DrawingSettings, type DrawingTool, type InputMode } from "../editor/drawingTypes";

interface Props {
  dataUrl: string;
  backgroundDataUrl?: string;
  paper: PaperType;
  onSave: (dataUrl: string) => void;
  onExtractSelection?: (imageDataUrl: string) => void;
}

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
const DRAWING_SETTINGS_KEY = "mathmaster-drawing-settings-v1";

const DEFAULT_DRAWING_SETTINGS: DrawingSettings = {
  tool: "pen",
  width: 4,
  color: "#111827",
  zoom: 0.75,
  inputMode: "stylus",
  palmRejection: true
};

function loadDrawingSettings(): DrawingSettings {
  try {
    const saved = localStorage.getItem(DRAWING_SETTINGS_KEY);
    return saved
      ? { ...DEFAULT_DRAWING_SETTINGS, ...JSON.parse(saved) }
      : DEFAULT_DRAWING_SETTINGS;
  } catch {
    return DEFAULT_DRAWING_SETTINGS;
  }
}

export default function CanvasBoard({ dataUrl, backgroundDataUrl, paper, onSave, onExtractSelection }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const drawing = useRef(false);
  const last = useRef<Point>({ x: 0, y: 0, pressure: 0.5 });
  const shapeStart = useRef<Point | null>(null);
  const shapeSnapshot = useRef<ImageData | null>(null);
  const panStart = useRef({ x: 0, y: 0, left: 0, top: 0 });
  const autosaveTimer = useRef<number | null>(null);
  const onSaveRef = useRef(onSave);
  const dirtyRef = useRef(false);
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
  const ignoredPointers = useRef<Set<number>>(new Set());
  const penActiveUntil = useRef(0);

  const initialSettings = useRef(loadDrawingSettings());
  const [tool, setTool] = useState<DrawingTool>(initialSettings.current.tool);
  const [width, setWidth] = useState(initialSettings.current.width);
  const [color, setColor] = useState(initialSettings.current.color);
  const [zoom, setZoom] = useState(initialSettings.current.zoom);
  const [history, setHistory] = useState<string[]>([]);
  const [future, setFuture] = useState<string[]>([]);
  const [selection, setSelection] = useState<SelectionRect | null>(null);
  const [selectionOffset, setSelectionOffset] = useState({ x: 0, y: 0 });
  const [inputMode, setInputMode] = useState<InputMode>(
    initialSettings.current.inputMode
  );
  const [palmRejection, setPalmRejection] = useState(
    initialSettings.current.palmRejection
  );
  const [compactToolbar, setCompactToolbar] = useState(false);
  const temporaryTool = useRef<DrawingTool | null>(null);

  useEffect(() => {
    const settings: DrawingSettings = {
      tool,
      width,
      color,
      zoom,
      inputMode,
      palmRejection
    };
    localStorage.setItem(DRAWING_SETTINGS_KEY, JSON.stringify(settings));
  }, [tool, width, color, zoom, inputMode, palmRejection]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable;

      if (isTyping) return;

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
        return;
      }

      if (event.code === "Space" && !temporaryTool.current) {
        event.preventDefault();
        temporaryTool.current = tool;
        setTool("pan");
        return;
      }

      switch (event.key.toLowerCase()) {
        case "p":
          setTool("pen");
          break;
        case "h":
          setTool("highlighter");
          break;
        case "e":
          setTool("eraser");
          break;
        case "s":
          setTool("select");
          break;
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === "Space" && temporaryTool.current) {
        setTool(temporaryTool.current);
        temporaryTool.current = null;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [tool, history, future]);

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

    if (backgroundDataUrl) {
      ctx.clearRect(x, y, right - x, bottom - y);
      return;
    }

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

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!backgroundDataUrl) {
      drawPaper(ctx, canvas.width, canvas.height);
    }
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
  }, [dataUrl, backgroundDataUrl, paper]);

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
      ctx.globalCompositeOperation = backgroundDataUrl ? "destination-out" : "source-over";
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


  const isPalmContact = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (event.pointerType !== "touch") return false;

    const contactSize = Math.max(event.width || 0, event.height || 0);
    const penWasRecentlyActive = Date.now() < penActiveUntil.current;

    return palmRejection && (contactSize >= 32 || penWasRecentlyActive);
  };

  const canDrawWithPointer = (
    event: React.PointerEvent<HTMLCanvasElement>
  ) => {
    if (inputMode === "read") return false;
    if (event.pointerType === "pen") return true;
    if (event.pointerType === "mouse") return true;
    return inputMode === "hybrid";
  };

  const pointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;

    if (event.pointerType === "pen") {
      penActiveUntil.current = Date.now() + 1600;
    }

    if (event.pointerType === "touch" && isPalmContact(event)) {
      ignoredPointers.current.add(event.pointerId);
      return;
    }

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

      if (inputMode === "stylus") {
        drawing.current = false;
        return;
      }
    }

    if (activeTouches.current.size >= 2) return;

    const currentPoint = eventPoint(event);
    drawing.current = true;
    last.current = currentPoint;

    const navigationOnly =
      inputMode === "read" ||
      tool === "pan" ||
      (event.pointerType === "touch" && inputMode !== "hybrid");

    if (navigationOnly) {
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

    if (!canDrawWithPointer(event) && tool !== "select") {
      drawing.current = false;
      return;
    }

    if (tool === "select") {
      if (selection && isInsideSelection(currentPoint, selection)) {
        selectionMoveStart.current = currentPoint;
        selectionOrigin.current = selection;
        setSelectionOffset({ x: 0, y: 0 });
      } else {
        selectionStart.current = currentPoint;
        setSelection({
          x: currentPoint.x,
          y: currentPoint.y,
          width: 0,
          height: 0
        });
      }
      return;
    }

    rememberCurrentState();

    if (tool === "line" || tool === "rectangle" || tool === "ellipse") {
      shapeStart.current = currentPoint;
      const ctx = canvas.getContext("2d");
      shapeSnapshot.current =
        ctx?.getImageData(0, 0, canvas.width, canvas.height) ?? null;
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
    if (ignoredPointers.current.has(event.pointerId)) return;

    if (event.pointerType === "pen") {
      penActiveUntil.current = Date.now() + 1600;
    }

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

    if (
      inputMode === "read" ||
      tool === "pan" ||
      (event.pointerType === "touch" && inputMode !== "hybrid")
    ) {
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

    dirtyRef.current = true;
    if (autosaveTimer.current !== null) window.clearTimeout(autosaveTimer.current);
    autosaveTimer.current = window.setTimeout(() => {
      onSaveRef.current(canvas.toDataURL("image/png"));
      dirtyRef.current = false;
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
    if (ignoredPointers.current.has(event.pointerId)) {
      ignoredPointers.current.delete(event.pointerId);
      return;
    }

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


  const convertSelectionToLatex = () => {
    const canvas = canvasRef.current;
    if (!canvas || !selection || !onExtractSelection) return;

    const sx = Math.max(0, Math.round(selection.x));
    const sy = Math.max(0, Math.round(selection.y));
    const sw = Math.min(canvas.width - sx, Math.max(1, Math.round(selection.width)));
    const sh = Math.min(canvas.height - sy, Math.max(1, Math.round(selection.height)));
    const extracted = document.createElement("canvas");
    extracted.width = sw;
    extracted.height = sh;
    const extractedContext = extracted.getContext("2d");
    if (!extractedContext) return;

    extractedContext.fillStyle = "#ffffff";
    extractedContext.fillRect(0, 0, sw, sh);
    extractedContext.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);
    onExtractSelection(extracted.toDataURL("image/png"));
  };

  const save = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    onSaveRef.current(canvas.toDataURL("image/png"));
    dirtyRef.current = false;
  };

  const download = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let href = canvas.toDataURL("image/png");
    if (backgroundDataUrl) {
      const merged = document.createElement("canvas");
      merged.width = canvas.width;
      merged.height = canvas.height;
      const mergedContext = merged.getContext("2d");
      if (mergedContext) {
        const background = new Image();
        await new Promise<void>((resolve, reject) => {
          background.onload = () => resolve();
          background.onerror = () => reject(new Error("Fond PDF illisible"));
          background.src = backgroundDataUrl;
        });
        mergedContext.drawImage(background, 0, 0, merged.width, merged.height);
        mergedContext.drawImage(canvas, 0, 0);
        href = merged.toDataURL("image/png");
      }
    }

    const link = document.createElement("a");
    link.download = "mathmaster-note.png";
    link.href = href;
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
      <DrawingToolbar
        tool={tool}
        width={width}
        color={color}
        zoom={zoom}
        inputMode={inputMode}
        palmRejection={palmRejection}
        compactToolbar={compactToolbar}
        hasSelection={Boolean(selection)}
        hasClipboard={Boolean(clipboardRef.current)}
        canUndo={history.length > 0}
        canRedo={future.length > 0}
        onToolChange={setTool}
        onWidthChange={setWidth}
        onColorChange={setColor}
        onZoomChange={changeZoom}
        onInputModeChange={setInputMode}
        onPalmRejectionChange={setPalmRejection}
        onCompactToolbarChange={setCompactToolbar}
        onCopySelection={copySelection}
        onCutSelection={cutSelection}
        onPasteSelection={pasteSelection}
        onDeleteSelection={deleteSelection}
        onConvertSelectionToLatex={convertSelectionToLatex}
        onUndo={undo}
        onRedo={redo}
        onClear={clear}
        onSave={save}
        onDownload={download}
      />

      <p className="canvas-help">
        Page longue activée. Sur tablette : pince à deux doigts pour zoomer et utilise deux doigts pour te déplacer. L’outil Sélection permet de déplacer, copier, couper ou supprimer une zone.
      </p>

      <div className="canvas-wrap canvas-wrap-long" ref={wrapRef} onWheel={handleWheel}>
        <div className={`canvas-stage ${backgroundDataUrl ? "pdf-canvas-stage" : ""}`} style={{ width: `${CANVAS_WIDTH * zoom}px`, height: `${CANVAS_HEIGHT * zoom}px` }}>
          {backgroundDataUrl && (
            <img
              className="pdf-page-background"
              src={backgroundDataUrl}
              alt="Page PDF importée"
              draggable={false}
            />
          )}
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
