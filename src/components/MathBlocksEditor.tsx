import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Copy,
  Plus,
  Trash2
} from "lucide-react";
import type { MathBlock, MathBlockType } from "../types";

interface Props {
  blocks: MathBlock[];
  onChange: (blocks: MathBlock[]) => void;
}

const BLOCK_LABELS: Record<MathBlockType, string> = {
  text: "Texte libre",
  definition: "Définition",
  theoreme: "Théorème",
  proposition: "Proposition",
  lemme: "Lemme",
  corollaire: "Corollaire",
  remarque: "Remarque",
  exemple: "Exemple",
  proof: "Démonstration",
  exercice: "Exercice",
  correction: "Correction",
  equation: "Équation"
};

const BLOCK_PLACEHOLDERS: Record<MathBlockType, string> = {
  text: "Texte, notes ou commentaire…",
  definition: "Écris la définition ici…",
  theoreme: "Écris l’énoncé du théorème ici…",
  proposition: "Écris la proposition ici…",
  lemme: "Écris le lemme ici…",
  corollaire: "Écris le corollaire ici…",
  remarque: "Écris la remarque ici…",
  exemple: "Écris l’exemple ici…",
  proof: "Écris la démonstration ici…",
  exercice: "Écris l’exercice ici…",
  correction: "Écris la correction ici…",
  equation: "\\[\n  \n\\]"
};

function createBlock(type: MathBlockType): MathBlock {
  return {
    id: crypto.randomUUID(),
    type,
    title: BLOCK_LABELS[type],
    content: type === "equation" ? BLOCK_PLACEHOLDERS[type] : "",
    collapsed: false
  };
}

export default function MathBlocksEditor({ blocks, onChange }: Props) {
  const addBlock = (type: MathBlockType) => {
    onChange([...blocks, createBlock(type)]);
  };

  const updateBlock = (id: string, changes: Partial<MathBlock>) => {
    onChange(
      blocks.map(block => (block.id === id ? { ...block, ...changes } : block))
    );
  };

  const deleteBlock = (id: string) => {
    const block = blocks.find(item => item.id === id);
    if (!block) return;

    const confirmed = confirm(`Supprimer le bloc « ${block.title} » ?`);
    if (!confirmed) return;

    onChange(blocks.filter(item => item.id !== id));
  };

  const duplicateBlock = (id: string) => {
    const index = blocks.findIndex(item => item.id === id);
    if (index < 0) return;

    const original = blocks[index];
    const duplicate: MathBlock = {
      ...original,
      id: crypto.randomUUID(),
      title: `${original.title} — copie`
    };

    const next = [...blocks];
    next.splice(index + 1, 0, duplicate);
    onChange(next);
  };

  const moveBlock = (id: string, direction: -1 | 1) => {
    const index = blocks.findIndex(item => item.id === id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= blocks.length) return;

    const next = [...blocks];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    onChange(next);
  };

  return (
    <section className="math-blocks-panel">
      <div className="math-blocks-header">
        <div>
          <h2>Blocs mathématiques</h2>
          <p>
            Structure ton cours. Chaque bloc sera converti automatiquement en
            environnement LaTeX.
          </p>
        </div>

        <div className="block-add-menu">
          <span><Plus size={16} /> Ajouter</span>
          <div className="block-add-grid">
            {(Object.keys(BLOCK_LABELS) as MathBlockType[]).map(type => (
              <button key={type} onClick={() => addBlock(type)}>
                {BLOCK_LABELS[type]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {blocks.length === 0 ? (
        <div className="blocks-empty">
          <p>Aucun bloc pour cette page.</p>
          <button onClick={() => addBlock("definition")}>
            <Plus size={17} /> Ajouter une définition
          </button>
        </div>
      ) : (
        <div className="blocks-list">
          {blocks.map((block, index) => (
            <article
              className={`math-block math-block-${block.type}`}
              key={block.id}
            >
              <header className="math-block-header">
                <button
                  className="collapse-button"
                  title={block.collapsed ? "Déplier" : "Replier"}
                  onClick={() =>
                    updateBlock(block.id, { collapsed: !block.collapsed })
                  }
                >
                  {block.collapsed ? (
                    <ChevronRight size={18} />
                  ) : (
                    <ChevronDown size={18} />
                  )}
                </button>

                <select
                  value={block.type}
                  onChange={event =>
                    updateBlock(block.id, {
                      type: event.target.value as MathBlockType,
                      title: BLOCK_LABELS[event.target.value as MathBlockType]
                    })
                  }
                >
                  {(Object.keys(BLOCK_LABELS) as MathBlockType[]).map(type => (
                    <option key={type} value={type}>
                      {BLOCK_LABELS[type]}
                    </option>
                  ))}
                </select>

                <input
                  className="block-title-input"
                  value={block.title}
                  onChange={event =>
                    updateBlock(block.id, { title: event.target.value })
                  }
                  aria-label="Titre du bloc"
                />

                <div className="block-actions">
                  <button
                    title="Monter"
                    disabled={index === 0}
                    onClick={() => moveBlock(block.id, -1)}
                  >
                    <ArrowUp size={16} />
                  </button>
                  <button
                    title="Descendre"
                    disabled={index === blocks.length - 1}
                    onClick={() => moveBlock(block.id, 1)}
                  >
                    <ArrowDown size={16} />
                  </button>
                  <button
                    title="Dupliquer"
                    onClick={() => duplicateBlock(block.id)}
                  >
                    <Copy size={16} />
                  </button>
                  <button
                    className="danger"
                    title="Supprimer"
                    onClick={() => deleteBlock(block.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </header>

              {!block.collapsed && (
                <textarea
                  value={block.content}
                  onChange={event =>
                    updateBlock(block.id, { content: event.target.value })
                  }
                  placeholder={BLOCK_PLACEHOLDERS[block.type]}
                />
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
