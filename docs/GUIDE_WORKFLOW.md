# Guide de Travail - INUBIL Verify

**Équipe :** Flanc Bel (`BelCodeur2005`) · Backend | Belvie Scindie (`NGANGUE-conception`) · Frontend  
**Dépôt :** https://github.com/BelCodeur2005/INUBIL-VERIFY  
**Project Board :** https://github.com/users/BelCodeur2005/projects/2

---

## 1. Les colonnes du board

| Colonne | Signification | Qui agit |
|---|---|---|
| **Backlog** | Issue planifiée, pas encore démarrée | - |
| **Sprint actuel** | Sélectionnée pour la semaine en cours | Dev qui la prend |
| **En cours** | Développement actif | Dev assigné |
| **En review** | Code poussé, PR ouverte, en attente de validation | L'autre dev (ou les deux) |
| **Terminé** | PR mergée sur `main`, fonctionnalité validée | - |

> **Règle :** une issue = une branche = une PR. On ne merge jamais directement sur `main`.

---

## 2. Démarrer une semaine (sprint)

Un **sprint** est une période de 2 semaines pendant laquelle chaque dev s'engage sur un ensemble précis de tâches. À la fin du sprint, les tâches choisies doivent être livrées et fonctionnelles.

**Comment utiliser le champ Sprint dans GitHub Projects :**
1. Sur le board, chaque issue a un champ **Sprint** (Iteration)
2. Assigner une issue à `Sprint 1`, `Sprint 2`, etc.
3. Filtrer le board : taper `Sprint:Sprint 1` dans la barre de recherche → seules les issues du sprint actuel s'affichent
4. En fin de sprint : les issues non terminées se déplacent au sprint suivant

**Démarrer un sprint :**
1. Aller sur le board → colonne **Backlog**
2. Chaque dev sélectionne ses issues pour les 2 semaines → leur assigner le sprint en cours → déplacer vers **Sprint actuel**
3. Mettre à jour le champ **Priorité** si nécessaire (Haute / Moyenne / Basse)
4. Commencer le travail → déplacer l'issue vers **En cours**

**Critère de sélection :** respecter l'ordre des phases (Phase 0 avant Phase 1, etc.). Ne pas démarrer la Phase 2 si la Phase 1 n'est pas terminée.

---

## 3. Convention de nommage des branches

```
<type>/<numéro-issue>-<description-courte>
```

**Types :**
- `feature/` - nouvelle fonctionnalité
- `fix/` - correction de bug
- `chore/` - configuration, setup, dépendances
- `docs/` - documentation uniquement

**Exemples :**
```bash
git checkout -b feature/4-nestjs-init
git checkout -b feature/12-login-page
git checkout -b fix/22-ethers-connection
git checkout -b chore/5-prisma-setup
```

---

## 4. Convention de commits

Format : `type(scope): message court`

```bash
feat(auth): ajouter endpoint login avec JWT
feat(blockchain): implémenter registerDiploma dans DiplomaRegistry.sol
fix(auth): corriger expiration token refresh
chore(setup): initialiser projet NestJS avec Prisma
docs(api): ajouter documentation Swagger auth module
test(auth): ajouter tests unitaires JwtGuard
```

**Types :** `feat` · `fix` · `chore` · `docs` · `test` · `refactor`

---

## 5. Ouvrir une Pull Request

Quand le travail sur une issue est terminé :

```bash
git add .
git commit -m "feat(auth): ..."
git push origin feature/4-nestjs-init
```

Sur GitHub :
1. Créer la PR vers `main`
2. Titre : reprendre le titre de l'issue (`[SETUP] Initialiser le projet NestJS backend`)
3. Dans la description, lier l'issue : `Closes #4`
4. Assigner l'autre dev en **Reviewer**
5. Déplacer l'issue sur le board → **En review**

---

## 6. Valider et merger une PR

Le reviewer (l'autre dev) :
1. Lit le code, laisse des commentaires si nécessaire
2. Si OK → **Approve** la PR
3. Le dev auteur **merge** (Squash and merge recommandé)
4. Déplacer l'issue → **Terminé**
5. Supprimer la branche après merge

> **Si conflit :** `git fetch origin && git rebase origin/main` sur la branche de travail, résoudre, puis `git push --force-with-lease`.

---

## 7. Utiliser les champs du board

### Champ `Status`
Déplacer manuellement au fil du travail (Backlog → Sprint actuel → En cours → En review → Terminé).

### Champ `Priorité`
| Valeur | Usage |
|---|---|
| **Haute** | Bloque d'autres issues, deadline proche |
| **Moyenne** | Issue normale (défaut) |
| **Basse** | Nice-to-have, peut attendre |

### Champ `Module`
Déjà défini sur chaque issue. Permet de filtrer par module (Auth, Blockchain, Documents, etc.) pour voir l'avancement d'une fonctionnalité précise.

### Champ `Développeur`
- `Dev 1 - Frontend` → Belvie (NGANGUE-conception)
- `Dev 2 - Backend` → Flanc (BelCodeur2005)
- `Les deux` → Issues communes (ex : variables d'environnement)

### Champ `Milestone`
Indique la phase du projet. Permet de voir la progression globale par phase dans l'onglet **Milestones** du dépôt.

---

## 8. Filtres utiles sur le board

Dans GitHub Projects, utiliser la barre de filtre :

| Filtre | Syntaxe |
|---|---|
| Mes issues uniquement | `assignee:BelCodeur2005` |
| Issues frontend | `label:frontend` |
| Issues blockchain | `label:blockchain` |
| Phase en cours | `milestone:"Phase 1 - Authentification"` |
| Issues haute priorité | `field:Priorité=Haute` |

---

## 9. Lancer l'environnement de développement

Le projet tourne entièrement sous **Docker**. Pas besoin d'installer PostgreSQL ou Node localement.

```bash
# Démarrer toute la stack
docker-compose up

# Démarrer en arrière-plan
docker-compose up -d

# Voir les logs
docker-compose logs -f backend

# Arrêter
docker-compose down
```

| Service | URL locale |
|---|---|
| Backend NestJS | `http://localhost:3000` |
| Swagger (doc API) | `http://localhost:3000/api` |
| Frontend Angular | `http://localhost:4200` |
| pgAdmin (base de données) | `http://localhost:5050` |

> Prérequis unique : **Docker Desktop** installé. Aucune autre installation nécessaire.

---

## 10. Variables d'environnement

Le fichier `.env` ne doit **jamais** être commité. Partager les valeurs de configuration via un canal privé (WhatsApp, email chiffré).

Variables backend à configurer :
```
DATABASE_URL=postgresql://...
JWT_SECRET=...
PINATA_API_KEY=...
PINATA_SECRET_KEY=...
POLYGON_RPC_URL=https://rpc-amoy.polygon.technology
PRIVATE_KEY=...
CONTRACT_ADDRESS=...
MAIL_USER=...
MAIL_PASS=...
```

---

## 11. Environnements

| Environnement | URL | Branche |
|---|---|---|
| **Développement local** | `localhost:3000` (back) / `localhost:4200` (front) | toute branche |
| **Production** | `verify.inubil.com` | `main` |
| **Blockchain dev** | Polygon Amoy Testnet (chain ID 80002) | - |
| **Blockchain prod** | Polygon Mainnet | - |

---

## 12. Résumé quotidien (standup)

Chaque jour de travail, mettre à jour le board :
- Déplacer ses issues dans la bonne colonne
- Si bloqué : ouvrir une **Discussion** sur l'issue GitHub et taguer l'autre dev (`@BelCodeur2005` ou `@NGANGUE-conception`)
- Ne jamais laisser une issue en **En cours** plus de 3 jours sans mise à jour
