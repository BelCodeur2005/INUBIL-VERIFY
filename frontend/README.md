# INUBIL Verify — Frontend

Interface Angular de la plateforme de certification et d'authentification de diplômes sur blockchain pour ISTAMA INUBIL (Douala, Cameroun).

## Stack

| Technologie | Version |
|---|---|
| Angular | 21 |
| TailwindCSS | v4 |
| TypeScript | 5.x |
| Node.js | 20 LTS |

## Lancer le projet

```bash
npm install
npm start
```

Frontend disponible sur **http://localhost:4200**.
L'API backend doit tourner sur **http://localhost:3000**.

## Documentation

Lis le guide complet avant de commencer à coder :

- [**GUIDE_FRONTEND.md**](GUIDE_FRONTEND.md) — structure, routing, styles, règles à respecter

## Structure rapide

```
src/app/
├── core/          ← auth, guards, modèles, services
├── shared/        ← layouts (auth, app, public)
└── features/      ← toutes les pages
```
