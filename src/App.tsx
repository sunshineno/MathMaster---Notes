import { useEffect, useMemo, useState } from "react";
import { BookOpen, FilePlus2, FolderPlus, Search, Star, Plus, FileCode2 } from "lucide-react";
import CanvasBoard from "./components/CanvasBoard";
import { loadState, saveState } from "./storage";
import type { NotebookState, PaperType } from "./types";
import { buildLatexDocument, downloadTextFile } from "./latexTemplate";

export default function App() {
  const [state, setState] = useState<NotebookState>(() => loadState());
  const [search, setSearch] = useState("");

  useEffect(() => saveState(state), [state]);

  useEffect(() => {
    if (!state.selectedSubjectId && state.subjects[0]) {
      const subject = state.subjects[0];
      const chapter = subject.chapters[0];
      const page = chapter?.pages[0];
      setState(s => ({
        ...s,
        selectedSubjectId: subject.id,
        selectedChapterId: chapter?.id ?? null,
        selectedPageId: page?.id ?? null
      }));
    }
  }, []);

  const subject = state.subjects.find(s => s.id === state.selectedSubjectId);
  const chapter = subject?.chapters.find(c => c.id === state.selectedChapterId);
  const page = chapter?.pages.find(p => p.id === state.selectedPageId);

  const update = (recipe: (draft: NotebookState) => NotebookState) => setState(recipe);

  const addSubject = () => {
    const title = prompt("Nom de la matière :")?.trim();
    if (!title) return;
    const id = crypto.randomUUID();
    update(s => ({ ...s, subjects: [...s.subjects, { id, title, chapters: [] }], selectedSubjectId: id, selectedChapterId: null, selectedPageId: null }));
  };

  const addChapter = () => {
    if (!subject) return;
    const title = prompt("Nom du chapitre :")?.trim();
    if (!title) return;
    const chapterId = crypto.randomUUID();
    const pageId = crypto.randomUUID();
    update(s => ({
      ...s,
      subjects: s.subjects.map(item => item.id === subject.id ? {
        ...item,
        chapters: [...item.chapters, {
          id: chapterId,
          title,
          favorite: false,
          pages: [{ id: pageId, title: "Page 1", dataUrl: "", paper: "grid", latex: "" }]
        }]
      } : item),
      selectedChapterId: chapterId,
      selectedPageId: pageId
    }));
  };

  const addPage = () => {
    if (!subject || !chapter) return;
    const id = crypto.randomUUID();
    update(s => ({
      ...s,
      subjects: s.subjects.map(sub => sub.id === subject.id ? {
        ...sub,
        chapters: sub.chapters.map(ch => ch.id === chapter.id ? {
          ...ch,
          pages: [...ch.pages, { id, title: `Page ${ch.pages.length + 1}`, dataUrl: "", paper: "grid", latex: "" }]
        } : ch)
      } : sub),
      selectedPageId: id
    }));
  };

  const updatePage = (changes: Partial<NonNullable<typeof page>>) => {
    if (!subject || !chapter || !page) return;
    update(s => ({
      ...s,
      subjects: s.subjects.map(sub => sub.id === subject.id ? {
        ...sub,
        chapters: sub.chapters.map(ch => ch.id === chapter.id ? {
          ...ch,
          pages: ch.pages.map(pg => pg.id === page.id ? { ...pg, ...changes } : pg)
        } : ch)
      } : sub)
    }));
  };

  const toggleFavorite = () => {
    if (!subject || !chapter) return;
    update(s => ({
      ...s,
      subjects: s.subjects.map(sub => sub.id === subject.id ? {
        ...sub,
        chapters: sub.chapters.map(ch => ch.id === chapter.id ? { ...ch, favorite: !ch.favorite } : ch)
      } : sub)
    }));
  };


  const insertLatexBlock = (kind: string) => {
    if (!page) return;
    const blocks: Record<string, string> = {
      definition: "\\begin{definition}\n\n\\end{definition}",
      theoreme: "\\begin{theoreme}\n\n\\end{theoreme}",
      proposition: "\\begin{proposition}\n\n\\end{proposition}",
      lemme: "\\begin{lemme}\n\n\\end{lemme}",
      corollaire: "\\begin{corollaire}\n\n\\end{corollaire}",
      remarque: "\\begin{remarque}\n\n\\end{remarque}",
      exemple: "\\begin{exemple}\n\n\\end{exemple}",
      exercice: "\\begin{exercice}\n\n\\end{exercice}",
      correction: "\\correction\n",
      proof: "\\begin{proof}\n\n\\end{proof}",
      equation: "\\[\n\n\\]",
      align: "\\begin{align*}\n\n\\end{align*}"
    };
    const block = blocks[kind];
    if (!block) return;
    updatePage({ latex: `${page.latex}${page.latex ? "\n\n" : ""}${block}` });
  };

  const exportChapterTex = () => {
    if (!subject || !chapter) return;
    const tex = buildLatexDocument(subject.title, chapter.title, chapter.pages);
    const safeName = chapter.title.toLowerCase().replace(/[^a-z0-9à-ÿ]+/gi, "-");
    downloadTextFile(`${safeName || "chapitre"}.tex`, tex);
  };

  const filteredChapters = useMemo(() => {
    const query = search.toLowerCase();
    return subject?.chapters.filter(ch => ch.title.toLowerCase().includes(query)) ?? [];
  }, [subject, search]);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand"><BookOpen/><div><strong>MathMaster Notes</strong><span>Cahier numérique de mathématiques</span></div></div>
        <div className="search"><Search size={18}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un chapitre…"/></div>
      </header>

      <div className="layout">
        <aside className="sidebar subjects">
          <div className="panel-title"><span>Matières</span><button title="Ajouter une matière" onClick={addSubject}><FolderPlus size={18}/></button></div>
          {state.subjects.map(item => (
            <button key={item.id} className={`nav-item ${item.id === subject?.id ? "selected" : ""}`} onClick={() => setState(s => ({...s, selectedSubjectId: item.id, selectedChapterId: item.chapters[0]?.id ?? null, selectedPageId: item.chapters[0]?.pages[0]?.id ?? null}))}>
              {item.title}
            </button>
          ))}
        </aside>

        <aside className="sidebar chapters">
          <div className="panel-title"><span>Chapitres</span><button title="Ajouter un chapitre" onClick={addChapter}><Plus size={18}/></button></div>
          {filteredChapters.map(item => (
            <button key={item.id} className={`nav-item chapter-item ${item.id === chapter?.id ? "selected" : ""}`} onClick={() => setState(s => ({...s, selectedChapterId: item.id, selectedPageId: item.pages[0]?.id ?? null}))}>
              <span>{item.title}</span>{item.favorite && <Star size={15} fill="currentColor"/>}
            </button>
          ))}
        </aside>

        <main className="workspace">
          {page && chapter ? (
            <>
              <div className="document-header">
                <div><h1>{chapter.title}</h1><p>{subject?.title} · {page.title}</p></div>
                <div className="document-actions">
                  <button title="Exporter le chapitre en LaTeX" onClick={exportChapterTex}><FileCode2 size={18}/></button>
                  <button title="Ajouter aux favoris" onClick={toggleFavorite}><Star size={18} fill={chapter.favorite ? "currentColor" : "none"}/></button>
                  <select value={page.paper} onChange={e => updatePage({paper: e.target.value as PaperType})}>
                    <option value="blank">Feuille blanche</option>
                    <option value="grid">Petits carreaux</option>
                    <option value="dots">Points</option>
                    <option value="lined">Lignes</option>
                  </select>
                </div>
              </div>

              <div className="page-tabs">
                {chapter.pages.map(item => (
                  <button key={item.id} className={item.id === page.id ? "selected" : ""} onClick={() => setState(s => ({...s, selectedPageId: item.id}))}>{item.title}</button>
                ))}
                <button className="add-page" onClick={addPage}><FilePlus2 size={17}/> Nouvelle page</button>
              </div>

              <CanvasBoard dataUrl={page.dataUrl} paper={page.paper} onSave={dataUrl => updatePage({dataUrl})}/>

              <section className="latex-panel">
                <div>
                  <h2>LaTeX</h2>
                  <p>Le contenu utilise automatiquement ton préambule MathMaster.</p>
                  <div className="latex-buttons">
                    <button onClick={() => insertLatexBlock("definition")}>Définition</button>
                    <button onClick={() => insertLatexBlock("theoreme")}>Théorème</button>
                    <button onClick={() => insertLatexBlock("proposition")}>Proposition</button>
                    <button onClick={() => insertLatexBlock("lemme")}>Lemme</button>
                    <button onClick={() => insertLatexBlock("proof")}>Démonstration</button>
                    <button onClick={() => insertLatexBlock("exercice")}>Exercice</button>
                    <button onClick={() => insertLatexBlock("correction")}>Correction</button>
                    <button onClick={() => insertLatexBlock("equation")}>Équation</button>
                    <button onClick={() => insertLatexBlock("align")}>Align</button>
                  </div>
                </div>
                <textarea value={page.latex} onChange={e => updatePage({latex: e.target.value})} placeholder={"Exemple :\n\\begin{theoreme}\nTout groupe d'ordre premier est cyclique.\n\\end{theoreme}"}/>
              </section>
            </>
          ) : (
            <div className="empty-state"><BookOpen size={52}/><h2>Crée un chapitre pour commencer</h2><button onClick={addChapter}>Nouveau chapitre</button></div>
          )}
        </main>
      </div>
    </div>
  );
}