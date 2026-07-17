import { BookOpen, Download, ExternalLink, HelpCircle, History, LogOut, Search, ShieldCheck, Upload, UserCircle, X } from "lucide-react";
import { useState, type ChangeEvent } from "react";
import { APP_VERSION, BUILD_COMMIT, BUILD_DATE_LABEL, VERSION_LABEL } from "../version";
import { useAuth } from "../auth/AuthProvider";

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
  onOpenSnapshots: () => void;
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
  onInstall,
  onOpenSnapshots
}: AppTopBarProps) {
  const [aboutOpen, setAboutOpen] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    setSignOutError("");
    try {
      await signOut();
    } catch (error) {
      setSignOutError(
        error instanceof Error ? error.message : "Déconnexion impossible."
      );
    }
  };

  const saveTitle = saveStatus === "error" ? saveError : persistentStorage ? "Stockage persistant activé" : "Sauvegarde locale active";
  const saveLabel = saveStatus === "saving" ? "Sauvegarde…" : saveStatus === "error" ? "Erreur de sauvegarde" : "Enregistré";

  return <>
    <header className="topbar">
      <div className="brand"><BookOpen/><div><div className="brand-title-line"><strong>MathMaster Notes</strong><button className="version-badge" onClick={()=>setAboutOpen(true)} title={`Version ${APP_VERSION} — build ${BUILD_COMMIT}`}>{VERSION_LABEL}</button></div><span>Cahier numérique de mathématiques</span></div></div>
      <div className="topbar-actions">
        <div className={`save-indicator save-${saveStatus}`} title={saveTitle}><ShieldCheck size={17}/>{saveLabel}</div>
        <div className="search"><Search size={18}/><input value={search} onChange={e=>onSearchChange(e.target.value)} placeholder="Rechercher matière, chapitre, page ou contenu…"/></div>
        <button className="backup-button" onClick={onBackup}><Download size={18}/>Sauvegarder</button>
        <label className="backup-button restore-button"><Upload size={18}/>Restaurer<input type="file" accept="application/json,.json" onChange={onRestore}/></label>
        <button className="about-button" onClick={onOpenSnapshots} title="Historique de sécurité"><History size={18}/>Historique</button>
        <button className="about-button" onClick={()=>setAboutOpen(true)}><HelpCircle size={18}/>À propos</button>
        <div className="account-menu" title={user.email ?? "Compte connecté"}>
          <UserCircle size={18}/>
          <span>{user.email}</span>
          <button onClick={handleSignOut} title="Se déconnecter">
            <LogOut size={17}/>
          </button>
        </div>
        {canInstall&&<button className="install-button" onClick={onInstall}><Download size={18}/>Installer</button>}
      </div>
    </header>
    {signOutError && <div className="account-error">{signOutError}</div>}
    {aboutOpen&&<div className="about-backdrop" onMouseDown={()=>setAboutOpen(false)}><section className="about-dialog" role="dialog" aria-modal="true" aria-labelledby="about-title" onMouseDown={e=>e.stopPropagation()}>
      <header><div><h2 id="about-title">MathMaster Notes</h2><p>Version réellement chargée dans ce navigateur</p></div><button className="about-close" onClick={()=>setAboutOpen(false)} aria-label="Fermer"><X size={20}/></button></header>
      <dl className="build-details"><div><dt>Version</dt><dd>{VERSION_LABEL}</dd></div><div><dt>Compilation</dt><dd>{BUILD_DATE_LABEL}</dd></div><div><dt>Commit</dt><dd><code>{BUILD_COMMIT}</code></dd></div></dl>
      <div className="about-status"><strong>État de cette version</strong><p>Gestion des cours et pages, dessin au stylet, rejet de paume, sauvegardes, PDF et blocs mathématiques.</p></div>
      <a className="github-link" href="https://github.com/sunshineno/MathMaster---Notes" target="_blank" rel="noreferrer">Ouvrir le dépôt GitHub <ExternalLink size={16}/></a>
    </section></div>}
  </>;
}
