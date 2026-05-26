# Ordre d'exécution des tâches — INUBIL Verify

> Chaque numéro correspond au numéro de l'issue GitHub.  
> Ne pas démarrer une phase avant d'avoir terminé les dépendances indiquées.  
> **Back** = Flanc Bel (`BelCodeur2005`) · **Front** = Belvie Scindie (`NGANGUE-conception`)

---

## Dev 2 — Backend (Flanc Bel / `BelCodeur2005`)

### Phase 0 — Setup & Architecture
> Première chose à faire. Tout le reste dépend de cette phase.
> **Docker est requis.** Installer Docker Desktop avant de commencer.

| # | Issue | Dépend de |
|---|---|---|
| #50 | `[SETUP]` **Docker — docker-compose.yml + Dockerfiles** | — |
| #8 | `[SETUP]` Configurer variables d'environnement (.env) | #50 |
| #4 | `[SETUP]` Initialiser le projet NestJS backend | #50 |
| #5 | `[SETUP]` Configurer PostgreSQL + Prisma ORM | #50, #4, #8 |
| #6 | `[SETUP]` Configurer Swagger / OpenAPI | #4 |

**Livrable :** `docker-compose up` démarre toute la stack. NestJS sur `localhost:3000`, Swagger sur `/api`, PostgreSQL accessible via pgAdmin sur `localhost:5050`.

---

### Phase 1 — Authentification
> Démarrer après Phase 0 complète.

| # | Issue | Dépend de |
|---|---|---|
| #9 | `[AUTH-BACK]` Module Auth — login / logout / refresh | #5, #8 |
| #10 | `[AUTH-BACK]` Guards JWT et Permissions (RBAC) | #9 |
| #11 | `[AUTH-BACK]` Gestion sessions et historique connexions | #9, #10 |
| #69 | `[AUTH-BACK]` Vérification email à la création de compte | #9, #8 |
| #68 | `[AUTH-BACK]` API profil utilisateur — GET /auth/me + PATCH /profil | #9 |

**Livrable :** `POST /auth/login` retourne un JWT valide. Les routes protégées renvoient 401 sans token, 403 sans permission. Email de vérification envoyé à la création de compte. `GET /auth/me` retourne le profil complet.

---

### Phase 2 — Universités & Rôles
> Démarrer après Phase 1 complète. Peut se faire en parallèle avec Front Phase 1.

| # | Issue | Dépend de |
|---|---|---|
| #15 | `[UNIV-BACK]` Module Universités CRUD complet | #10 |
| #16 | `[RBAC-BACK]` Module Rôles et Permissions CRUD | #10 |
| #53 | `[AUTH-BACK]` Système d'invitations collaborateurs université | #15, #16 |

**Livrable :** CRUD complet `/universites` et `/roles`, endpoint invitation par email, endpoint activation de compte.

---

### Phase 3 — Émission de Diplômes
> La phase la plus longue et la plus importante. Suivre cet ordre précis.

| # | Issue | Dépend de |
|---|---|---|
| #20 | `[DOC-BACK]` Service calcul hash SHA-256 | #4 |
| #23 | `[DOC-BACK]` Service génération QR code | #4 |
| #19 | `[DOC-BACK]` Service génération PDF diplôme | #20 |
| #21 | `[DOC-BACK]` Service upload IPFS via Pinata | #20, #8 |
| #22 | `[DOC-BACK]` Service Blockchain Ethers.js + Polygon | #20, #21, #8 |
| #24 | `[DOC-BACK]` Workflow émission — CRUD documents complet | #19, #21, #22, #23 |
| #51 | `[DOC-BACK]` Endpoint révocation de diplôme | #22, #24 |
| #25 | `[DOC-BACK]` Notification email étudiant après émission | #24, #8 |

> **Note importante sur #22 :** le smart contract (`DiplomaRegistry.sol`, Phase 6) doit être déployé sur testnet avant de pouvoir finaliser ce service. Implémenter le service en premier avec une adresse de contrat fictive, puis finaliser après Phase 6.

**Livrable :** endpoint `POST /documents` crée un diplôme : hash SHA-256 → upload IPFS → inscription blockchain → QR code → PDF → email étudiant.

---

### Phase 4 — Vérification Publique
> Démarrer après #24. Peut se faire en parallèle avec Phase 5.

| # | Issue | Dépend de |
|---|---|---|
| #29 | `[VERIF-BACK]` Endpoints vérification publique (sans auth) | #24 |
| #30 | `[VERIF-BACK]` Génération rapport PDF de vérification horodaté | #29 |
| #70 | `[VERIF-BACK]` Historique des vérifications (utilisateur connecté) | #29, #10 |

**Livrable :** `GET /verify/:identifiant` fonctionne sans authentification et retourne le statut depuis la blockchain. `GET /verifications/mes-verifications` retourne l'historique paginé pour l'utilisateur connecté.

---

### Phase 5 — Espace Étudiant
> Démarrer après Phase 4.

| # | Issue | Dépend de |
|---|---|---|
| #33 | `[ETU-BACK]` API espace étudiant complet | #24, #51, #10 |
| #34 | `[ETU-BACK]` Système partage sécurisé relevé de notes | #33 |

**Livrable :** un étudiant connecté peut voir ses diplômes, les télécharger, et générer un lien de partage unique avec expiration.

---

### Phase 6 — Smart Contract
> Peut se faire en parallèle avec Phase 3-5 (développement séparé). Finaliser avant la mise en production.

| # | Issue | Dépend de |
|---|---|---|
| #37 | `[BLOCKCHAIN]` Écrire DiplomaRegistry.sol (Solidity 0.8+) | — |
| #38 | `[BLOCKCHAIN]` Tests Smart Contract avec Hardhat | #37 |
| #39 | `[BLOCKCHAIN]` Déployer smart contract sur Polygon Amoy Testnet | #38 |

**Fonctions à implémenter dans le contrat :**
- `registerDiploma(bytes32 hash, string ipfsCid)` — enregistre un diplôme
- `verifyDiploma(bytes32 hash)` — retourne les infos d'un diplôme
- `revokeDiploma(bytes32 hash)` — révoque un diplôme
- `authorizeUniversity(address univ)` — autorise une université

**Livrable :** contrat déployé sur Polygon Amoy Testnet (chain ID 80002), adresse du contrat à renseigner dans `.env` → `CONTRACT_ADDRESS`.

---

### Admin & Finalisation
> Démarrer après Phase 5.

| # | Issue | Dépend de |
|---|---|---|
| #40 | `[ADMIN-BACK]` API statistiques et journal d'audit | Phases 1-5 |
| #45 | `[TEST-BACK]` Tests unitaires et e2e backend NestJS | Phases 1-5 |
| #47 | `[DEPLOY]` Déploiement backend sur Railway | #45, Phase 6 |
| #49 | `[DOC]` README complet du projet | #47 |

---

## Dev 1 — Frontend (Belvie Scindie / `NGANGUE-conception`)

> **Important :** le frontend dépend des APIs backend. Pour chaque phase, commencer les maquettes et les composants Angular pendant que le backend développe ses endpoints. Utiliser des données fictives (`mock`) jusqu'à ce que l'API soit prête.

---

### Phase 0 — Setup Angular
> Démarrer en parallèle avec Phase 0 backend.
> Le `docker-compose.yml` (issue #50) doit exister avant de commencer.

| # | Issue | Dépend de |
|---|---|---|
| #7 | `[SETUP]` Initialiser le projet Angular 18 frontend | #50 |
| #8 | `[SETUP]` Configurer variables d'environnement (.env) | #7 |

**Livrable :** `docker-compose up frontend` démarre Angular sur `localhost:4200`, routing configuré, Angular Material installé.

---

### Maquettes (en parallèle avec Phase 0 et 1)
> Faire les maquettes le plus tôt possible pour valider le design avant le développement.

| # | Issue | Dépend de |
|---|---|---|
| #42 | `[MAQUETTE]` Landing page et page d'accueil INUBIL Verify | #7 |
| #43 | `[MAQUETTE]` Maquettes backoffice — admin, saisie, validation | #42 |
| #44 | `[MAQUETTE]` Maquettes espace étudiant et vérification publique | #42 |

**Outil :** Stitch. Couleurs officielles : primaire `#1F3864`, accent `#2E75B6`.

---

### Phase 1 — Authentification
> Démarrer après #7. Peut se faire avec mocks en attendant `POST /auth/login` backend (#9).

| # | Issue | Dépend de |
|---|---|---|
| #12 | `[AUTH-FRONT]` Page Login Angular | #7 |
| #13 | `[AUTH-FRONT]` AuthGuard et PermissionGuard Angular | #12 |
| #14 | `[AUTH-FRONT]` Pages mot de passe oublié et réinitialisation | #12 |
| #57 | `[AUTH-FRONT]` Page inscription compte optionnel | #12, API #69 |
| #54 | `[AUTH-FRONT]` Page invitations et activation de compte | #13, API #53, API #69 |
| #64 | `[AUTH-FRONT]` Pages profil utilisateur et sessions | #13, API #68, API #11 |

**Livrable :** formulaire login fonctionnel, JWT stocké en localStorage, redirection selon le rôle, page profil avec modification des informations et liste des sessions actives.

---

### Phase 2 — Universités & Rôles
> Démarrer après Phase 1. Dépend des APIs backend #15 et #16.

| # | Issue | Dépend de |
|---|---|---|
| #17 | `[UNIV-FRONT]` Page gestion des universités (admin) | #13, API #15 |
| #18 | `[RBAC-FRONT]` Page gestion des rôles et permissions (admin) | #13, API #16 |

**Livrable :** tableaux de gestion avec pagination, formulaires création/modification.

---

### Phase 3 — Émission de Diplômes
> Démarrer après Phase 2. Dépend du workflow backend #24.

| # | Issue | Dépend de |
|---|---|---|
| #26 | `[DOC-FRONT]` Formulaire saisie diplôme (stepper 3 étapes) | #13, API #24 |
| #27 | `[DOC-FRONT]` Page liste et gestion des diplômes | #26 |
| #28 | `[DOC-FRONT]` Page détail diplôme — QR code et blockchain info | #27 |
| #52 | `[DOC-FRONT]` Interface révocation de diplôme | #28, API #51 |

**Livrable :** formulaire stepper 3 étapes, liste filtrée, page détail avec QR code, modal révocation avec confirmation obligatoire.

---

### Phase 4 — Vérification Publique
> Peut démarrer en parallèle avec Phase 3. Dépend de l'API backend #29.

| # | Issue | Dépend de |
|---|---|---|
| #31 | `[VERIF-FRONT]` Page vérification publique (sans compte) | API #29 |
| #32 | `[VERIF-FRONT]` Composant scan QR code mobile | #31 |
| #66 | `[VERIF-FRONT]` Page historique des vérifications | #13, API #70 |

**Livrable :** page accessible sans connexion sur `verify.inubil.com/d/[identifiant]`, scan QR code via caméra mobile, affichage résultat (valide / révoqué / introuvable), historique paginé des vérifications pour l'utilisateur connecté.

---

### Phase 5 — Espace Étudiant
> Démarrer après Phase 4. Dépend des APIs backend #33 et #34.

| # | Issue | Dépend de |
|---|---|---|
| #35 | `[ETU-FRONT]` Dashboard étudiant | #13, API #33 |
| #36 | `[ETU-FRONT]` Page partage diplôme — lien unique et QR | #35, API #34 |
| #55 | `[ETU-FRONT]` Page visualisation document partagé (destinataire) | API #34 |

**Livrable :** espace étudiant complet, génération lien de partage, page publique `/partage/:token` pour l'employeur/autre université.

---

### Pages partagées & Finalisation
> Les pages partagées peuvent être développées tôt (Phase 1-2). Les tests et déploiement en dernier.

| # | Issue | Dépend de |
|---|---|---|
| #56 | `[FRONT]` Landing page — composant Angular | #7 |
| #65 | `[FRONT]` Pages d'erreur 404 et 403 | #13 |
| #67 | `[FRONT]` Centre de notifications | #13, API #9 |
| #58 | `[ADMIN-FRONT]` Pages gestion des utilisateurs | #13, API #40 |
| #59 | `[ADMIN-FRONT]` Page journal d'audit | #13, API #40 |
| #60 | `[UNIV-FRONT]` Dashboard université | #13, API #15 |
| #61 | `[UNIV-FRONT]` Page validation des diplômes (directeur pédagogique) | #13, API #24 |
| #62 | `[UNIV-FRONT]` Page paramètres université | #13, API #15 |
| #41 | `[ADMIN-FRONT]` Dashboard admin — KPIs et graphiques | #13, API #40 |
| #46 | `[TEST-FRONT]` Tests composants Angular | Phases 1-5 |
| #48 | `[DEPLOY]` Déploiement frontend sur Vercel | #46 |

---

## Vue d'ensemble — Planning suggéré

```
Semaine 1     #50 Docker setup (docker-compose + Dockerfiles) — FLANC SEUL
Semaine 1-2   Phase 0 (NestJS + Angular + .env) + Maquettes
Semaine 3-4   Phase 1 (auth back + front)
Semaine 5-6   Phase 2 (universités + rôles) + Smart Contract (en parallèle)
Semaine 7-9   Phase 3 (émission diplômes — la plus longue)
Semaine 10    Phase 4 (vérification publique)
Semaine 11    Phase 5 (espace étudiant)
Semaine 12    Admin dashboard + finaliser Smart Contract
Semaine 13    Tests (unitaires + e2e + composants)
Semaine 14    Déploiement Railway + Vercel + README
```

---

## Dépendances critiques à respecter

```
#50 (Docker — docker-compose.yml + Dockerfiles)  ← POINT DE DÉPART
  ├── #4 (NestJS init)
  │     └── #5 (Prisma + PostgreSQL via Docker) ──► #9 (Auth) ──► #10 (Guards) ──► #15, #16, #24...
  │     └── #6 (Swagger)
  │
  ├── #7 (Angular init) ──► #12 (Login) ──► #13 (AuthGuard) ──► #17, #26, #35...
  │
  └── #8 (.env — partagé entre les deux devs)

#9 (Auth) ──► #69 (Email vérification) ──► #57, #54
           ──► #68 (API profil) ──► #64 (Pages profil/sessions front)
#29 (Vérif publique) ──► #70 (Historique vérifications) ──► #66 (Front historique)

#37 (DiplomaRegistry.sol) ──► #38 (Tests Hardhat) ──► #39 (Deploy Amoy Testnet)
  └── Adresse contrat → .env CONTRACT_ADDRESS ──► #22 (Ethers.js) ──► #24 (Workflow émission)
```

> Prérequis unique : **Docker Desktop** installé sur les deux machines. Aucune autre installation locale nécessaire.

> Si une issue bloque (bug, question), ouvrir un commentaire sur l'issue GitHub et taguer l'autre développeur. Ne pas rester bloqué plus de 24h sans signaler.
