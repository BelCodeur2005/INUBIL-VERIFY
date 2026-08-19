# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

INUBIL Verify — blockchain-based diploma certification and authentication platform for ISTAMA INUBIL (Douala, Cameroon). Monorepo with three independently-versioned parts: `backend/` (NestJS API), the frontend (in flux — see note below, real code is React under `inubil-verify-front/`, not the stale `frontend/`), `blockchain/` (Solidity smart contracts on Polygon).

Team: Flanc Bel (`BelCodeur2005`) — backend/blockchain; Belvie Scindie (`NGANGUE-conception`) — frontend.

## Running the stack

The project runs entirely under Docker — no local Postgres/Node install needed.

```bash
cp .env.example .env   # fill in values first
docker-compose up      # or: make up (detached)
```

| Service | URL |
|---|---|
| Backend API | http://localhost:3000 |
| Swagger | http://localhost:3000/api |
| Frontend | http://localhost:4200 |
| pgAdmin | http://localhost:5050 |

Common `make` targets (wrap `docker-compose exec backend ...`): `make logs-back`, `make migrate`, `make studio` (Prisma Studio), `make reset-db`, `make shell-back`, `make shell-db` (psql). See `Makefile` for the full list.

`docker-compose.yml`'s `frontend` service still runs `npx ng serve` (leftover from the abandoned Angular attempt) against a `frontend/` that has no `package.json` — that container will fail to start as-is. Fix the compose command once real React code and its dev script land; until then `docker-compose up backend postgres pgadmin` is the working subset. No CI/CD is configured (`.github/workflows` doesn't exist) — tests and lint are local-only right now.

## Backend (`backend/`, NestJS + Prisma)

```bash
npm run start:dev       # watch mode
npm run lint             # eslint --fix
npm run test              # jest, all specs
npm run test -- documents.service.spec.ts   # single spec
npm run test:e2e          # jest -c test/jest-e2e.json
npm run prisma:migrate    # create + apply a migration (dev)
npm run prisma:generate   # regenerate Prisma client after schema changes
npm run prisma:studio
```

Module layout follows standard Nest conventions: one folder per domain under `backend/src/` (`auth`, `documents`, `etudiants`, `universites`, `mentions`, `roles`, `permissions`, `verifications`, `blockchain`, `notifications`, `webhooks`, `cles-api`, `configurations`, `partenariats`, `partages`, `invitations`, `backup`, `admin`, `audit`, `mail`, `storage`, `types-document`, `utilisateurs`, `etudiants-admin`, `common`, `config`, `prisma`). Each domain module typically has `*.module.ts` / `*.controller.ts` / `*.service.ts`, plus focused helper services colocated in the same folder (e.g. `documents/hash.service.ts`, `documents/pdf.service.ts`, `documents/qr-code.service.ts`, `documents/notification-emission.service.ts`), each with a colocated `*.spec.ts`.

Database access is Prisma-only (`backend/prisma/schema.prisma`, PostgreSQL). Table/column names are French and snake_case (`documents`, `etudiants`, `universites`, `cles_api`, `utilisateurs`, `mentions`, `configurations`...) — match that convention for any new model. The `documents` model is the core entity: it carries both the academic record fields (etudiant, universite, type_document, mention, dates) and the blockchain/integrity fields together (`hash_sha256`, `adresse_contrat`, `transaction_hash`, `bloc_numero`, `reseau` for the Polygon anchor). `statut` is a `statut_document` enum: `brouillon → en_validation → actif`, with `revoque`/`rejete`/`expire` as terminal/exception states — don't assume the English "draft/validated/emitted" names used in older docs, the enum values are French.

Auth is JWT-based (`@nestjs/passport` + `passport-jwt`); permission checks use a custom `require-permissions.decorator.ts` (role/permission-based, not just route guards) — check `backend/src/auth` and `backend/src/permissions` together when touching access control.

## Frontend — confusing history, read this before touching anything frontend-related

There have been **three** frontend attempts, and as of 2026-08-18 none of them is both merged to `main` and present in a typical local checkout. Check `git log`/`git branch -a`/open PRs before assuming any of this is stale — it moves fast and this section will go out of date quickly.

1. `frontend/` — original Angular scaffold (abandoned early; empty/near-empty in most checkouts, `.angular` is leftover cache, safe to ignore/delete).
2. `frontend/` again, Angular 21 this time — added by PR #122 (`feat(frontend): initialiser Angular 21 — structure complète, login, guards, design system`), **merged to `origin/main`**. If your local `main` is behind `origin/main` (check `git log main..origin/main`), you won't see this until you pull — a plain `ls frontend/` on a stale local checkout will wrongly look empty.
3. **`inubil-verify-front/` — the real, current frontend, in React (Vite + JSX + CSS Modules)**, authored by Belvie (`NGANGUE-conception`). It's a *separate top-level folder*, not a rewrite of `frontend/`. As of 2026-08-18 this only exists on **PR #123** (`modifications frontend poussées`, branch `feature/migration-react`), which is **open, not merged** — +12996/−59 across 68 files, not on `main` yet, not present in a plain clone/pull of `main`. To get it: `git fetch origin && git checkout feature/migration-react` (or review/merge PR #123 first if that's the goal). It also touches/removes a handful of files under `frontend/`, consistent with `frontend/` being retired in favor of this folder once merged.

Don't assume any file/folder convention, port, or Docker service name from `frontend/` or `docker-compose.yml` (still wired to `frontend/` + `npx ng serve`) applies to the real React app — `inubil-verify-front/` hasn't been wired into `docker-compose.yml` yet as of PR #123. `docs/PAGES_APPLICATION.md` (39 pages, written for the Angular era) is still probably a reasonable page-inventory reference, but verify against `inubil-verify-front/src/features/` once that's merged — page/component names there (e.g. `AdminInubil`, `DashboardDirecteur`, `DashboardEtudiant`, `VerificationPublique`) don't line up 1:1 with the old Angular route plan. Issue labels on GitHub are stale too — many still say `angular`.

## Blockchain (`blockchain/`, Hardhat + Solidity 0.8+, Ethers v6)

```bash
npm run compile
npm run test
npm run test:coverage
npm run deploy:amoy      # Polygon Amoy testnet (chain ID 80002) — used for dev
npm run deploy:polygon   # Polygon mainnet — production
```

Single contract: `blockchain/contracts/InubilVerify.sol`. Deployment goes through `blockchain/scripts/deploy.ts` (run via `npm run deploy:amoy` / `deploy:polygon`, which call `hardhat run scripts/deploy.ts --network ...`) — `blockchain/ignition/modules/` exists but is empty, Ignition is not actually used. The backend talks to the deployed contract via `backend/src/blockchain` using `CONTRACT_ADDRESS` + `POLYGON_RPC_URL`/`PRIVATE_KEY` from env — redeploying the contract means updating `CONTRACT_ADDRESS` in `.env` and any address references in the backend.

## Storage

Storage is **S3/R2** (`backend/src/storage`), not IPFS — IPFS/Pinata was removed entirely (2026-08-18): it was never wired into the emission flow (`IpfsService` was dead code, `documents.cid_ipfs` was never written), so the `ipfs/` module, the `cid_ipfs` column, and the Pinata env vars were dropped rather than left as unused surface area. Don't reintroduce Pinata without checking with the team first — S3/R2 is the deliberate, current choice. `documents.service.ts` uploads the PDF through `StorageService` and persists the key on `documents.pdf_url`; presigned download URLs also go through `StorageService.getPresignedUrl`. `StorageService` auto-selects Cloudflare R2 if `CLOUDFLARE_ACCOUNT_ID` is set, else plain AWS S3 (via `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`/`AWS_S3_BUCKET`) — these are now documented in `.env.example`. `docs/guide-aws-s3.md` and `docs/guide-cloudflare-r2.md` cover setup for each backend.

## Git workflow

Full detail in `docs/GUIDE_WORKFLOW.md` and `docs/GUIDE_GIT.md`; the essentials:

- One issue = one branch = one PR. Never commit directly to `main`.
- Branch naming: `<type>/<issue-number>-<short-description>` — types `feature/`, `fix/`, `chore/`, `docs/`.
- Commit format: `type(scope): short message` — types `feat`, `fix`, `chore`, `docs`, `test`, `refactor` (e.g. `feat(auth): ajouter endpoint login avec JWT`).
- PR description links the issue (`Closes #N`); squash-merge is the recommended merge strategy.
- Rebase (not merge) `origin/main` into a working branch to resolve conflicts, then `git push --force-with-lease`.

Task ordering/phases are tracked in `docs/GUIDE_TACHES.md` — respect phase order (don't start Phase 2 work before Phase 1 is done) when picking up new work.
