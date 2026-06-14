# Guide complet — Cloudflare R2 pour INUBIL Verify

> Ce guide explique ce qu'est Cloudflare R2, pourquoi on l'a choisi
> pour la phase de développement, et comment le configurer de A à Z.

---

## Table des matières

1. [C'est quoi Cloudflare R2 ?](#1-cest-quoi-cloudflare-r2-)
2. [Comment ça fonctionne dans INUBIL Verify ?](#2-comment-ça-fonctionne-dans-inubil-verify-)
3. [Pourquoi R2 pour la phase de développement ?](#3-pourquoi-r2-pour-la-phase-de-développement-)
4. [Créer un compte Cloudflare](#4-créer-un-compte-cloudflare)
5. [Créer un bucket R2](#5-créer-un-bucket-r2)
6. [Créer un token API R2](#6-créer-un-token-api-r2)
7. [Récupérer l'Account ID](#7-récupérer-laccount-id)
8. [Configurer le projet INUBIL Verify](#8-configurer-le-projet-inubil-verify)
9. [Tester que le stockage fonctionne](#9-tester-que-le-stockage-fonctionne)
10. [Plan gratuit — limites et coûts](#10-plan-gratuit--limites-et-coûts)
11. [Migration vers AWS S3 en production](#11-migration-vers-aws-s3-en-production)

---

## 1. C'est quoi Cloudflare R2 ?

### Cloudflare, c'est qui ?

**Cloudflare** est l'une des plus grandes entreprises d'infrastructure internet au monde.
Leur réseau protège et accélère environ **20% de tout le trafic internet mondial**.
Leurs clients incluent Discord, Canva, Shopify, DoorDash, et des milliers d'autres.

Ce n'est pas une startup — c'est une entreprise cotée en bourse, fondée en 2009,
avec des datacenters dans plus de 300 villes dans le monde.

### R2, c'est quoi exactement ?

**R2** est le service de **stockage de fichiers** de Cloudflare. Il permet de stocker
n'importe quel type de fichier (PDF, images, vidéos...) sur leurs serveurs,
de manière privée et sécurisée.

```
Analogie simple :
  R2 = un disque dur dans le cloud
       → tu y mets tes fichiers
       → tu les récupères quand tu veux
       → personne d'autre ne peut y accéder sans ta permission
```

### La différence clé avec les autres : zéro frais de sortie

Quand un étudiant télécharge son diplôme depuis ton application, les données
"sortent" du serveur de stockage vers l'internet. La plupart des services
(AWS S3, Google Cloud Storage...) facturent ces **"frais de sortie"** (egress fees).

```
AWS S3     → frais de sortie : ~0.09 $/GB
             = tu paies chaque fois qu'un étudiant télécharge son diplôme

Cloudflare R2 → frais de sortie : 0 $
                = accès illimité, jamais de frais de téléchargement
```

---

## 2. Comment ça fonctionne dans INUBIL Verify ?

### Le cycle de vie d'un PDF de diplôme

```
1. Admin uploade le PDF du diplôme via l'interface
            ↓
2. NestJS reçoit le fichier en mémoire (Buffer)
            ↓
3. StorageService envoie le fichier vers Cloudflare R2
   (clé S3 : universites/{id}/diplomes/{année}/{numero}.pdf)
            ↓
4. R2 stocke le fichier en privé — personne ne peut y accéder directement
            ↓
5. NestJS enregistre la clé S3 en base de données (colonne pdf_url)
            ↓
6. Quand l'admin veut voir le PDF :
   NestJS génère une URL présignée valable 15 minutes
            ↓
7. L'URL présignée permet à l'admin de télécharger le PDF
   directement depuis R2 (sans passer par NestJS)
            ↓
8. Après 15 minutes, l'URL expire automatiquement
```

### Pourquoi stocker en privé ?

Les diplômes sont des **documents sensibles** (RGPD). Si on les stockait publiquement,
n'importe qui sur internet pourrait y accéder en devinant l'URL. Le stockage privé
avec URLs présignées garantit que seul l'admin autorisé peut voir le PDF.

### La structure des clés dans R2

Les fichiers sont organisés comme des dossiers dans R2 :

```
bucket : inubil-diplomes
│
├── universites/
│   ├── {uuid-universite-A}/
│   │   ├── diplomes/
│   │   │   ├── 2024/
│   │   │   │   ├── INUB-2024-0001.pdf
│   │   │   │   └── INUB-2024-0002.pdf
│   │   │   └── 2025/
│   │   │       └── INUB-2025-0001.pdf
│   │   └── qrcodes/
│   │       └── 2024/
│   │           ├── INUB-2024-0001-qr.png
│   │           └── INUB-2024-0002-qr.png
│   └── {uuid-universite-B}/
│       └── ...
```

Cette structure permet de savoir immédiatement quel fichier appartient
à quelle université et quelle année — sans lire la base de données.

---

## 3. Pourquoi R2 pour la phase de développement ?

### Comparaison complète

| Critère | AWS S3 | Cloudflare R2 |
|---|---|---|
| Stockage gratuit | 5 GB (12 mois seulement) | **10 GB/mois (permanent)** |
| Frais de sortie | ~0.09 $/GB | **0 $** |
| Durée du plan gratuit | 12 mois puis payant | **Illimité** |
| Inscription au Cameroun | Difficile (carte + vérification) | **Plus simple** |
| Compatibilité API | Standard S3 | **Identique à S3** |
| Fiabilité | ✅ | ✅ |
| Temps de latence Afrique | Moyen | **Bon (réseau mondial)** |

### Argument pour la soutenance

> *"Pour la phase de développement et de démonstration, nous avons opté pour
> Cloudflare R2 pour trois raisons principales :*
>
> *Premièrement, son plan gratuit permanent de 10 GB mensuels sans frais de sortie
> est parfaitement adapté à une phase de test — contrairement à AWS S3 dont
> le plan gratuit expire après 12 mois.*
>
> *Deuxièmement, R2 utilise exactement la même API que AWS S3 (protocole S3 standard),
> ce qui signifie que notre code NestJS est identique dans les deux cas.
> La migration vers AWS S3 en production ne nécessite que de changer
> trois variables d'environnement — sans toucher au code.*
>
> *Troisièmement, Cloudflare dispose d'un réseau de 300+ datacenters mondiaux
> incluant l'Afrique, ce qui garantit de bonnes performances pour nos utilisateurs
> camerounais."*

---

## 4. Créer un compte Cloudflare

### Étape 1 — S'inscrire

1. Va sur **https://cloudflare.com**
2. Clique sur **"Sign Up"** (en haut à droite)
3. Entre ton email et crée un mot de passe
4. Clique **"Create Account"**

> Pas de carte bancaire requise pour créer le compte.

### Étape 2 — Vérifier ton email

Cloudflare envoie un email de confirmation. Clique le lien de vérification.

### Étape 3 — Activer R2

Quand tu te connectes pour la première fois au dashboard :

1. Dans le menu de gauche, cherche **"R2 Object Storage"**
2. La première fois, Cloudflare demande une carte bancaire pour activer R2

> ⚠️ **Pourquoi une carte ?**
> Cloudflare veut s'assurer que tu peux payer si tu dépasses les limites gratuites.
> Tu ne seras **jamais facturé** tant que tu restes sous 10 GB.
> Une carte virtuelle Payoneer fonctionne parfaitement ici.

---

## 5. Créer un bucket R2

Un **bucket** (seau) est le conteneur principal qui contient tous tes fichiers.
C'est comme un dossier racine dans R2.

### Étape par étape

1. Dans le dashboard Cloudflare, clique **"R2 Object Storage"**
2. Clique **"Create bucket"**
3. Dans le champ **"Bucket name"**, entre :
   ```
   inubil-diplomes
   ```
4. Pour **"Location"**, laisse sur **"Automatic"**
   (Cloudflare choisit le datacenter le plus proche de toi)
5. Clique **"Create bucket"**

### Paramètres importants à ne pas toucher

- **"Public access"** → doit rester **OFF** (désactivé)
  Les PDF de diplômes doivent être privés. Ne jamais activer l'accès public.

---

## 6. Créer un token API R2

Le **token API** (ou clé d'accès) permet à ton backend NestJS de communiquer
avec R2. C'est comme un mot de passe pour les programmes.

### Étape par étape

1. Dans le dashboard Cloudflare, clique **"R2 Object Storage"**
2. En haut à droite, clique **"Manage R2 API Tokens"**
3. Clique **"Create API Token"**
4. Remplis le formulaire :

   **Token name :**
   ```
   INUBIL-Backend-Token
   ```

   **Permissions :**
   Sélectionne **"Object Read & Write"**
   (permet d'uploader ET de lire les fichiers)

   **Specify bucket :**
   Sélectionne **"inubil-diplomes"**
   (limite ce token à ton bucket uniquement — bonne pratique de sécurité)

5. Clique **"Create API Token"**

### ⚠️ IMPORTANT — Copie ces valeurs immédiatement

Cloudflare affiche les clés **une seule fois**. Après avoir fermé cette page,
tu ne pourras plus voir le Secret Access Key.

```
Access Key ID     : exemple → a1b2c3d4e5f6g7h8i9j0...
Secret Access Key : exemple → abc123def456ghi789jkl...
```

Copie ces deux valeurs dans un endroit sûr (fichier local, gestionnaire de mots de passe).

---

## 7. Récupérer l'Account ID

L'**Account ID** identifie ton compte Cloudflare. Il est utilisé pour construire
l'URL de connexion à R2.

### Où le trouver

1. Dans le dashboard Cloudflare, regarde dans la **barre latérale droite**
   (ou va dans **"My Profile"** → **"Account ID"**)
2. L'Account ID ressemble à :
   ```
   a1b2c3d4e5f6789012345678901234ab
   ```

C'est une chaîne de 32 caractères hexadécimaux.

### À quoi il sert

L'URL de connexion à ton bucket R2 est construite comme ça :

```
https://{ACCOUNT_ID}.r2.cloudflarestorage.com
```

Exemple :
```
https://a1b2c3d4e5f6789012345678901234ab.r2.cloudflarestorage.com
```

Notre code NestJS utilise cet Account ID pour savoir où envoyer les fichiers.

---

## 8. Configurer le projet INUBIL Verify

### Valeurs à récupérer sur Cloudflare

À ce stade tu dois avoir ces 4 valeurs :

| Valeur | Où la trouver |
|---|---|
| Access Key ID | Page "Create API Token" (copié à l'étape 6) |
| Secret Access Key | Page "Create API Token" (copié à l'étape 6) |
| Account ID | Dashboard Cloudflare (étape 7) |
| Bucket name | `inubil-diplomes` (créé à l'étape 5) |

### Modifier le fichier `.env`

Ouvre le fichier `.env` à la racine du projet INUBIL-VERIFY et ajoute/modifie :

```env
# ─── Stockage Cloudflare R2 (phase de développement) ──────────
AWS_ACCESS_KEY_ID=<ton Access Key ID>
AWS_SECRET_ACCESS_KEY=<ton Secret Access Key>
AWS_REGION=auto
AWS_S3_BUCKET=inubil-diplomes
CLOUDFLARE_ACCOUNT_ID=<ton Account ID>
```

### Redémarrer le backend

```bash
docker compose up -d backend
```

### Vérifier dans les logs

```bash
docker compose logs backend | grep -i storage
```

Tu dois voir :
```
[StorageService] Stockage Cloudflare R2 configuré — bucket : inubil-diplomes
```

Si tu vois :
```
[StorageService] Stockage désactivé
```
→ Les variables `.env` ne sont pas chargées. Vérifie qu'elles sont bien renseignées.

---

## 9. Tester que le stockage fonctionne

### Test 1 — Valider un diplôme et vérifier l'upload

1. Connecte-toi sur Swagger : `http://localhost:3000/api`
2. Authentifie-toi avec `admin@inubil.com / Admin123!`
3. Crée un diplôme (`POST /documents`)
4. Uploade un PDF pour le valider (`POST /documents/{id}/valider`)
5. La réponse doit contenir :
   ```json
   {
     "pdf_url": "universites/{uuid}/diplomes/2026/INUB-2026-0001.pdf",
     "statut": "actif"
   }
   ```

### Test 2 — Vérifier le fichier dans R2

1. Va dans le dashboard Cloudflare → **R2** → **inubil-diplomes**
2. Tu vois le fichier dans la structure `universites/.../diplomes/2026/`

### Test 3 — Récupérer l'URL présignée

```bash
GET /documents/{id}/pdf
```

Réponse :
```json
{
  "url": "https://...r2.cloudflarestorage.com/inubil-diplomes/universites/.../INUB-2026-0001.pdf?X-Amz-Signature=...",
  "expires_in_seconds": 900
}
```

Cette URL fonctionne pendant 15 minutes puis expire automatiquement.

---

## 10. Plan gratuit — limites et coûts

### Ce que tu as gratuitement chaque mois

| Ressource | Limite gratuite |
|---|---|
| Stockage | **10 GB** |
| Opérations d'écriture (upload) | **1 million** |
| Opérations de lecture (téléchargement) | **10 millions** |
| Frais de sortie (egress) | **0 $ (toujours gratuit)** |

### Ça représente combien de diplômes ?

```
Un PDF de diplôme     ≈ 500 KB à 2 MB
Un QR code PNG        ≈ 50 KB

Pour 10 GB gratuits :
  → environ 5 000 à 20 000 diplômes stockés
  → largement suffisant pour la phase de développement et de démo
```

### Si tu dépasses les limites

```
Stockage au-delà de 10 GB  → 0.015 $/GB/mois
Opérations d'écriture      → 4.50 $ / million d'opérations
```

Pour une plateforme universitaire au Cameroun en démarrage,
ces limites ne seront probablement jamais atteintes avant plusieurs années.

---

## 11. Migration vers AWS S3 en production

Quand tu passes en production sur AWS S3, voici les seuls changements :

### Dans le fichier `.env`

```env
# Remplace les valeurs Cloudflare par les valeurs AWS

AWS_ACCESS_KEY_ID=<clé AWS>
AWS_SECRET_ACCESS_KEY=<secret AWS>
AWS_REGION=eu-west-1          ← région AWS (pas "auto")
AWS_S3_BUCKET=inubil-diplomes
CLOUDFLARE_ACCOUNT_ID=        ← laisser VIDE → bascule sur AWS S3
```

### Dans le code

**Aucun changement.** Le `StorageService` détecte automatiquement :
- `CLOUDFLARE_ACCOUNT_ID` renseigné → Cloudflare R2
- `CLOUDFLARE_ACCOUNT_ID` vide → AWS S3

C'est tout. Le reste du code est identique.

---

## Résumé — Ordre à suivre

```
1. Créer un compte Cloudflare       → cloudflare.com
2. Activer R2 (carte Payoneer)
3. Créer le bucket "inubil-diplomes"
4. Créer un API Token (Read & Write)
5. Copier : Access Key ID + Secret Access Key + Account ID
6. Modifier .env avec ces valeurs
7. docker compose up -d backend
8. Tester avec Swagger
9. ✅ Les PDF de diplômes sont stockés sur Cloudflare R2
```

---

## Liens utiles

| Ressource | URL |
|---|---|
| Cloudflare dashboard | https://dash.cloudflare.com |
| Documentation R2 | https://developers.cloudflare.com/r2 |
| Créer un token API R2 | https://developers.cloudflare.com/r2/api/s3/tokens |
| Tarifs R2 | https://developers.cloudflare.com/r2/pricing |
