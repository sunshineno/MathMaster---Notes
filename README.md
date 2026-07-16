# MathMaster Notes

**Version actuelle : 1.6.0**

MathMaster Notes est une application web installable de prise de notes manuscrites, pensée pour les étudiants en mathématiques utilisant une tablette et un stylet.

## État du projet

La version 1.6.0 constitue la base stable avant les tests de sortie sur tablette. Le numéro de version et la date exacte de compilation sont visibles directement dans l’application via le bouton **À propos**.

## Fonctions disponibles

- organisation en matières, chapitres et pages ;
- gestionnaire de pages avec miniatures, duplication, renommage, suppression et réorganisation ;
- stylo, surligneur, gomme, formes et sélection ;
- couleurs et épaisseurs rapides ;
- rejet de paume logiciel et modes d’entrée ;
- zoom, déplacement et page longue ;
- sauvegarde automatique, export et restauration du cahier ;
- import et annotation de documents PDF ;
- export PDF, PNG et LaTeX ;
- blocs mathématiques colorés ;
- installation PWA sur ordinateur et tablette ;
- version et date de build visibles dans l’interface.

## Développement local

Prérequis : Node.js LTS et npm.

```bash
npm install
npm run build
npm run dev
```

L’adresse locale est généralement :

```text
http://localhost:5173/MathMaster---Notes/
```

## Déploiement GitHub Pages

Le déploiement est automatisé par GitHub Actions après chaque push sur la branche `main`. Le site public est accessible à l’adresse :

```text
https://sunshineno.github.io/MathMaster---Notes/
```

Le `package-lock.json` envoyé sur GitHub doit avoir été généré localement avec le registre public `https://registry.npmjs.org/`.

## Données et sauvegardes

Les notes sont enregistrées localement dans le navigateur. Il est recommandé de télécharger régulièrement une sauvegarde complète depuis le bouton **Sauvegarder**.

## Prochaine étape

- installer la PWA sur la Xiaomi Pad ;
- effectuer une séance de test réelle de 30 à 60 minutes ;
- corriger uniquement les bugs bloquants ;
- préparer la première version installable.

Consultez [CHANGELOG.md](CHANGELOG.md) pour l’historique des versions.
