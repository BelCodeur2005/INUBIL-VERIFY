# Guide Git & GitHub — INUBIL Verify

> Ce guide explique comment travailler professionnellement sur le projet avec Git et GitHub.  
> **Équipe :** Flanc Bel (`BelCodeur2005`) · Backend | Belvie Scindie (`NGANGUE-conception`) · Frontend

---

## Comprendre les concepts de base

Avant de commencer, voici les 4 notions essentielles :

| Terme | Explication simple |
|---|---|
| **Repository (repo)** | Le dossier du projet hébergé sur GitHub |
| **Clone** | Télécharger le projet sur ton PC pour la première fois |
| **Commit** | Sauvegarder une version de ton travail avec un message |
| **Push** | Envoyer tes commits sur GitHub |
| **Pull** | Récupérer les dernières modifications de l'autre dev |
| **Branch (branche)** | Une copie isolée du projet pour travailler sans casser le reste |
| **Pull Request (PR)** | Une demande de fusion de ta branche vers `main` |

---

## 1. Installation et configuration (une seule fois)

### Installer Git
Télécharger et installer Git : https://git-scm.com/download/win

### Configurer ton identité Git
```bash
git config --global user.name "Ton Prénom Nom"
git config --global user.email "ton_email@gmail.com"
```

### Cloner le projet sur ton PC
```bash
git clone https://github.com/BelCodeur2005/INUBIL-VERIFY.git
cd INUBIL-VERIFY
```

> Cette commande télécharge tout le projet sur ton PC dans un dossier `INUBIL-VERIFY`.

---

## 2. Règle d'or — Ne jamais travailler sur `main`

La branche `main` contient le code stable et validé. On ne code **jamais** directement dessus.

**Workflow à suivre pour chaque tâche :**
```
main → créer une branche → coder → commit → push → Pull Request → merge dans main
```

---

## 3. Démarrer une nouvelle tâche

### Étape 1 — Récupérer les dernières modifications
Toujours faire ça avant de commencer une nouvelle tâche :
```bash
git checkout main
git pull origin main
```

### Étape 2 — Créer une branche pour ta tâche
```bash
git checkout -b feature/4-nestjs-init
```

Le nom de la branche suit ce format : `type/numero-issue-description`

| Type | Usage |
|---|---|
| `feature/` | Nouvelle fonctionnalité |
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

## 4. Travailler et sauvegarder (commits)

### Vérifier ce que tu as modifié
```bash
git status
```
Affiche les fichiers modifiés (en rouge = pas encore sauvegardé, en vert = prêt à commiter).

### Ajouter les fichiers à sauvegarder
```bash
# Ajouter un fichier spécifique
git add src/auth/auth.service.ts

# Ajouter tous les fichiers modifiés
git add .
```

### Créer un commit (sauvegarder)
```bash
git commit -m "feat(auth): ajouter endpoint login avec JWT"
```

**Format du message de commit :** `type(module): description courte`

| Type | Usage |
|---|---|
| `feat` | Nouvelle fonctionnalité |
| `fix` | Correction de bug |
| `chore` | Setup, configuration |
| `docs` | Documentation |
| `test` | Tests |
| `refactor` | Amélioration du code sans nouvelle fonctionnalité |

**Exemples de messages de commit :**
```bash
git commit -m "feat(auth): ajouter endpoint POST /auth/login"
git commit -m "feat(login): créer composant page login Angular"
git commit -m "fix(auth): corriger expiration du token refresh"
git commit -m "chore(docker): ajouter docker-compose.yml"
git commit -m "docs(readme): mettre à jour guide installation"
```

> **Conseil :** faire des petits commits réguliers plutôt qu'un seul gros commit à la fin.

---

## 5. Envoyer son travail sur GitHub (push)

```bash
git push origin feature/9-auth-login
```

> La première fois sur une nouvelle branche, Git peut te demander de confirmer. Taper la commande exactement comme affichée.

---

## 6. Ouvrir une Pull Request (PR)

Une PR est une demande pour fusionner ton travail dans `main`. L'autre dev va relire ton code avant de valider.

1. Aller sur https://github.com/BelCodeur2005/INUBIL-VERIFY
2. GitHub affiche automatiquement un bouton **"Compare & pull request"** → cliquer dessus
3. Remplir le formulaire :
   - **Titre :** reprendre le titre de l'issue (ex: `[AUTH-BACK] Module Auth — login / logout / refresh`)
   - **Description :** écrire `Closes #9` pour lier l'issue automatiquement
4. Assigner l'autre dev dans **"Reviewers"** (à droite)
5. Cliquer **"Create pull request"**
6. Sur le board GitHub Projects → déplacer l'issue dans la colonne **"En review"**

---

## 7. Relire et valider une PR (code review)

Quand l'autre dev t'assigne comme reviewer :

1. Aller sur l'onglet **"Pull requests"** du dépôt
2. Ouvrir la PR à relire
3. Aller sur l'onglet **"Files changed"** → voir toutes les modifications
4. Si tout est bon → cliquer **"Review changes"** → **"Approve"** → **"Submit review"**
5. Le dev auteur peut maintenant **merger** la PR

> Si tu as des remarques : cliquer sur une ligne de code → laisser un commentaire → **"Request changes"**.

---

## 8. Merger une PR

Une fois la PR approuvée par l'autre dev :

1. Cliquer **"Squash and merge"** (regroupe tous les commits en un seul)
2. Confirmer le merge
3. Cliquer **"Delete branch"** pour supprimer la branche (elle n'est plus nécessaire)
4. Sur le board GitHub Projects → l'issue passe automatiquement en **"Terminé"**

---

## 9. Workflow quotidien résumé

```
Chaque matin avant de commencer :
  git checkout main
  git pull origin main         ← récupérer le travail de l'autre dev

Démarrer une tâche :
  git checkout -b feature/XX-nom-tache

Pendant le travail (régulièrement) :
  git add .
  git commit -m "feat(module): description"

Fin de journée ou fin de tâche :
  git push origin feature/XX-nom-tache

Tâche terminée :
  → Ouvrir une Pull Request sur GitHub
  → Assigner l'autre dev en reviewer
  → Déplacer l'issue sur le board → "En review"
```

---

## 10. Situations courantes

### Récupérer les modifications de l'autre dev pendant que tu travailles
```bash
git fetch origin
git rebase origin/main
```
> Cela intègre le travail de l'autre dev dans ta branche sans perdre ton travail.

### Voir l'historique des commits
```bash
git log --oneline
```

### Annuler les modifications non sauvegardées (danger — irréversible)
```bash
git checkout -- nom_du_fichier
```

### Voir sur quelle branche tu es
```bash
git branch
```
> La branche active est marquée d'un `*`.

---

## 11. Erreurs fréquentes à éviter

| Erreur | Conséquence | Solution |
|---|---|---|
| Travailler directement sur `main` | Casser le code stable pour tout le monde | Toujours créer une branche |
| Commiter le fichier `.env` | Exposer les clés secrètes sur Internet | Le `.gitignore` le bloque automatiquement |
| Push sans pull au préalable | Conflits difficiles à résoudre | Toujours `git pull` avant de commencer |
| Gros commits avec tout le travail | Impossible à relire | Faire des petits commits réguliers |
| Merger sans review | Introduire des bugs en production | Toujours attendre l'approbation de l'autre dev |

---

## 12. Aide rapide — commandes essentielles

```bash
git status                          # voir ce qui a changé
git add .                           # ajouter tous les fichiers
git commit -m "message"             # sauvegarder
git push origin nom-branche         # envoyer sur GitHub
git pull origin main                # récupérer les dernières modifs
git checkout -b nouvelle-branche    # créer et basculer sur une branche
git checkout main                   # revenir sur main
git log --oneline                   # voir l'historique
git branch                          # voir toutes les branches
```
