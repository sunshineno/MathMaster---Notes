# Architecture de MathMaster Notes

## Objectif de la version candidate

La version 1.4.0 ne rajoute pas de fonctionnalité. Elle sépare les responsabilités afin de stabiliser l’application avant sa distribution.

## Modules principaux

- `src/App.tsx` : orchestration du cahier et navigation globale.
- `src/components/AppTopBar.tsx` : sauvegarde, restauration, recherche et installation.
- `src/components/ExplorerSidebar.tsx` : matières et chapitres.
- `src/components/PageNavigator.tsx` : miniatures, duplication et ordre des pages.
- `src/components/CanvasBoard.tsx` : moteur de dessin et événements du canvas.
- `src/components/DrawingToolbar.tsx` : interface des outils de dessin.
- `src/editor/drawingTypes.ts` : types et préréglages du moteur de dessin.
- `src/components/MathBlocksEditor.tsx` : blocs mathématiques structurés.
- `src/pdfImport.ts` / `src/pdfExport.ts` : PDF.
- `src/storage.ts` : persistance et sauvegardes.

## Règle de sortie

Jusqu’à la publication, aucune fonctionnalité non essentielle n’est ajoutée. Les changements concernent seulement la stabilité, les performances et les bugs constatés sur tablette.
