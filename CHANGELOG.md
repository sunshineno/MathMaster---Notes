# Historique des versions

## v2.1.0 — Sélection manuscrite et éditeur LaTeX

- bouton LaTeX disponible lorsqu’une zone du canvas est sélectionnée ;
- extraction de la zone manuscrite sous forme d’image ;
- fenêtre d’édition avec image source et saisie LaTeX ;
- aperçu mathématique en temps réel via MathJax ;
- copie du code LaTeX dans le presse-papiers ;
- insertion de la formule dans le mode LaTeX libre de la page ;
- écriture manuscrite originale conservée ;
- architecture prête pour un futur moteur de reconnaissance automatique.

## v2.0.0 — Synchronisation cloud sécurisée

- sauvegarde automatique du cahier dans Supabase ;
- récupération du cahier sur tous les appareils connectés au même compte ;
- copie locale conservée pour le fonctionnement hors ligne ;
- détection des modifications locales et distantes ;
- résolution guidée des conflits ;
- indicateur Cloud à jour / Synchronisation / Hors ligne / Erreur ;
- table protégée par Row Level Security : chaque compte accède uniquement à son cahier ;
- déploiement GitHub Pages configuré avec les secrets Supabase.

## v1.9.0 — Connexion par email

- authentification Supabase obligatoire ;
- création de compte par email et mot de passe ;
- connexion par email et mot de passe ;
- lien magique envoyé par email ;
- réinitialisation du mot de passe ;
- session persistante ;
- email du compte visible dans la barre supérieure ;
- bouton de déconnexion ;
- écran de configuration si les variables Supabase sont absentes.

## v1.7.0 — Version certaine et déploiement fiable

- badge de version visible ;
- fenêtre À propos avec date et commit ;
- cache PWA corrigé ;
- notification de nouvelle version ;
- workflow npm public et npm ci ;
- contrôle du package-lock.

