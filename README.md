# INUBIL Verify

Plateforme de certification et d'authentification de diplômes sur blockchain pour ISTAMA INUBIL (Douala, Cameroun).

## Stack technique

| Couche | Technologie |
|---|---|
| Frontend | Angular 18+ |
| Backend | NestJS 10+ / Node 20 LTS |
| Base de données | PostgreSQL 16 + Prisma ORM |
| Blockchain | Polygon (Solidity 0.8+, Ethers.js v6) |
| Stockage | IPFS via Pinata |
| Conteneurisation | Docker + Docker Compose |

## Lancer le projet

```bash
# Copier les variables d'environnement
cp .env.example .env
# Remplir les valeurs dans .env

# Démarrer toute la stack
docker-compose up
```

| Service | URL |
|---|---|
| Backend API | http://localhost:3000 |
| Swagger | http://localhost:3000/api |
| Frontend | http://localhost:4200 |
| pgAdmin | http://localhost:5050 |

## Documentation

- [Guide Git & GitHub](docs/GUIDE_GIT.md) — comment travailler avec Git (débutants)
- [Guide de travail](docs/GUIDE_WORKFLOW.md) — workflow, branches, commits, PR
- [Ordre des tâches](docs/GUIDE_TACHES.md) — phases par développeur
- [Pages de l'application](docs/PAGES_APPLICATION.md) — liste des 39 pages Angular

## Équipe

- **Flanc Bel** (`BelCodeur2005`) — Backend / Blockchain
- **Belvie Scindie** (`NGANGUE-conception`) — Frontend
