import { BookOpen, CheckCircle2, Github, X } from "lucide-react";
import { APP_VERSION, formatBuildDate } from "../version";

interface AboutDialogProps {
  open: boolean;
  onClose: () => void;
}

const FEATURES = [
  "Matières, chapitres et gestionnaire de pages",
  "Écriture au stylet et rejet de paume",
  "Sauvegarde automatique et restauration",
  "Import et annotation de PDF",
  "Export PDF, PNG et LaTeX",
  "Blocs mathématiques colorés"
];

export default function AboutDialog({ open, onClose }: AboutDialogProps) {
  if (!open) return null;

  return (
    <div className="about-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="about-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-title"
        onMouseDown={event => event.stopPropagation()}
      >
        <header className="about-header">
          <div className="about-brand">
            <BookOpen size={30} />
            <div>
              <h2 id="about-title">MathMaster Notes</h2>
              <p>Cahier numérique spécialisé pour les mathématiques</p>
            </div>
          </div>
          <button className="about-close" onClick={onClose} aria-label="Fermer">
            <X size={20} />
          </button>
        </header>

        <div className="about-version-card">
          <strong>Version {APP_VERSION}</strong>
          <span>Compilation : {formatBuildDate()}</span>
        </div>

        <div className="about-section">
          <h3>Fonctions disponibles</h3>
          <div className="about-feature-list">
            {FEATURES.map(feature => (
              <div key={feature}>
                <CheckCircle2 size={17} />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="about-section">
          <h3>Prochaine étape</h3>
          <p>Tests réels sur tablette, correction des bugs bloquants, puis préparation de l’application installable.</p>
        </div>

        <a
          className="about-github-link"
          href="https://github.com/sunshineno/MathMaster---Notes"
          target="_blank"
          rel="noreferrer"
        >
          <Github size={18} />
          Ouvrir le dépôt GitHub
        </a>
      </section>
    </div>
  );
}
