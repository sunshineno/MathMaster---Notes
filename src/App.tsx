import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  FileCode2,
  FilePlus2,
  Folder,
  FolderOpen,
  FolderPlus,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
  Download,
  Upload,
  ShieldCheck
} from "lucide-react";
import CanvasBoard from "./components/CanvasBoard";
import MathBlocksEditor from "./components/MathBlocksEditor";
import {
  clearRecoverySnapshot,
  downloadBackup,
  getStorageInfo,
  loadState,
  parseBackup,
  requestPersistentStorage,
  saveState,
  type StorageInfo
} from "./storage";
import type { MathBlock, NotebookState, PaperType } from "./types";
import { buildLatexDocument, downloadTextFile } from "./latexTemplate";

export default function App() {
  const [state, setState] = useState<NotebookState>(() => loadState());
  const [search, setSearch] = useState("");
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({});
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error">("saved");
  const [saveError, setSaveError] = useState("");
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [persistentStorage, setPersistentStorage] = useState(false);

  useEffect(() => {
    setSaveStatus("saving");
    setSaveError("");

    const timer = window.setTimeout(async () => {
      try {
        saveState(state);
        setSaveStatus("saved");
        setStorageInfo(await getStorageInfo());
      } catch (error) {
        setSaveStatus("error");
        setSaveError(
          error instanceof Error
            ? error.message
            : "La sauvegarde automatique a échoué."
        );
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [state]);

  useEffect(() => {
    if (!state.selectedSubjectId && state.subjects[0]) {
      const firstSubject = state.subjects[0];
      const firstChapter = firstSubject.chapters[0];
      const firstPage = firstChapter?.pages[0];

      setState(current => ({
        ...current,
        selectedSubjectId: firstSubject.id,
        selectedChapterId: firstChapter?.id ?? null,
        selectedPageId: firstPage?.id ?? null
      }));
      setExpandedSubjects({ [firstSubject.id]: true });
    }
  }, []);

  const subject = state.subjects.find(item => item.id === state.selectedSubjectId);
  const chapter = subject?.chapters.find(item => item.id === state.selectedChapterId);
  const page = chapter?.pages.find(item => item.id === state.selectedPageId);

  const update = (recipe: (current: NotebookState) => NotebookState) => {
    setState(recipe);
  };

  const selectSubject = (subjectId: string) => {
    const selected = state.subjects.find(item => item.id === subjectId);
    const firstChapter = selected?.chapters[0];
    const firstPage = firstChapter?.pages[0];

    setExpandedSubjects(current => ({ ...current, [subjectId]: true }));
    setState(current => ({
      ...current,
      selectedSubjectId: subjectId,
      selectedChapterId: firstChapter?.id ?? null,
      selectedPageId: firstPage?.id ?? null
    }));
  };

  const selectChapter = (subjectId: string, chapterId: string) => {
    const selectedSubject = state.subjects.find(item => item.id === subjectId);
    const selectedChapter = selectedSubject?.chapters.find(item => item.id === chapterId);

    setState(current => ({
      ...current,
      selectedSubjectId: subjectId,
      selectedChapterId: chapterId,
      selectedPageId: selectedChapter?.pages[0]?.id ?? null
    }));
  };

  const addSubject = () => {
    const title = prompt("Nom de la matière :")?.trim();
    if (!title) return;

    const id = crypto.randomUUID();
    update(current => ({
      ...current,
      subjects: [...current.subjects, { id, title, chapters: [] }],
      selectedSubjectId: id,
      selectedChapterId: null,
      selectedPageId: null
    }));
    setExpandedSubjects(current => ({ ...current, [id]: true }));
  };

  const renameSubject = (subjectId: string) => {
    const selected = state.subjects.find(item => item.id === subjectId);
    if (!selected) return;

    const title = prompt("Nouveau nom de la matière :", selected.title)?.trim();
    if (!title || title === selected.title) return;

    update(current => ({
      ...current,
      subjects: current.subjects.map(item =>
        item.id === subjectId ? { ...item, title } : item
      )
    }));
  };

  const deleteSubject = (subjectId: string) => {
    const selected = state.subjects.find(item => item.id === subjectId);
    if (!selected) return;

    const confirmed = confirm(
      `Supprimer la matière « ${selected.title} » et tous ses chapitres ?\n\nCette action est irréversible.`
    );
    if (!confirmed) return;

    update(current => {
      const subjects = current.subjects.filter(item => item.id !== subjectId);
      const nextSubject = subjects[0];
      const nextChapter = nextSubject?.chapters[0];

      return {
        ...current,
        subjects,
        selectedSubjectId:
          current.selectedSubjectId === subjectId
            ? nextSubject?.id ?? null
            : current.selectedSubjectId,
        selectedChapterId:
          current.selectedSubjectId === subjectId
            ? nextChapter?.id ?? null
            : current.selectedChapterId,
        selectedPageId:
          current.selectedSubjectId === subjectId
            ? nextChapter?.pages[0]?.id ?? null
            : current.selectedPageId
      };
    });
  };

  const addChapter = (targetSubjectId = subject?.id) => {
    if (!targetSubjectId) return;

    const targetSubject = state.subjects.find(item => item.id === targetSubjectId);
    if (!targetSubject) return;

    const title = prompt("Nom du chapitre :")?.trim();
    if (!title) return;

    const chapterId = crypto.randomUUID();
    const pageId = crypto.randomUUID();

    update(current => ({
      ...current,
      subjects: current.subjects.map(item =>
        item.id === targetSubjectId
          ? {
              ...item,
              chapters: [
                ...item.chapters,
                {
                  id: chapterId,
                  title,
                  favorite: false,
                  pages: [
                    {
                      id: pageId,
                      title: "Page 1",
                      dataUrl: "",
                      paper: "grid",
                      latex: "",
                      blocks: []
                    }
                  ]
                }
              ]
            }
          : item
      ),
      selectedSubjectId: targetSubjectId,
      selectedChapterId: chapterId,
      selectedPageId: pageId
    }));

    setExpandedSubjects(current => ({ ...current, [targetSubjectId]: true }));
  };

  const renameChapter = (subjectId: string, chapterId: string) => {
    const selectedSubject = state.subjects.find(item => item.id === subjectId);
    const selectedChapter = selectedSubject?.chapters.find(item => item.id === chapterId);
    if (!selectedChapter) return;

    const title = prompt("Nouveau nom du chapitre :", selectedChapter.title)?.trim();
    if (!title || title === selectedChapter.title) return;

    update(current => ({
      ...current,
      subjects: current.subjects.map(item =>
        item.id === subjectId
          ? {
              ...item,
              chapters: item.chapters.map(currentChapter =>
                currentChapter.id === chapterId
                  ? { ...currentChapter, title }
                  : currentChapter
              )
            }
          : item
      )
    }));
  };

  const deleteChapter = (subjectId: string, chapterId: string) => {
    const selectedSubject = state.subjects.find(item => item.id === subjectId);
    const selectedChapter = selectedSubject?.chapters.find(item => item.id === chapterId);
    if (!selectedChapter) return;

    const confirmed = confirm(
      `Supprimer le chapitre « ${selectedChapter.title} » et toutes ses pages ?\n\nCette action est irréversible.`
    );
    if (!confirmed) return;

    update(current => {
      const updatedSubjects = current.subjects.map(item => {
        if (item.id !== subjectId) return item;
        return {
          ...item,
          chapters: item.chapters.filter(currentChapter => currentChapter.id !== chapterId)
        };
      });

      if (current.selectedChapterId !== chapterId) {
        return { ...current, subjects: updatedSubjects };
      }

      const updatedSubject = updatedSubjects.find(item => item.id === subjectId);
      const nextChapter = updatedSubject?.chapters[0];

      return {
        ...current,
        subjects: updatedSubjects,
        selectedChapterId: nextChapter?.id ?? null,
        selectedPageId: nextChapter?.pages[0]?.id ?? null
      };
    });
  };

  const addPage = () => {
    if (!subject || !chapter) return;

    const id = crypto.randomUUID();
    update(current => ({
      ...current,
      subjects: current.subjects.map(currentSubject =>
        currentSubject.id === subject.id
          ? {
              ...currentSubject,
              chapters: currentSubject.chapters.map(currentChapter =>
                currentChapter.id === chapter.id
                  ? {
                      ...currentChapter,
                      pages: [
                        ...currentChapter.pages,
                        {
                          id,
                          title: `Page ${currentChapter.pages.length + 1}`,
                          dataUrl: "",
                          paper: "grid",
                          latex: "",
                          blocks: []
                        }
                      ]
                    }
                  : currentChapter
              )
            }
          : currentSubject
      ),
      selectedPageId: id
    }));
  };

  const renamePage = (pageId: string) => {
    if (!subject || !chapter) return;
    const selectedPage = chapter.pages.find(item => item.id === pageId);
    if (!selectedPage) return;

    const title = prompt("Nouveau nom de la page :", selectedPage.title)?.trim();
    if (!title || title === selectedPage.title) return;

    update(current => ({
      ...current,
      subjects: current.subjects.map(currentSubject =>
        currentSubject.id === subject.id
          ? {
              ...currentSubject,
              chapters: currentSubject.chapters.map(currentChapter =>
                currentChapter.id === chapter.id
                  ? {
                      ...currentChapter,
                      pages: currentChapter.pages.map(currentPage =>
                        currentPage.id === pageId ? { ...currentPage, title } : currentPage
                      )
                    }
                  : currentChapter
              )
            }
          : currentSubject
      )
    }));
  };

  const deletePage = (pageId: string) => {
    if (!subject || !chapter) return;
    const selectedPage = chapter.pages.find(item => item.id === pageId);
    if (!selectedPage) return;

    if (chapter.pages.length === 1) {
      alert("Un chapitre doit toujours contenir au moins une page.");
      return;
    }

    const confirmed = confirm(`Supprimer « ${selectedPage.title} » ?`);
    if (!confirmed) return;

    update(current => {
      let nextPageId = current.selectedPageId;

      const subjects = current.subjects.map(currentSubject => {
        if (currentSubject.id !== subject.id) return currentSubject;

        return {
          ...currentSubject,
          chapters: currentSubject.chapters.map(currentChapter => {
            if (currentChapter.id !== chapter.id) return currentChapter;

            const pages = currentChapter.pages.filter(currentPage => currentPage.id !== pageId);
            if (current.selectedPageId === pageId) {
              nextPageId = pages[0]?.id ?? null;
            }

            return { ...currentChapter, pages };
          })
        };
      });

      return { ...current, subjects, selectedPageId: nextPageId };
    });
  };

  const updatePage = (changes: Partial<NonNullable<typeof page>>) => {
    if (!subject || !chapter || !page) return;

    update(current => ({
      ...current,
      subjects: current.subjects.map(currentSubject =>
        currentSubject.id === subject.id
          ? {
              ...currentSubject,
              chapters: currentSubject.chapters.map(currentChapter =>
                currentChapter.id === chapter.id
                  ? {
                      ...currentChapter,
                      pages: currentChapter.pages.map(currentPage =>
                        currentPage.id === page.id
                          ? { ...currentPage, ...changes }
                          : currentPage
                      )
                    }
                  : currentChapter
              )
            }
          : currentSubject
      )
    }));
  };


  const updatePageBlocks = (blocks: MathBlock[]) => {
    updatePage({ blocks });
  };

  const toggleFavorite = () => {
    if (!subject || !chapter) return;

    update(current => ({
      ...current,
      subjects: current.subjects.map(currentSubject =>
        currentSubject.id === subject.id
          ? {
              ...currentSubject,
              chapters: currentSubject.chapters.map(currentChapter =>
                currentChapter.id === chapter.id
                  ? { ...currentChapter, favorite: !currentChapter.favorite }
                  : currentChapter
              )
            }
          : currentSubject
      )
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

    updatePage({
      latex: `${page.latex}${page.latex ? "\n\n" : ""}${block}`
    });
  };

  const exportChapterTex = () => {
    if (!subject || !chapter) return;

    const tex = buildLatexDocument(subject.title, chapter.title, chapter.pages);
    const safeName = chapter.title.toLowerCase().replace(/[^a-z0-9à-ÿ]+/gi, "-");
    downloadTextFile(`${safeName || "chapitre"}.tex`, tex);
  };


  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsInstalled(standalone);

    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };

    const handleInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);


  useEffect(() => {
    let mounted = true;

    const initializeStorage = async () => {
      const persisted = await requestPersistentStorage();
      const info = await getStorageInfo();

      if (!mounted) return;
      setPersistentStorage(persisted);
      setStorageInfo(info);
    };

    initializeStorage();

    const saveBeforeLeaving = () => {
      try {
        saveState(state);
      } catch {
        // La sauvegarde différée affichera l'erreur dans l'interface.
      }
    };

    window.addEventListener("pagehide", saveBeforeLeaving);
    document.addEventListener("visibilitychange", saveBeforeLeaving);

    return () => {
      mounted = false;
      window.removeEventListener("pagehide", saveBeforeLeaving);
      document.removeEventListener("visibilitychange", saveBeforeLeaving);
    };
  }, [state]);

  const installApp = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };


  const exportNotebookBackup = () => {
    downloadBackup(state);
  };

  const restoreNotebookBackup = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const content = await file.text();
      const restoredState = parseBackup(content);
      const confirmed = confirm(
        "Restaurer cette sauvegarde ?\n\nLes données actuellement présentes dans l'application seront remplacées."
      );

      if (!confirmed) return;

      setState(restoredState);
      saveState(restoredState);
      clearRecoverySnapshot();
      setSaveStatus("saved");
      setSaveError("");
      alert("La sauvegarde a été restaurée avec succès.");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Impossible de restaurer cette sauvegarde.";
      alert(message);
    }
  };

  const filteredSubjects = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return state.subjects;

    return state.subjects
      .map(currentSubject => ({
        ...currentSubject,
        chapters: currentSubject.chapters.filter(currentChapter =>
          currentSubject.title.toLowerCase().includes(query) ||
          currentChapter.title.toLowerCase().includes(query)
        )
      }))
      .filter(currentSubject =>
        currentSubject.title.toLowerCase().includes(query) ||
        currentSubject.chapters.length > 0
      );
  }, [state.subjects, search]);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <BookOpen />
          <div>
            <strong>MathMaster Notes</strong>
            <span>Cahier numérique de mathématiques</span>
          </div>
        </div>

        <div className="topbar-actions">
          <div
            className={`save-indicator save-${saveStatus}`}
            title={
              saveStatus === "error"
                ? saveError
                : persistentStorage
                  ? "Stockage persistant activé"
                  : "Sauvegarde locale active"
            }
          >
            <ShieldCheck size={17} />
            {saveStatus === "saving"
              ? "Sauvegarde…"
              : saveStatus === "error"
                ? "Erreur de sauvegarde"
                : "Enregistré"}
          </div>

          <div className="search">
            <Search size={18} />
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Rechercher une matière ou un chapitre…"
            />
          </div>

          <button
            className="backup-button"
            onClick={exportNotebookBackup}
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
              onChange={restoreNotebookBackup}
            />
          </label>

          {!isInstalled && installPrompt && (
            <button className="install-button" onClick={installApp}>
              <Download size={18} />
              Installer
            </button>
          )}
        </div>
      </header>

      {(saveStatus === "error" ||
        (storageInfo && storageInfo.usageRatio > 0.8)) && (
        <div className={`storage-alert ${saveStatus === "error" ? "danger" : ""}`}>
          <strong>
            {saveStatus === "error"
              ? "Problème de sauvegarde"
              : "Stockage presque plein"}
          </strong>
          <span>
            {saveStatus === "error"
              ? saveError
              : `${Math.round(storageInfo!.usageRatio * 100)} % de l’espace disponible est utilisé. Télécharge une sauvegarde complète.`}
          </span>
          <button onClick={exportNotebookBackup}>Télécharger une sauvegarde</button>
        </div>
      )}

      <div className="layout explorer-layout">
        <aside className="sidebar explorer">
          <div className="panel-title">
            <span>Mes cours</span>
            <button title="Ajouter une matière" onClick={addSubject}>
              <FolderPlus size={18} />
            </button>
          </div>

          <div className="tree">
            {filteredSubjects.map(currentSubject => {
              const expanded =
                Boolean(search.trim()) || expandedSubjects[currentSubject.id] === true;
              const selected = currentSubject.id === subject?.id;

              return (
                <div className="tree-subject" key={currentSubject.id}>
                  <div className={`tree-row subject-row ${selected ? "selected" : ""}`}>
                    <button
                      className="tree-chevron"
                      title={expanded ? "Replier" : "Déplier"}
                      onClick={() =>
                        setExpandedSubjects(current => ({
                          ...current,
                          [currentSubject.id]: !expanded
                        }))
                      }
                    >
                      {expanded ? <ChevronDown size={17} /> : <ChevronRight size={17} />}
                    </button>

                    <button
                      className="tree-label"
                      onClick={() => selectSubject(currentSubject.id)}
                      onDoubleClick={() => renameSubject(currentSubject.id)}
                    >
                      {expanded ? <FolderOpen size={18} /> : <Folder size={18} />}
                      <span>{currentSubject.title}</span>
                    </button>

                    <div className="tree-actions">
                      <button
                        title="Ajouter un chapitre"
                        onClick={() => addChapter(currentSubject.id)}
                      >
                        <Plus size={15} />
                      </button>
                      <button
                        title="Renommer la matière"
                        onClick={() => renameSubject(currentSubject.id)}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        className="danger"
                        title="Supprimer la matière"
                        onClick={() => deleteSubject(currentSubject.id)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {expanded && (
                    <div className="tree-children">
                      {currentSubject.chapters.length === 0 && (
                        <button
                          className="tree-empty"
                          onClick={() => addChapter(currentSubject.id)}
                        >
                          + Ajouter un premier chapitre
                        </button>
                      )}

                      {currentSubject.chapters.map(currentChapter => (
                        <div
                          className={`tree-row chapter-row ${
                            currentChapter.id === chapter?.id ? "selected" : ""
                          }`}
                          key={currentChapter.id}
                        >
                          <button
                            className="tree-label"
                            onClick={() =>
                              selectChapter(currentSubject.id, currentChapter.id)
                            }
                            onDoubleClick={() =>
                              renameChapter(currentSubject.id, currentChapter.id)
                            }
                          >
                            <BookOpen size={16} />
                            <span>{currentChapter.title}</span>
                            {currentChapter.favorite && (
                              <Star size={14} fill="currentColor" />
                            )}
                          </button>

                          <div className="tree-actions">
                            <button
                              title="Renommer le chapitre"
                              onClick={() =>
                                renameChapter(currentSubject.id, currentChapter.id)
                              }
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              className="danger"
                              title="Supprimer le chapitre"
                              onClick={() =>
                                deleteChapter(currentSubject.id, currentChapter.id)
                              }
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>

        <main className="workspace">
          {page && chapter ? (
            <>
              <div className="document-header">
                <div>
                  <h1>{chapter.title}</h1>
                  <p>
                    {subject?.title} · {page.title}
                  </p>
                </div>

                <div className="document-actions">
                  <button
                    title="Renommer le chapitre"
                    onClick={() =>
                      subject && renameChapter(subject.id, chapter.id)
                    }
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    title="Exporter le chapitre en LaTeX"
                    onClick={exportChapterTex}
                  >
                    <FileCode2 size={18} />
                  </button>
                  <button title="Ajouter aux favoris" onClick={toggleFavorite}>
                    <Star
                      size={18}
                      fill={chapter.favorite ? "currentColor" : "none"}
                    />
                  </button>
                  <select
                    value={page.paper}
                    onChange={event =>
                      updatePage({ paper: event.target.value as PaperType })
                    }
                  >
                    <option value="blank">Feuille blanche</option>
                    <option value="grid">Petits carreaux</option>
                    <option value="dots">Points</option>
                    <option value="lined">Lignes</option>
                  </select>
                </div>
              </div>

              <div className="page-tabs">
                {chapter.pages.map(currentPage => (
                  <div
                    className={`page-tab ${
                      currentPage.id === page.id ? "selected" : ""
                    }`}
                    key={currentPage.id}
                  >
                    <button
                      className="page-tab-label"
                      onClick={() =>
                        setState(current => ({
                          ...current,
                          selectedPageId: currentPage.id
                        }))
                      }
                      onDoubleClick={() => renamePage(currentPage.id)}
                    >
                      {currentPage.title}
                    </button>
                    <button
                      className="page-tab-delete"
                      title="Supprimer cette page"
                      onClick={() => deletePage(currentPage.id)}
                    >
                      ×
                    </button>
                  </div>
                ))}

                <button className="add-page" onClick={addPage}>
                  <FilePlus2 size={17} />
                  Nouvelle page
                </button>
              </div>

              <CanvasBoard
                dataUrl={page.dataUrl}
                paper={page.paper}
                onSave={dataUrl => updatePage({ dataUrl })}
              />

              <MathBlocksEditor
                blocks={page.blocks ?? []}
                onChange={updatePageBlocks}
              />

              <details className="latex-advanced-panel">
                <summary>Mode LaTeX libre avancé</summary>
                <p>
                  Utilisé seulement lorsque la page ne contient aucun bloc
                  mathématique.
                </p>
                <textarea
                  value={page.latex}
                  onChange={event => updatePage({ latex: event.target.value })}
                  placeholder={
                    "Exemple :\n\\begin{theoreme}\nTout groupe d'ordre premier est cyclique.\n\\end{theoreme}"
                  }
                />
              </details>
            </>
          ) : (
            <div className="empty-state">
              <BookOpen size={52} />
              <h2>Crée un chapitre pour commencer</h2>
              <button onClick={() => addChapter()}>Nouveau chapitre</button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
