# Guide Git & GitHub - INUBIL Verify

> Ce guide explique comment travailler professionnellement sur le projet avec Git et GitHub.
> **Equipe :** Flanc Bel (`BelCodeur2005`) - Backend | Belvie Scindie (`NGANGUE-conception`) - Frontend

---

## Comprendre les concepts de base

| Terme | Explication simple |
|---|---|
| **Repository (repo)** | Le dossier du projet heberge sur GitHub |
| **Clone** | Telecharger le projet sur ton PC pour la premiere fois |
| **Commit** | Sauvegarder une version de ton travail avec un message |
| **Push** | Envoyer tes commits sur GitHub |
| **Pull** | Recuperer les dernieres modifications de l'autre dev |
| **Branch (branche)** | Une copie isolee du projet pour travailler sans casser le reste |
| **Pull Request (PR)** | Une demande de fusion de ta branche vers `main` |

---

## 1. Installation et configuration (une seule fois)

### Installer Git
Telecharger et installer Git : https://git-scm.com/download/win

### Installer Docker Desktop
Telecharger et installer Docker Desktop : https://www.docker.com/products/docker-desktop

> Docker Desktop est le seul outil a installer. Node.js, PostgreSQL et Angular CLI **ne s'installent pas** - tout tourne dans Docker.

### Configurer ton identite Git
```bash
git config --global user.name "Ton Prenom Nom"
git config --global user.email "ton_email@gmail.com"
```

---

## 2. Rejoindre le projet (premiere fois uniquement)

> Cette section est pour **Belvie Scindie** qui rejoint le projet deja cree par Flanc Bel.

### Etape 1 - Cloner le projet
```bash
git clone https://github.com/BelCodeur2005/INUBIL-VERIFY.git
cd INUBIL-VERIFY
```
Cette commande telecharge tout le projet sur ton PC dans un dossier `INUBIL-VERIFY`.

### Etape 2 - Creer ton fichier .env
```bash
cp .env.example .env
```
Ouvrir le fichier `.env` et remplir les valeurs avec Flanc Bel (via WhatsApp ou en prive).

### Etape 3 - Lancer la stack Docker
```bash
docker-compose up
```

Attendre que tout demarre. Verifier que ces URLs fonctionnent :
- Frontend Angular : http://localhost:4200
- Backend API : http://localhost:3000
- Swagger (doc API) : http://localhost:3000/api
- pgAdmin : http://localhost:5050

### Etape 4 - Verifier que tu es bien sur main
```bash
git branch
```
Tu dois voir `* main`. Tu es pret a travailler.

> A partir de maintenant, pour chaque nouvelle tache tu suis la section **3. Demarrer une nouvelle tache** ci-dessous.

---

## 3. Regle d'or - Ne jamais travailler sur `main`

La branche `main` contient le code stable et valide. On ne code **jamais** directement dessus.

**Workflow a suivre pour chaque tache :**
```
main -> creer une branche -> coder -> commit -> push -> Pull Request -> merge dans main
```

---

## 4. Demarrer une nouvelle tache

### Etape 1 - Recuperer les dernieres modifications
Toujours faire ca avant de commencer une nouvelle tache :
```bash
git checkout main
git pull origin main
```

### Etape 2 - Creer une branche pour ta tache
```bash
git checkout -b feature/4-nestjs-init
```

Le nom de la branche suit ce format : `type/numero-issue-description`

| Type | Usage |
|---|---|
| `feature/` | Nouvelle fonctionnalite |
| `fix/` | Correction de bug |
| `chore/` | Configuration, setup |
| `docs/` | Documentation uniquement |

**Exemples de noms de branches :**
```bash
git checkout -b feature/9-auth-login
git checkout -b feature/12-page-login-angular
git checkout -b fix/22-ethers-connection
git checkout -b chore/50-docker-setup
```

---

## 5. Travailler et sauvegarder (commits)

### Verifier ce que tu as modifie
```bash
git status
```
Affiche les fichiers modifies (en rouge = pas encore sauvegarde, en vert = pret a commiter).

### Ajouter les fichiers a sauvegarder
```bash
# Ajouter un fichier specifique
git add src/auth/auth.service.ts

# Ajouter tous les fichiers modifies
git add .
```

### Creer un commit (sauvegarder)
```bash
git commit -m "feat(auth): ajouter endpoint login avec JWT"
```

**Format du message de commit :** `type(module): description courte`

| Type | Usage |
|---|---|
| `feat` | Nouvelle fonctionnalite |
| `fix` | Correction de bug |
| `chore` | Setup, configuration |
| `docs` | Documentation |
| `test` | Tests |
| `refactor` | Amelioration du code sans nouvelle fonctionnalite |

**Exemples de messages de commit :**
```bash
git commit -m "feat(auth): ajouter endpoint POST /auth/login"
git commit -m "feat(login): creer composant page login Angular"
git commit -m "fix(auth): corriger expiration du token refresh"
git commit -m "chore(docker): ajouter docker-compose.yml"
git commit -m "docs(readme): mettre a jour guide installation"
```

> **Conseil :** faire des petits commits reguliers plutot qu'un seul gros commit a la fin.

---

## 6. Envoyer son travail sur GitHub (push)

```bash
git push origin feature/9-auth-login
```

> La premiere fois sur une nouvelle branche, Git peut te demander de confirmer. Taper la commande exactement comme affichee.

---

## 7. Ouvrir une Pull Request (PR)

Une PR est une demande pour fusionner ton travail dans `main`. L'autre dev va relire ton code avant de valider.

1. Aller sur https://github.com/BelCodeur2005/INUBIL-VERIFY
2. GitHub affiche automatiquement un bouton **"Compare & pull request"** -> cliquer dessus
3. Remplir le formulaire :
   - **Titre :** reprendre le titre de l'issue (ex: `[AUTH-BACK] Module Auth - login / logout / refresh`)
   - **Description :** ecrire `Closes #9` pour lier l'issue automatiquement
4. Assigner l'autre dev dans **"Reviewers"** (a droite)
5. Cliquer **"Create pull request"**
6. Sur le board GitHub Projects -> deplacer l'issue dans la colonne **"En review"**

---

## 8. Relire et valider une PR (code review)

Quand l'autre dev t'assigne comme reviewer :

1. Aller sur l'onglet **"Pull requests"** du depot
2. Ouvrir la PR a relire
3. Aller sur l'onglet **"Files changed"** -> voir toutes les modifications
4. Si tout est bon -> cliquer **"Review changes"** -> **"Approve"** -> **"Submit review"**
5. Le dev auteur peut maintenant **merger** la PR

> Si tu as des remarques : cliquer sur une ligne de code -> laisser un commentaire -> **"Request changes"**.

---

## 9. Merger une PR

Une fois la PR approuvee par l'autre dev :

1. Cliquer **"Squash and merge"** (regroupe tous les commits en un seul)
2. Confirmer le message de commit
3. Cliquer **"Delete branch"** pour supprimer la branche (elle n'est plus necessaire)
4. Sur le board GitHub Projects -> l'issue passe automatiquement en **"Termine"**

---

## 10. Workflow quotidien resume

```
Chaque matin avant de commencer :
  git checkout main
  git pull origin main         <- recuperer le travail de l'autre dev

Demarrer une tache :
  git checkout -b feature/XX-nom-tache

Pendant le travail (regulierement) :
  git add .
  git commit -m "feat(module): description"

Fin de journee ou fin de tache :
  git push origin feature/XX-nom-tache

Tache terminee :
  -> Ouvrir une Pull Request sur GitHub
  -> Assigner l'autre dev en reviewer
  -> Deplacer l'issue sur le board -> "En review"
```

---

## 11. Situations courantes

### Recuperer les modifications de l'autre dev pendant que tu travailles
```bash
git fetch origin
git rebase origin/main
```
Cela integre le travail de l'autre dev dans ta branche sans perdre ton travail.

### Voir l'historique des commits
```bash
git log --oneline
```

### Annuler les modifications non sauvegardees (danger - irreversible)
```bash
git checkout -- nom_du_fichier
```

### Voir sur quelle branche tu es
```bash
git branch
```
La branche active est marquee d'un `*`.

---

## 12. Erreurs frequentes a eviter

| Erreur | Consequence | Solution |
|---|---|---|
| Travailler directement sur `main` | Casser le code stable pour tout le monde | Toujours creer une branche |
| Commiter le fichier `.env` | Exposer les cles secretes sur Internet | Le `.gitignore` le bloque automatiquement |
| Push sans pull au prealable | Conflits difficiles a resoudre | Toujours `git pull` avant de commencer |
| Gros commits avec tout le travail | Impossible a relire | Faire des petits commits reguliers |
| Merger sans review | Introduire des bugs en production | Toujours attendre l'approbation de l'autre dev |

---

## 13. Aide rapide - commandes essentielles

```bash
git status                          # voir ce qui a change
git add .                           # ajouter tous les fichiers
git commit -m "message"             # sauvegarder
git push origin nom-branche         # envoyer sur GitHub
git pull origin main                # recuperer les dernieres modifs
git checkout -b nouvelle-branche    # creer et basculer sur une branche
git checkout main                   # revenir sur main
git log --oneline                   # voir l'historique
git branch                          # voir toutes les branches
```
