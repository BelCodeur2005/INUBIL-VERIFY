.PHONY: up down logs build migrate reset-db shell-back shell-db ps

# ─── Stack complète ────────────────────────────────────────────────────────────
up:
	docker compose up -d

down:
	docker compose down

restart:
	docker compose down && docker compose up -d

# ─── Logs ──────────────────────────────────────────────────────────────────────
logs:
	docker compose logs -f

logs-back:
	docker compose logs -f backend

logs-front:
	docker compose logs -f frontend

# ─── Build ─────────────────────────────────────────────────────────────────────
build:
	docker compose build --no-cache

build-back:
	docker compose build --no-cache backend

build-front:
	docker compose build --no-cache frontend

# ─── Base de données / Prisma ──────────────────────────────────────────────────
migrate:
	docker compose exec backend npx prisma migrate dev

migrate-prod:
	docker compose exec backend npx prisma migrate deploy

generate:
	docker compose exec backend npx prisma generate

studio:
	docker compose exec backend npx prisma studio

reset-db:
	docker compose exec backend npx prisma migrate reset --force

# ─── Accès aux conteneurs ──────────────────────────────────────────────────────
shell-back:
	docker compose exec backend sh

shell-db:
	docker compose exec postgres psql -U inubil -d inubil_db

# ─── Statut ────────────────────────────────────────────────────────────────────
ps:
	docker compose ps
