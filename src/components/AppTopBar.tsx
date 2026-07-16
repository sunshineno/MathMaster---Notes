import { BookOpen, Download, Info, Search, ShieldCheck, Upload } from "lucide-react";
import { useState, type ChangeEvent } from "react";
import AboutDialog from "./AboutDialog";
import { APP_VERSION } from "../version";

export type SaveStatus = "saved" | "saving" | "error";

interface AppTopBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  saveStatus: SaveStatus;
  saveError: string;
  persistentStorage: boolean;
  onBackup: () => void;
  onRestore: (event: ChangeEvent<HTMLInputElement>) => void;
  canInstall: boolean;
  onInstall: () => void;
}

export default function AppTopBar({
  search,
  onSearchChange,
  saveStatus,
  saveError,
  persistentStorage,
  onBackup,
  onRestore,
  canInstall,
  onInstall
}: AppTopBarProps) {
  const [aboutOpen, setAboutOpen] = useState(false);

  const saveTitle =
    saveStatus === "error"
      ? saveError
      : persistentStorage
        ? "Stockage persistant activé"
        : "Sauvegarde locale active";

  const saveLabel =
    saveStatus === "saving"
      ? "Sauvegarde…"
      : saveStatus === "error"
        ? "Erreur de sauvegarde"
        : "Enregistré";

  return (
    <header className="topbar">
      <div className="brand">
        <BookOpen />
        <div>
          <strong>MathMaster Notes</strong>
          <span>Cahier numérique de mathématiques</span>
          <button
            className="app-version-badge"
            onClick={() => setAboutOpen(true)}
            title="Afficher les informations de version"
          >
            v{APP_VERSION}
          </button>
        </div>
      </div>

      <div className="topbar-actions">
        <div
          className={`save-indicator save-${saveStatus}`}
          title={saveTitle}
        >
          <ShieldCheck size={17} />
          {saveLabel}
        </div>

        <div className="search">
          <Search size={18} />
          <input
            value={search}
            onChange={event => onSearchChange(event.target.value)}
            placeholder="Rechercher matière, chapitre, page ou contenu…"
          />
        </div>

        <button
          className="backup-button"
          onClick={onBackup}
          title="Télécharger une sauvegarde complète"
        >
          <Download size={18} />
          Sauvegarder
        </button>

        <label
          className="backup-button restore-button"
          title="Restaurer une sauvegarde complète"
        >
          <Upload size={18} />
          Restaurer
          <input
            type="file"
            accept="application/json,.json"
            onChange={onRestore}
          />
        </label>

        <button
          className="about-button"
          onClick={() => setAboutOpen(true)}
          title="À propos de MathMaster Notes"
        >
          <Info size={18} />
          À propos
        </button>

        {canInstall && (
          <button className="install-button" onClick={onInstall}>
            <Download size={18} />
            Installer
          </button>
        )}
      </div>

      <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </header>
  );
}
