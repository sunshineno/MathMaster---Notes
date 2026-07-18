import { useEffect, useId, useRef, useState } from "react";
import { Check, Clipboard, Sigma, X } from "lucide-react";

declare global {
  interface Window {
    MathJax?: {
      typesetClear?: (elements?: HTMLElement[]) => void;
      typesetPromise?: (elements?: HTMLElement[]) => Promise<void>;
    };
  }
}

interface Props {
  imageDataUrl: string;
  initialLatex?: string;
  onClose: () => void;
  onInsert: (latex: string) => void;
}

export default function LatexSelectionDialog({
  imageDataUrl,
  initialLatex = "",
  onClose,
  onInsert
}: Props) {
  const [latex, setLatex] = useState(initialLatex);
  const [copied, setCopied] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    const preview = previewRef.current;
    if (!preview) return;
    preview.textContent = latex.trim() ? `\\[${latex}\\]` : "Saisis une formule LaTeX pour afficher l’aperçu.";

    if (latex.trim() && window.MathJax?.typesetPromise) {
      window.MathJax.typesetClear?.([preview]);
      void window.MathJax.typesetPromise([preview]).catch(() => undefined);
    }
  }, [latex]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const copyLatex = async () => {
    if (!latex.trim()) return;
    await navigator.clipboard.writeText(latex);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="latex-selection-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="latex-selection-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={event => event.stopPropagation()}
      >
        <header>
          <div>
            <h2 id={titleId}><Sigma size={21} /> Éditeur de formule LaTeX</h2>
            <p>La zone manuscrite reste intacte. Corrige puis insère le code dans la page.</p>
          </div>
          <button onClick={onClose} aria-label="Fermer"><X size={20} /></button>
        </header>

        <div className="latex-selection-content">
          <div className="latex-source-panel">
            <h3>Zone sélectionnée</h3>
            <div className="latex-selection-image-wrap">
              <img src={imageDataUrl} alt="Formule manuscrite sélectionnée" />
            </div>
            <p className="latex-ocr-note">
              Reconnaissance automatique à venir. Pour cette version, saisis ou corrige manuellement la formule.
            </p>
          </div>

          <div className="latex-editor-panel">
            <label htmlFor="latex-selection-input">Code LaTeX</label>
            <textarea
              id="latex-selection-input"
              autoFocus
              value={latex}
              onChange={event => setLatex(event.target.value)}
              placeholder="Exemple : \\int_0^1 x^2 \\, dx = \\frac{1}{3}"
              spellCheck={false}
            />

            <h3>Aperçu</h3>
            <div className="latex-live-preview" ref={previewRef} />
          </div>
        </div>

        <footer>
          <button className="latex-secondary-button" onClick={copyLatex} disabled={!latex.trim()}>
            <Clipboard size={17} /> {copied ? "Copié" : "Copier"}
          </button>
          <div>
            <button className="latex-secondary-button" onClick={onClose}>Annuler</button>
            <button className="latex-primary-button" onClick={() => onInsert(latex.trim())} disabled={!latex.trim()}>
              <Check size={17} /> Insérer dans la page
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
