# MathMaster Notes

Application web installable de prise de notes manuscrites pour les études de mathématiques.

**Version actuelle : v1.7.0**

Site : https://sunshineno.github.io/MathMaster---Notes/

## Fonctions

- matières, chapitres et pages ;
- stylo, surligneur, gomme, formes et sélection ;
- rejet de paume et gestes tactiles ;
- sauvegarde et restauration ;
- import, annotation et export PDF ;
- miniatures et réorganisation des pages ;
- blocs mathématiques ;
- PWA hors ligne ;
- version, date de build et commit visibles dans l’application.

## Vérifier le déploiement

La version apparaît à côté de **MathMaster Notes**. Le bouton **À propos** affiche la date de compilation et le commit.

## Développement

```bash
npm config set registry https://registry.npmjs.org/
npm install
npm run build
npm run dev
```


## Connexion Supabase

La v1.9.0 nécessite un projet Supabase.

Créer à la racine un fichier `.env.local` :

```env
VITE_SUPABASE_URL=https://ton-projet.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Dans Supabase, ajouter ces URL dans **Authentication → URL Configuration** :

```text
http://localhost:5173/MathMaster---Notes/
https://sunshineno.github.io/MathMaster---Notes/
```

La clé publishable peut être utilisée dans une application web. Ne jamais utiliser
une clé `secret` ou `service_role` dans le projet React.
