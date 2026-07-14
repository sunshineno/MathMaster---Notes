import { useEffect, useRef, useState } from "react";
import { Eraser, PenLine, RotateCcw, Trash2, Download, Save } from "lucide-react";
import type { PaperType } from "../types";

interface Props {
  dataUrl: string;
  paper: PaperType;
  onSave: (dataUrl: string) => void;
}

type Tool = "pen" | "eraser";

export default function CanvasBoard({ dataUrl, paper, onSave }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef({ x: 0, y: 0 });
  const [tool, setTool] = useState<Tool>("pen");
  const [width, setWidth] = useState(4);
  const [color, setColor] = useState("#111827");
  const [history, setHistory] = useState<string[]>([]);

  const drawPaper = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#dbeafe";
    ctx.fillStyle = "#bfdbfe";
    ctx.lineWidth = 1;

    if (paper === "grid") {
      for (let x = 0; x < w; x += 24) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y < h; y += 24) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
    }
    if (paper === "lined") {
      for (let y = 40; y < h; y += 32) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
    }
    if (paper === "dots") {
      for (let x = 16; x < w; x += 24) {
        for (let y = 16; y < h; y += 24) {
          ctx.beginPath(); ctx.arc(x, y, 1.2, 0, Math.PI * 2); ctx.fill();
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
    image.onload = () => ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    image.src = url;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = 1400;
    canvas.height = 1000;
    loadImage(dataUrl);
  }, [dataUrl, paper]);

  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height)
    };
  };

  const pointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    canvas.setPointerCapture(event.pointerId);
    setHistory(prev => [...prev.slice(-19), canvas.toDataURL()]);
    drawing.current = true;
    last.current = point(event);
  };

  const pointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const next = point(event);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = width * (event.pointerType === "pen" ? Math.max(0.55, event.pressure || 0.7) : 1);
    ctx.strokeStyle = color;
    ctx.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(next.x, next.y);
    ctx.stroke();
    last.current = next;
  };

  const pointerUp = () => {
    drawing.current = false;
  };

  const save = () => {
    const canvas = canvasRef.current;
    if (canvas) onSave(canvas.toDataURL("image/png"));
  };

  const undo = () => {
    const previous = history.at(-1);
    if (!previous) return;
    setHistory(h => h.slice(0, -1));
    loadImage(previous);
  };

  const clear = () => {
    const canvas = canvasRef.current!;
    setHistory(prev => [...prev.slice(-19), canvas.toDataURL()]);
    const ctx = canvas.getContext("2d")!;
    drawPaper(ctx, canvas.width, canvas.height);
  };

  const download = () => {
    const canvas = canvasRef.current!;
    const link = document.createElement("a");
    link.download = "mathmaster-note.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  return (
    <div className="canvas-section">
      <div className="toolbar">
        <button className={tool === "pen" ? "active" : ""} onClick={() => setTool("pen")}><PenLine size={18}/> Stylo</button>
        <button className={tool === "eraser" ? "active" : ""} onClick={() => setTool("eraser")}><Eraser size={18}/> Gomme</button>
        <label>Épaisseur <input type="range" min="1" max="30" value={width} onChange={e => setWidth(Number(e.target.value))}/></label>
        <input className="color-picker" type="color" value={color} onChange={e => setColor(e.target.value)}/>
        <button onClick={undo}><RotateCcw size={18}/> Annuler</button>
        <button onClick={clear}><Trash2 size={18}/> Effacer</button>
        <button onClick={save}><Save size={18}/> Enregistrer</button>
        <button onClick={download}><Download size={18}/> PNG</button>
      </div>
      <div className="canvas-wrap">
        <canvas
          ref={canvasRef}
          onPointerDown={pointerDown}
          onPointerMove={pointerMove}
          onPointerUp={pointerUp}
          onPointerCancel={pointerUp}
        />
      </div>
    </div>
  );
}