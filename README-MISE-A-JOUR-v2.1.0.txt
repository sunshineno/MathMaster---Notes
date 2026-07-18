MATHMASTER NOTES — PATCH v2.1.0
Sélection manuscrite et éditeur LaTeX

INSTALLATION
1. Décompresse cette archive.
2. Copie tous les fichiers et dossiers dans la racine de ton dépôt MathMaster---Notes.
3. Accepte le remplacement des fichiers existants.
4. Ne supprime pas les autres fichiers du projet.
5. Ne remplace surtout pas package-lock.json : il n'est pas inclus dans ce patch.
6. Fais un commit et attends le déploiement GitHub Pages.

SUMMARY DE COMMIT CONSEILLÉ
v2.1.0 - Sélection manuscrite et éditeur LaTeX

TEST LOCAL FACULTATIF
npm ci
npm run build
npm run dev

UTILISATION
1. Ouvre une page et choisis l'outil « Sélection ».
2. Encadre une formule manuscrite.
3. Dans les outils de sélection, appuie sur « LaTeX ».
4. Saisis ou corrige la formule dans la fenêtre.
5. Vérifie l'aperçu puis clique sur « Insérer dans la page ».
6. Le code est ajouté au panneau « Mode LaTeX libre avancé » et synchronisé dans le cloud.

REMARQUE
Cette version prépare la reconnaissance automatique. Elle n'effectue pas encore l'OCR mathématique : la formule doit être saisie ou corrigée manuellement. L'aperçu MathJax nécessite une connexion Internet lors du premier chargement.

VALIDATION
Le projet a été compilé avec succès avec : npm run build
