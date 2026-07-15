# Architecture MathMaster Notes 1.0

La version 1.0 commence la séparation du prototype en modules maintenables.

## Modules actuels

- `App.tsx` : orchestration de l'état du cahier et de l'espace de travail.
- `components/AppTopBar.tsx` : recherche, sauvegarde, restauration et installation PWA.
- `components/ExplorerSidebar.tsx` : navigation matières et chapitres.
- `components/CanvasBoard.tsx` : moteur d'écriture et d'annotation.
- `components/MathBlocksEditor.tsx` : blocs structurés pour les cours de mathématiques.
- `storage.ts` : persistance et sauvegardes.
- `pdfImport.ts` / `pdfExport.ts` : flux PDF.
- `latexTemplate.ts` : génération LaTeX.

## Étapes suivantes

1. Extraire la barre du document et les onglets de pages.
2. Déplacer les opérations de cahier dans un hook `useNotebook`.
3. Remplacer progressivement les images de canvas par un modèle de traits vectoriels.
4. Ajouter des tests pour le stockage, les sauvegardes et les exports.
5. Préparer l'intégration Capacitor Android.
