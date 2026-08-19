# INUBIL Verify — Frontend

Interface web de la plateforme de certification de diplômes sur blockchain pour ISTAMA INUBIL (Douala, Cameroun). React 19 + Vite.

## Lancer le projet

```bash
npm install
npm run dev       # serveur de dev, http://localhost:5173
npm run build     # build de production dans dist/
npm run lint      # verifie le code avec ESLint
npm run preview   # sert le build de production en local
```

## État actuel

Ce frontend est **en cours de refonte** — l'interface existe pour la plupart des pages mais **aucune n'est encore reliée au backend** (données factices, authentification simulée). Voir `../docs/ROLES_ET_PAGES.md` à la racine du dépôt pour :

- la liste complète des pages à construire, classées par rôle,
- les endpoints backend exacts que chaque page doit consommer,
- la hiérarchie des rôles (`admin_istama`, `responsable_universite`, `directeur_pedagogique`, `agent_saisie`, `etudiant`, `autre_universite`, `employeur`).

Voir aussi `../CLAUDE.md` (racine `INUBIL-VERIFY/`) pour l'architecture générale du projet (backend NestJS, blockchain Polygon).

## Structure

```
src/
├── core/auth/        # contexte d'authentification, hook useAuth, garde de route
├── features/          # une page/fonctionnalité par dossier
├── shared/            # composants et layouts partagés entre plusieurs pages
└── assets/             # images, logo
```

Pas de client HTTP ni de gestion d'état global pour l'instant — à mettre en place en même temps que le branchement au backend (`VITE_API_URL`, voir `docs/ROLES_ET_PAGES.md`).
