import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type { NotePage } from "./types";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export interface PdfImportProgress {
  current: number;
  total: number;
}

export async function importPdfAsPages(
  file: File,
  onProgress?: (progress: PdfImportProgress) => void
): Promise<NotePage[]> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const document = await pdfjsLib.getDocument({ data: bytes }).promise;
  const pages: NotePage[] = [];

  if (document.numPages > 40) {
    throw new Error(
      "Ce premier import accepte jusqu’à 40 pages à la fois. Découpe le PDF en plusieurs parties pour éviter de saturer le stockage de la tablette."
    );
  }

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const pdfPage = await document.getPage(pageNumber);
    const baseViewport = pdfPage.getViewport({ scale: 1 });
    const targetWidth = 1400;
    const scale = targetWidth / baseViewport.width;
    const viewport = pdfPage.getViewport({ scale });
    const rendered = window.document.createElement("canvas");
    rendered.width = Math.round(viewport.width);
    rendered.height = Math.round(viewport.height);
    const context = rendered.getContext("2d", { alpha: false });
    if (!context) throw new Error("Impossible de préparer la page PDF.");

    await pdfPage.render({ canvasContext: context, viewport }).promise;

    const canvas = window.document.createElement("canvas");
    canvas.width = 1400;
    canvas.height = 2400;
    const finalContext = canvas.getContext("2d", { alpha: false });
    if (!finalContext) throw new Error("Impossible de finaliser la page PDF.");
    finalContext.fillStyle = "#ffffff";
    finalContext.fillRect(0, 0, canvas.width, canvas.height);
    const renderedHeight = Math.min(canvas.height, rendered.height);
    finalContext.drawImage(rendered, 0, 0, rendered.width, rendered.height, 0, 0, canvas.width, renderedHeight);

    pages.push({
      id: crypto.randomUUID(),
      title: `PDF ${pageNumber}`,
      dataUrl: "",
      backgroundDataUrl: canvas.toDataURL("image/jpeg", 0.72),
      sourcePdfName: file.name,
      sourcePdfPage: pageNumber,
      paper: "blank",
      latex: "",
      blocks: []
    });

    onProgress?.({ current: pageNumber, total: document.numPages });
    pdfPage.cleanup();
  }

  return pages;
}
