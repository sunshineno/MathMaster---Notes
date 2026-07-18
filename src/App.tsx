import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  FileCode2,
  FileDown,
  FileInput,
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
  ShieldCheck,
  LoaderCircle,
  Maximize2,
  Minimize2,
  GraduationCap
} from "lucide-react";
import CanvasBoard from "./components/CanvasBoard";
import MathBlocksEditor from "./components/MathBlocksEditor";
import AppTopBar from "./components/AppTopBar";
import ExplorerSidebar from "./components/ExplorerSidebar";
import PageNavigator from "./components/PageNavigator";
import SnapshotDialog from "./components/SnapshotDialog";
import LatexSelectionDialog from "./components/LatexSelectionDialog";
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
import type { CanvasLatexObject, MathBlock, NotebookState, PaperType } from "./types";
import { createTemplateBlocks, describeTemplates, parseChapterTemplate } from "./math/chapterTemplates";
import { filterSubjects } from "./search/notebookSearch";
import { buildLatexDocument, downloadTextFile } from "./latexTemplate";
import { exportChapterToPdf } from "./pdfExport";
import { importPdfAsPages } from "./pdfImport";
import { createNotebookSnapshot, type NotebookSnapshot } from "./snapshots";
import { useAuth } from "./auth/AuthProvider";
import {
  fetchCloudNotebook,
  formatCloudDate,
  hashNotebook,
  readCloudMeta,
  uploadCloudNotebook,
  writeCloudMeta,
  type CloudSyncStatus
} from "./cloudSync";

export default function App() {
  const { user } = useAuth();
  const [state, setState] = useState<NotebookState>(() => loadState());
  const [search, setSearch] = useState("");
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({});
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error">("saved");
  const [saveError, setSaveError] = useState("");
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [persistentStorage, setPersistentStorage] = useState(false);
  const [pdfImportProgress, setPdfImportProgress] = useState<{ current: number; total: number } | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [snapshotDialogOpen, setSnapshotDialogOpen] = useState(false);
  const [latexSelection, setLatexSelection] = useState<{ image: string; rect: { x: number; y: number; width: number; height: number } } | null>(null);
  const [editingLatexObject, setEditingLatexObject] = useState<CanvasLatexObject | null>(null);
  const [cloudStatus, setCloudStatus] = useState<CloudSyncStatus>("initializing");
  const [cloudError, setCloudError] = useState("");
  const [cloudUpdatedAt, setCloudUpdatedAt] = useState<string | null>(null);
  const [cloudReady, setCloudReady] = useState(false);
  const [lastUploadedHash, setLastUploadedHash] = useState("");


  useEffect(() => {
    let cancelled = false;

    const initializeCloud = async () => {
      setCloudReady(false);
      setCloudStatus("initializing");
      setCloudError("");

      try {
        const localState = loadState();
        const localHash = hashNotebook(localState);
        const meta = readCloudMeta(user.id);
        const cloud = await fetchCloudNotebook(user.id);

        if (cancelled) return;

        if (!cloud) {
          const created = await uploadCloudNotebook(user.id, localState);
          if (cancelled) return;
          writeCloudMeta(user.id, localState, created.updated_at);
          setLastUploadedHash(localHash);
          setCloudUpdatedAt(created.updated_at);
          setCloudStatus("synced");
          setCloudReady(true);
          return;
        }

        const cloudHash = hashNotebook(cloud.state);
        setCloudUpdatedAt(cloud.updated_at);

        if (localHash === cloudHash) {
          writeCloudMeta(user.id, cloud.state, cloud.updated_at);
          setLastUploadedHash(cloudHash);
          setCloudStatus("synced");
          setCloudReady(true);
          return;
        }

        if (meta?.lastSyncedHash === localHash) {
          setState(cloud.state);
          saveState(cloud.state);
          writeCloudMeta(user.id, cloud.state, cloud.updated_at);
          setLastUploadedHash(cloudHash);
          setCloudStatus("synced");
          setCloudReady(true);
          return;
        }

        if (meta?.lastSyncedHash === cloudHash) {
          const uploaded = await uploadCloudNotebook(user.id, localState);
          if (cancelled) return;
          writeCloudMeta(user.id, localState, uploaded.updated_at);
          setLastUploadedHash(localHash);
          setCloudUpdatedAt(uploaded.updated_at);
          setCloudStatus("synced");
          setCloudReady(true);
          return;
        }

        setCloudStatus("conflict");
        const useCloud = confirm(
          `Deux versions différentes de ton cahier ont été trouvées.\n\n` +
            `OK : utiliser la version cloud (${formatCloudDate(cloud.updated_at)}).\n` +
            `Annuler : conserver cette version locale et l’envoyer dans le cloud.`
        );

        if (useCloud) {
          setState(cloud.state);
          saveState(cloud.state);
          writeCloudMeta(user.id, cloud.state, cloud.updated_at);
          setLastUploadedHash(cloudHash);
        } else {
          const uploaded = await uploadCloudNotebook(user.id, localState);
          if (cancelled) return;
          writeCloudMeta(user.id, localState, uploaded.updated_at);
          setLastUploadedHash(localHash);
          setCloudUpdatedAt(uploaded.updated_at);
        }

        setCloudStatus("synced");
        setCloudReady(true);
      } catch (error) {
        if (cancelled) return;
        const message =
          error instanceof Error
            ? error.message
            : "La synchronisation cloud est indisponible.";
        setCloudError(message);
        setCloudStatus(navigator.onLine ? "error" : "offline");
        setCloudReady(true);
      }
    };

    void initializeCloud();

    return () => {
      cancelled = true;
    };
  }, [user.id]);

  useEffect(() => {
    if (!cloudReady) return;

    const updateConnectionStatus = () => {
      if (!navigator.onLine) {
        setCloudStatus("offline");
      } else if (cloudStatus === "offline") {
        setCloudStatus("synced");
      }
    };

    window.addEventListener("online", updateConnectionStatus);
    window.addEventListener("offline", updateConnectionStatus);
    return () => {
      window.removeEventListener("online", updateConnectionStatus);
      window.removeEventListener("offline", updateConnectionStatus);
    };
  }, [cloudReady, cloudStatus]);

  useEffect(() => {
    if (!cloudReady) return;

    const currentHash = hashNotebook(state);
    if (currentHash === lastUploadedHash) return;

    if (!navigator.onLine) {
      setCloudStatus("offline");
      return;
    }

    setCloudStatus("syncing");
    setCloudError("");

    const timer = window.setTimeout(async () => {
      try {
        const uploaded = await uploadCloudNotebook(user.id, state);
        writeCloudMeta(user.id, state, uploaded.updated_at);
        setLastUploadedHash(currentHash);
        setCloudUpdatedAt(uploaded.updated_at);
        setCloudStatus("synced");
      } catch (error) {
        setCloudError(
          error instanceof Error
            ? error.message
            : "Impossible d’envoyer le cahier dans le cloud."
        );
        setCloudStatus(navigator.onLine ? "error" : "offline");
      }
    }, 1800);

    return () => window.clearTimeout(timer);
  }, [state, cloudReady, lastUploadedHash, user.id]);

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
    const initialTimer = window.setTimeout(() => {
      createNotebookSnapshot(state).catch(() => undefined);
    }, 30_000);

    const interval = window.setInterval(() => {
      createNotebookSnapshot(state).catch(() => undefined);
    }, 10 * 60_000);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(interval);
    };
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

    const answer = prompt(
      `Pour supprimer définitivement la matière « ${selected.title} » et tous ses chapitres, écris exactement son nom :`
    );
    if (answer !== selected.title) {
      if (answer !== null) alert("Le nom saisi ne correspond pas. La matière n’a pas été supprimée.");
      return;
    }

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

  const chooseChapterTemplate = () => {
    const answer = prompt(
      `Modèle du chapitre : ${describeTemplates()}`,
      "cours"
    );
    if (answer === null) return null;
    return parseChapterTemplate(answer);
  };

  const toggleFocusMode = () => {
    setFocusMode(current => !current);
  };

  const addChapter = (targetSubjectId = subject?.id) => {
    if (!targetSubjectId) return;

    const targetSubject = state.subjects.find(item => item.id === targetSubjectId);
    if (!targetSubject) return;

    const title = prompt("Nom du chapitre :")?.trim();
    if (!title) return;

    const template = chooseChapterTemplate();
    if (template === null) return;
    const templateBlocks = createTemplateBlocks(template);

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
                      blocks: templateBlocks
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

    const answer = prompt(
      `Pour supprimer définitivement le chapitre « ${selectedChapter.title} » et toutes ses pages, écris exactement son nom :`
    );
    if (answer !== selectedChapter.title) {
      if (answer !== null) alert("Le nom saisi ne correspond pas. Le chapitre n’a pas été supprimé.");
      return;
    }

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

  const importPdf = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !subject || !chapter) return;

    try {
      setPdfImportProgress({ current: 0, total: 1 });
      const importedPages = await importPdfAsPages(file, setPdfImportProgress);
      if (importedPages.length === 0) return;

      update(current => ({
        ...current,
        subjects: current.subjects.map(currentSubject =>
          currentSubject.id === subject.id
            ? {
                ...currentSubject,
                chapters: currentSubject.chapters.map(currentChapter =>
                  currentChapter.id === chapter.id
                    ? { ...currentChapter, pages: [...currentChapter.pages, ...importedPages] }
                    : currentChapter
                )
              }
            : currentSubject
        ),
        selectedPageId: importedPages[0].id
      }));
    } catch (error) {
      alert(
        error instanceof Error
          ? `Impossible d’importer le PDF : ${error.message}`
          : "Impossible d’importer le PDF."
      );
    } finally {
      setPdfImportProgress(null);
    }
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

  const duplicatePage = (pageId: string) => {
    if (!subject || !chapter) return;
    const sourcePage = chapter.pages.find(item => item.id === pageId);
    if (!sourcePage) return;

    const duplicatedPage = {
      ...sourcePage,
      id: crypto.randomUUID(),
      title: `${sourcePage.title} — copie`,
      blocks: sourcePage.blocks?.map(block => ({
        ...block,
        id: crypto.randomUUID()
      })) ?? []
    };

    update(current => ({
      ...current,
      subjects: current.subjects.map(currentSubject =>
        currentSubject.id === subject.id
          ? {
              ...currentSubject,
              chapters: currentSubject.chapters.map(currentChapter => {
                if (currentChapter.id !== chapter.id) return currentChapter;
                const sourceIndex = currentChapter.pages.findIndex(
                  currentPage => currentPage.id === pageId
                );
                const pages = [...currentChapter.pages];
                pages.splice(sourceIndex + 1, 0, duplicatedPage);
                return { ...currentChapter, pages };
              })
            }
          : currentSubject
      ),
      selectedPageId: duplicatedPage.id
    }));
  };

  const reorderPages = (sourcePageId: string, targetPageId: string) => {
    if (!subject || !chapter || sourcePageId === targetPageId) return;

    update(current => ({
      ...current,
      subjects: current.subjects.map(currentSubject =>
        currentSubject.id === subject.id
          ? {
              ...currentSubject,
              chapters: currentSubject.chapters.map(currentChapter => {
                if (currentChapter.id !== chapter.id) return currentChapter;

                const pages = [...currentChapter.pages];
                const sourceIndex = pages.findIndex(page => page.id === sourcePageId);
                const targetIndex = pages.findIndex(page => page.id === targetPageId);
                if (sourceIndex < 0 || targetIndex < 0) return currentChapter;

                const [movedPage] = pages.splice(sourceIndex, 1);
                pages.splice(targetIndex, 0, movedPage);
                return { ...currentChapter, pages };
              })
            }
          : currentSubject
      )
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

  const exportChapterPdf = async () => {
    if (!subject || !chapter) return;
    try { await exportChapterToPdf(subject, chapter); }
    catch (error) { alert(error instanceof Error ? `Impossible de créer le PDF : ${error.message}` : "Impossible de créer le PDF."); }
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


  const createManualSnapshot = async () => {
    await createNotebookSnapshot(state, "manual");
  };

  const restoreSnapshot = (snapshot: NotebookSnapshot) => {
    setState(snapshot.state);
    saveState(snapshot.state);
    setSaveStatus("saved");
    setSaveError("");
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

  const filteredSubjects = useMemo(
    () => filterSubjects(state.subjects, search),
    [state.subjects, search]
  );

  return (
    <div className={`app ${focusMode ? "focus-mode" : ""}`}>
      <AppTopBar
        search={search}
        onSearchChange={setSearch}
        saveStatus={saveStatus}
        saveError={saveError}
        persistentStorage={persistentStorage}
        onBackup={exportNotebookBackup}
        onRestore={restoreNotebookBackup}
        canInstall={!isInstalled && Boolean(installPrompt)}
        onInstall={installApp}
        onOpenSnapshots={() => setSnapshotDialogOpen(true)}
        cloudStatus={cloudStatus}
        cloudError={cloudError}
        cloudUpdatedAt={cloudUpdatedAt}
      />

      <SnapshotDialog
        open={snapshotDialogOpen}
        onClose={() => setSnapshotDialogOpen(false)}
        onRestore={restoreSnapshot}
        onCreate={createManualSnapshot}
      />

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

      {pdfImportProgress && (
        <div className="pdf-import-overlay" role="status">
          <div className="pdf-import-card">
            <LoaderCircle className="spin" size={30} />
            <strong>Import du PDF</strong>
            <span>
              Page {pdfImportProgress.current} sur {pdfImportProgress.total}
            </span>
            <progress value={pdfImportProgress.current} max={pdfImportProgress.total} />
          </div>
        </div>
      )}

      <div className="layout explorer-layout">
        <ExplorerSidebar
          subjects={filteredSubjects}
          selectedSubjectId={subject?.id ?? null}
          selectedChapterId={chapter?.id ?? null}
          expandedSubjects={expandedSubjects}
          searchActive={Boolean(search.trim())}
          onToggleSubject={(subjectId, expanded) =>
            setExpandedSubjects(current => ({
              ...current,
              [subjectId]: !expanded
            }))
          }
          onSelectSubject={selectSubject}
          onSelectChapter={selectChapter}
          onAddSubject={addSubject}
          onAddChapter={subjectId => addChapter(subjectId)}
          onRenameSubject={renameSubject}
          onRenameChapter={renameChapter}
          onDeleteSubject={deleteSubject}
          onDeleteChapter={deleteChapter}
        />

        <main className="workspace">
          {page && chapter ? (
            <>
              <div className="document-header">
                <div>
                  <h1>{chapter.title}</h1>
                  <p>
                    {subject?.title} · {page.title}
                    <span className="milestone-badge">
                      <GraduationCap size={13} /> Mode Master
                    </span>
                  </p>
                </div>

                <div className="document-actions">
                  <button
                    className={focusMode ? "active-action" : ""}
                    title={focusMode ? "Quitter le mode plein écran" : "Mode plein écran"}
                    onClick={toggleFocusMode}
                  >
                    {focusMode ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                  </button>
                  <button
                    title="Renommer le chapitre"
                    onClick={() =>
                      subject && renameChapter(subject.id, chapter.id)
                    }
                  >
                    <Pencil size={18} />
                  </button>
                  <label className="document-file-button" title="Importer un PDF dans ce chapitre">
                    <FileInput size={18} />
                    <input type="file" accept="application/pdf,.pdf" onChange={importPdf} />
                  </label>
                  <button title="Exporter le chapitre en PDF" onClick={exportChapterPdf}>
                    <FileDown size={18} />
                  </button>
                  <button
                    title="Exporter le chapitre en LaTeX"
                    onClick={exportChapterTex}
                  >
                    <FileCode2 size={18} />
                  </button>
                  <button className="danger-action" title="Supprimer ce chapitre" onClick={() => subject && deleteChapter(subject.id, chapter.id)}>
                    <Trash2 size={18} />
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

              <PageNavigator
                pages={chapter.pages}
                selectedPageId={page.id}
                onSelect={pageId =>
                  setState(current => ({ ...current, selectedPageId: pageId }))
                }
                onAdd={addPage}
                onRename={renamePage}
                onDuplicate={duplicatePage}
                onDelete={deletePage}
                onReorder={reorderPages}
              />

              <CanvasBoard
                dataUrl={page.dataUrl}
                backgroundDataUrl={page.backgroundDataUrl}
                paper={page.paper}
                onSave={dataUrl => updatePage({ dataUrl })}
                canvasHeight={page.canvasHeight ?? 2400}
                latexObjects={page.canvasLatexObjects ?? []}
                onCanvasHeightChange={canvasHeight => updatePage({ canvasHeight })}
                onLatexObjectsChange={canvasLatexObjects => updatePage({ canvasLatexObjects })}
                onEditLatexObject={object => setEditingLatexObject(object)}
                onExtractSelection={(image, rect) => setLatexSelection({ image, rect })}
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

      {latexSelection && page && (
        <LatexSelectionDialog
          imageDataUrl={latexSelection.image}
          onClose={() => setLatexSelection(null)}
          onInsert={latex => {
            const object: CanvasLatexObject = {
              id: crypto.randomUUID(),
              latex,
              x: latexSelection.rect.x,
              y: latexSelection.rect.y,
              width: Math.max(260, latexSelection.rect.width),
              fontSize: 34
            };
            updatePage({ canvasLatexObjects: [...(page.canvasLatexObjects ?? []), object] });
            setLatexSelection(null);
          }}
        />
      )}

      {editingLatexObject && page && (
        <LatexSelectionDialog
          imageDataUrl={page.dataUrl || page.backgroundDataUrl || ""}
          initialLatex={editingLatexObject.latex}
          onClose={() => setEditingLatexObject(null)}
          onInsert={latex => {
            updatePage({
              canvasLatexObjects: (page.canvasLatexObjects ?? []).map(object =>
                object.id === editingLatexObject.id ? { ...object, latex } : object
              )
            });
            setEditingLatexObject(null);
          }}
        />
      )}
    </div>
  );
}
