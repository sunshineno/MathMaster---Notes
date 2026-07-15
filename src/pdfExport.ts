import { jsPDF } from "jspdf";
import type { Chapter, NotePage, Subject } from "./types";

function safeFileName(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase();
}

function addWrappedText(pdf: jsPDF, text: string, x: number, y: number, maxWidth: number) {
  const lines = pdf.splitTextToSize(text, maxWidth);
  pdf.text(lines, x, y);
  return y + lines.length * 4.5;
}

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Une image de page est illisible."));
    image.src = source;
  });
}

async function getMergedPageImage(page: NotePage) {
  if (!page.backgroundDataUrl) return page.dataUrl;

  const background = await loadImage(page.backgroundDataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = background.naturalWidth || 1400;
  canvas.height = background.naturalHeight || 2400;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Impossible de composer la page PDF.");

  context.drawImage(background, 0, 0, canvas.width, canvas.height);

  if (page.dataUrl) {
    const annotations = await loadImage(page.dataUrl);
    context.drawImage(annotations, 0, 0, canvas.width, canvas.height);
  }

  return canvas.toDataURL("image/jpeg", 0.92);
}

export async function exportChapterToPdf(subject: Subject, chapter: Chapter) {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  const pageWidth = 210, pageHeight = 297, margin = 14;
  let first = true;

  for (const notePage of chapter.pages) {
    if (!first) pdf.addPage();
    first = false;
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(16); pdf.text(chapter.title, margin, 15);
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(10); pdf.setTextColor(90);
    pdf.text(`${subject.title} — ${notePage.title}`, margin, 22); pdf.setTextColor(0);
    let y = 28;

    const pageImage = await getMergedPageImage(notePage);
    if (pageImage) {
      const props = pdf.getImageProperties(pageImage);
      const maxWidth = pageWidth - margin * 2, maxHeight = 230;
      let width = maxWidth, height = width / (props.width / props.height);
      if (height > maxHeight) { height = maxHeight; width = height * (props.width / props.height); }
      pdf.addImage(pageImage, pageImage.startsWith("data:image/jpeg") ? "JPEG" : "PNG", (pageWidth-width)/2, y, width, height, undefined, "FAST");
      y += height + 8;
    }

    const blocks = notePage.blocks ?? [];
    const fallback = notePage.latex.trim();
    if (blocks.length || fallback) {
      if (y > pageHeight - 40) { pdf.addPage(); y = margin; }
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(12); pdf.text("Contenu structuré", margin, y); y += 7;
      pdf.setFontSize(9);
      if (blocks.length) {
        for (const block of blocks) {
          if (y > pageHeight - 28) { pdf.addPage(); y = margin; }
          pdf.setFont("helvetica", "bold"); pdf.text(block.title || block.type, margin, y); y += 5;
          pdf.setFont("helvetica", "normal");
          y = addWrappedText(pdf, block.content.trim() || "(bloc vide)", margin, y, pageWidth-margin*2) + 5;
        }
      } else { pdf.setFont("helvetica","normal"); addWrappedText(pdf, fallback, margin, y, pageWidth-margin*2); }
    }
  }
  pdf.save(`${safeFileName(`${subject.title}-${chapter.title}`) || "mathmaster-chapitre"}.pdf`);
}
