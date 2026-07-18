import { useEffect, useRef, useState } from "react";
import { Clipboard, Download, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { latexPreamble, downloadTextFile } from "../latexTemplate";

interface Props {
  title: string;
  body: string;
  onChange: (body: string) => void;
}

declare global {
  interface Window {
    MathJax?: {
      typesetClear?: (elements?: HTMLElement[]) => void;
      typesetPromise?: (elements?: HTMLElement[]) => Promise<void>;
    };
  }
}

export default function LatexWorkspace({ title, body, onChange }: Props) {
  const [showPreview, setShowPreview] = useState(true);
  const [copied, setCopied] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const documentText = `${latexPreamble}\n\n\\begin{document}\n\n${body}\n\n\\end{document}\n`;

  useEffect(() => {
    const preview = previewRef.current;
    if (!preview) return;
    preview.innerHTML = body.trim()
      ? body
          .replace(/\\section\*?\{([^}]*)\}/g, "<h2>$1</h2>")
          .replace(/\\subsection\*?\{([^}]*)\}/g, "<h3>$1</h3>")
          .replace(/\\begin\{(?:theoreme|definition|lemme|proposition|corollaire|remarque|exemple)\}/g, '<div class="latex-preview-box">')
          .replace(/\\end\{(?:theoreme|definition|lemme|proposition|corollaire|remarque|exemple)\}/g, "</div>")
          .replace(/\\begin\{proof\}/g, '<div class="latex-preview-proof"><strong>Démonstration.</strong> ')
          .replace(/\\end\{proof\}/g, " □</div>")
          .replace(/\n/g, "<br />")
      : '<p class="latex-preview-empty">Commence à écrire entre <code>\\begin{document}</code> et <code>\\end{document}</code>.</p>';

    window.MathJax?.typesetClear?.([preview]);
    void window.MathJax?.typesetPromise?.([preview]).catch(() => undefined);
  }, [body, showPreview]);

  const copy = async () => {
    await navigator.clipboard.writeText(documentText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1300);
  };

  const safeName = title.toLowerCase().replace(/[^a-z0-9à-ÿ]+/gi, "-") || "document";

  return (
    <section className={`latex-workspace ${showPreview ? "with-preview" : ""}`}>
      <header className="latex-workspace-header">
        <div>
          <h2>Espace LaTeX</h2>
          <p>Le préambule et les balises du document sont déjà prêts. Écris librement au centre.</p>
        </div>
        <div>
          <button onClick={() => setShowPreview(value => !value)}>
            {showPreview ? <PanelLeftClose size={17} /> : <PanelLeftOpen size={17} />}
            {showPreview ? "Masquer l’aperçu" : "Afficher l’aperçu"}
          </button>
          <button onClick={copy}><Clipboard size={17} /> {copied ? "Copié" : "Copier le .tex"}</button>
          <button onClick={() => downloadTextFile(`${safeName}.tex`, documentText)}><Download size={17} /> Télécharger .tex</button>
        </div>
      </header>

      <div className="latex-workspace-grid">
        <div className="latex-code-column">
          <pre className="latex-locked-code">{latexPreamble}{"\n\n"}\\begin&#123;document&#125;</pre>
          <textarea
            value={body}
            onChange={event => onChange(event.target.value)}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            placeholder={"\\section{Introduction}\n\nSoit $E$ un espace vectoriel.\n\n\\begin{theoreme}\n...\n\\end{theoreme}"}
            aria-label="Corps du document LaTeX"
          />
          <pre className="latex-locked-code">\\end&#123;document&#125;</pre>
        </div>

        {showPreview && (
          <div className="latex-preview-column">
            <div className="latex-preview-paper" ref={previewRef} />
          </div>
        )}
      </div>
    </section>
  );
}
