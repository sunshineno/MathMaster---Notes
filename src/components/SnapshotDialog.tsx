import { Clock3, RotateCcw, ShieldCheck, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  countSnapshotPages,
  deleteNotebookSnapshot,
  listNotebookSnapshots,
  type NotebookSnapshot
} from "../snapshots";

interface SnapshotDialogProps {
  open: boolean;
  onClose: () => void;
  onRestore: (snapshot: NotebookSnapshot) => void;
  onCreate: () => Promise<void>;
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export default function SnapshotDialog({
  open,
  onClose,
  onRestore,
  onCreate
}: SnapshotDialogProps) {
  const [snapshots, setSnapshots] = useState<NotebookSnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refresh = async () => {
    setLoading(true);
    setError("");
    try {
      setSnapshots(await listNotebookSnapshots());
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "Historique inaccessible.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) refresh();
  }, [open]);

  if (!open) return null;

  return (
    <div className="snapshot-backdrop" onMouseDown={onClose}>
      <section className="snapshot-dialog" onMouseDown={event => event.stopPropagation()}>
        <header>
          <div>
            <h2><ShieldCheck size={21} /> Historique de sécurité</h2>
            <p>Les cinq derniers instantanés locaux sont conservés sur cet appareil.</p>
          </div>
          <button onClick={onClose} aria-label="Fermer"><X size={20} /></button>
        </header>

        <div className="snapshot-toolbar">
          <button
            onClick={async () => {
              await onCreate();
              await refresh();
            }}
          >
            <Clock3 size={17} /> Créer un instantané maintenant
          </button>
        </div>

        {error && <p className="snapshot-error">{error}</p>}
        {loading ? (
          <p className="snapshot-empty">Chargement…</p>
        ) : snapshots.length === 0 ? (
          <p className="snapshot-empty">Aucun instantané disponible pour le moment.</p>
        ) : (
          <div className="snapshot-list">
            {snapshots.map(snapshot => (
              <article key={snapshot.id} className="snapshot-card">
                <div>
                  <strong>{dateLabel(snapshot.createdAt)}</strong>
                  <span>
                    {snapshot.reason === "manual" ? "Manuel" : "Automatique"}
                    {" · "}{snapshot.state.subjects.length} matière(s)
                    {" · "}{countSnapshotPages(snapshot)} page(s)
                  </span>
                </div>
                <div className="snapshot-actions">
                  <button
                    onClick={() => {
                      if (confirm("Restaurer cet instantané ? L’état actuel sera remplacé.")) {
                        onRestore(snapshot);
                        onClose();
                      }
                    }}
                  >
                    <RotateCcw size={16} /> Restaurer
                  </button>
                  <button
                    className="danger"
                    title="Supprimer l’instantané"
                    onClick={async () => {
                      await deleteNotebookSnapshot(snapshot.id);
                      await refresh();
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
