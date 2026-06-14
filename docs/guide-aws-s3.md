# Guide pratique AWS S3 - Stockage privé des diplômes INUBIL-VERIFY

> Guide pas-à-pas pour un développeur débutant sur AWS.
> Objectif : stocker des PDF de diplômes de façon privée et sécurisée.

---

## Table des matières

1. [Créer un compte AWS](#1-créer-un-compte-aws)
2. [Créer un bucket S3](#2-créer-un-bucket-s3)
3. [Créer les credentials IAM](#3-créer-les-credentials-iam)
4. [Choisir la bonne région](#4-choisir-la-bonne-région)
5. [Configurer le CORS](#5-configurer-le-cors)
6. [Configurer les alertes de coût](#6-configurer-les-alertes-de-coût)
7. [Tester que tout fonctionne](#7-tester-que-tout-fonctionne)
8. [Ajouter les variables dans le projet](#8-ajouter-les-variables-dans-le-projet)
9. [Prix et coûts réels](#9-prix-et-coûts-réels)

---

## 1. Créer un compte AWS

### URL
👉 **https://aws.amazon.com/free/**

Clique sur **"Create a Free Account"**.

### Ce qu'il faut préparer

| Information | Détail |
|-------------|--------|
| Adresse email | Ton email principal |
| Mot de passe | Minimum 8 caractères |
| Numéro de téléphone | Pour vérification par SMS |
| Carte bancaire | Visa ou Mastercard **obligatoire** même pour le free tier |

> **Sur la carte bancaire** : AWS fait un débit test de **$1 USD** qui est remboursé immédiatement. Ta carte ne sera débitée que si tu dépasses les limites gratuites.

### Plan à choisir lors de l'inscription

- **Support plan** → Choisir **"Basic Support (Free)"**
- **Account type** → **"Free account plan"** (donne $100 de crédits offerts + accès au Free Tier)

### Ce qui est inclus gratuitement pour S3 (12 premiers mois)

| Ressource | Quota mensuel gratuit |
|-----------|----------------------|
| Stockage | **5 GB** |
| Requêtes GET (téléchargement) | **20 000 / mois** |
| Requêtes PUT (upload) | **2 000 / mois** |
| Transfert de données sortant | **100 GB / mois** |

> Après 12 mois, S3 reste très bon marché - voir [Section 9](#9-prix-et-coûts-réels).

---

## 2. Créer un bucket S3

### Accéder à S3

1. Connecte-toi sur **https://console.aws.amazon.com**
2. Dans la barre de recherche en haut → tape **"S3"**
3. Clique sur le service **Amazon S3**
4. Menu gauche → **"General purpose buckets"**
5. Bouton **"Create bucket"**

### Paramètres à configurer

#### Nom du bucket
- Doit être **unique dans le monde entier** (parmi tous les clients AWS)
- Uniquement : lettres minuscules, chiffres, tirets `-`
- Pas de majuscules, pas d'underscores `_`, pas de points `.`
- Exemple pour ce projet : `inubil-diplomes-prod`

#### Région AWS
→ Voir [Section 4](#4-choisir-la-bonne-région) pour choisir la bonne région.

#### Object Ownership
- Laisser sur **"ACLs disabled (recommended)"**

#### Bloquer l'accès public - TRÈS IMPORTANT ⚠️

Vérifier que les **4 cases sont cochées** (elles le sont par défaut) :

- ✅ Block all public access
- ✅ Block public access granted through new ACLs
- ✅ Block public access granted through any ACLs
- ✅ Block public access granted through new bucket policies
- ✅ Block public access granted through any bucket policies

> Si une seule case est décochée, tes diplômes pourraient devenir accessibles publiquement.

#### Versioning (recommandé)
- Activer **"Enable"**
- Permet de récupérer une version antérieure si un fichier est écrasé par erreur

#### Chiffrement
- Laisser sur **"Server-side encryption with Amazon S3 managed keys (SSE-S3)"**
- Chiffre automatiquement tous les fichiers stockés - **gratuit**

#### Finaliser
- Cliquer **"Create bucket"** ✅

---

## 3. Créer les credentials IAM

### Pourquoi ne pas utiliser le compte root ?

Le compte root (l'email + mot de passe que tu as utilisé pour créer le compte AWS) a un accès total à **tout** ton compte AWS. Si ces identifiants sont volés, quelqu'un peut :
- Supprimer toutes tes données
- Créer des ressources très coûteuses
- Accéder à tous tes services

**Règle absolue : ne jamais utiliser le compte root dans ton application.**

On va créer un utilisateur IAM qui n'a accès qu'à **ton bucket S3 et rien d'autre**.

### Étape 1 - Créer un utilisateur IAM

1. Console AWS → recherche **"IAM"** → cliquer sur le service
2. Menu gauche → **"Users"**
3. Bouton **"Create user"**
4. **User name** : `inubil-s3-app`
5. ⚠️ **Ne pas cocher** "Provide user access to the AWS Management Console"
   (cet utilisateur est pour l'application, pas pour la console web)
6. Cliquer **"Next"**

### Étape 2 - Créer une politique IAM minimale

Sur la page "Set permissions" :
1. Choisir **"Attach policies directly"**
2. Cliquer **"Create policy"** (un nouvel onglet s'ouvre)
3. Choisir l'onglet **"JSON"**
4. Supprimer le contenu existant et coller ceci :

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "ListerFichiersBucket",
            "Effect": "Allow",
            "Action": ["s3:ListBucket"],
            "Resource": ["arn:aws:s3:::inubil-diplomes-prod"]
        },
        {
            "Sid": "ActionsSurFichiers",
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject"
            ],
            "Resource": ["arn:aws:s3:::inubil-diplomes-prod/*"]
        }
    ]
}
```

> Remplace `inubil-diplomes-prod` par le vrai nom de ton bucket.

**Ce que chaque permission autorise :**

| Permission | Action |
|-----------|--------|
| `s3:ListBucket` | Lister les fichiers du bucket |
| `s3:GetObject` | Télécharger/lire un fichier |
| `s3:PutObject` | Uploader un fichier |
| `s3:DeleteObject` | Supprimer un fichier (droit à l'oubli) |

Cette politique **n'autorise QUE ce bucket**. Rien d'autre sur ton compte AWS n'est accessible.

5. Cliquer **"Next"**
6. **Policy name** : `InubilS3DiplomesPolicy`
7. Cliquer **"Create policy"**

### Étape 3 - Associer la politique à l'utilisateur

1. Retourner sur l'onglet de création de l'utilisateur
2. Rafraîchir la liste des politiques
3. Rechercher **`InubilS3DiplomesPolicy`** → cocher
4. Cliquer **"Next"** → **"Create user"** ✅

### Étape 4 - Générer les Access Keys

1. IAM → Users → cliquer sur **`inubil-s3-app`**
2. Onglet **"Security credentials"**
3. Section "Access keys" → **"Create access key"**
4. Use case → choisir **"Application running outside AWS"**
5. Cliquer **"Next"** → **"Create access key"**

> ⚠️ **IMPORTANT** : La `Secret access key` ne sera **plus jamais affichée** après cette page. Copie-la immédiatement.

| Variable d'env | Valeur |
|----------------|--------|
| `AWS_ACCESS_KEY_ID` | Commence par `AKIA...` |
| `AWS_SECRET_ACCESS_KEY` | Chaîne de 40 caractères |

### Règles de sécurité absolues

- ✅ Stocker ces clés uniquement dans le fichier `.env`
- ✅ Vérifier que `.env` est dans `.gitignore`
- ❌ Ne jamais coller ces clés dans le code source
- ❌ Ne jamais commiter `.env` sur GitHub

---

## 4. Choisir la bonne région

| Région | Code | Distance depuis Cameroun | Latence estimée |
|--------|------|--------------------------|-----------------|
| **Africa (Cape Town)** | `af-south-1` | ~3 800 km | ~80-120 ms |
| Europe (Paris) | `eu-west-3` | ~5 200 km | ~120-150 ms |
| Europe (Ireland) | `eu-west-1` | ~5 500 km | ~130-160 ms |
| US East (N. Virginia) | `us-east-1` | ~8 500 km | ~180-220 ms |

### Recommandation

**`af-south-1` (Africa - Cape Town)** - seule région AWS sur le continent africain, meilleure latence pour les utilisateurs camerounais.

### Activer la région af-south-1

Elle n'est pas activée par défaut. Pour l'activer :
1. Console AWS → ton nom en haut à droite → **"Account"**
2. Section **"AWS Regions"**
3. Trouver **"Africa (Cape Town)"** → cliquer **"Enable"**
4. Attendre 5-10 minutes

> Si tu veux démarrer vite sans activer af-south-1, utilise **`eu-west-3`** (Paris) - bonne latence et region complète disponible immédiatement.

---

## 5. Configurer le CORS

### Quand le configurer ?

Le CORS est nécessaire **uniquement si ton frontend (navigateur)** appelle directement S3. Si seul ton backend NestJS communique avec S3, **tu n'en as pas besoin**.

Pour INUBIL-VERIFY : configure-le si les étudiants uploadent des fichiers directement depuis le navigateur.

### Étapes

1. S3 → cliquer sur ton bucket
2. Onglet **"Permissions"**
3. Section **"Cross-origin resource sharing (CORS)"** → **"Edit"**
4. Coller :

```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
        "AllowedOrigins": [
            "http://localhost:4200",
            "https://ton-domaine.com"
        ],
        "ExposeHeaders": ["ETag"],
        "MaxAgeSeconds": 3000
    }
]
```

5. Remplacer `https://ton-domaine.com` par l'URL réelle de ton frontend
6. **"Save changes"** ✅

---

## 6. Configurer les alertes de coût

### Créer une alerte à $5

Pour ne jamais avoir de surprise sur ta facture :

1. Console AWS → rechercher **"Billing and Cost Management"**
2. Menu gauche → **"Budgets"**
3. **"Create budget"**
4. Choisir **"Customize (advanced)"**
5. **Budget type** → **"Cost budget"** → **"Next"**
6. Remplir :
   - **Budget name** : `alerte-cout-5-dollars`
   - **Period** : `Monthly`
   - **Budget amount** : `5` (USD)
7. **"Add an alert threshold"** :
   - Seuil 1 : `80%` → alerte à $4 USD
   - **Email** : `belcodeur2005@gmail.com`
8. Ajouter un deuxième seuil à `100%` → alerte à $5 USD
9. **"Next"** → **"Next"** → **"Create budget"** ✅

### Activer les alertes Free Tier

1. **"Billing and Cost Management"**
2. Menu gauche → **"Billing Preferences"**
3. Activer **"AWS Free Tier alerts"** → entrer ton email ✅

---

## 7. Tester que tout fonctionne

### Test rapide via la console AWS

1. S3 → cliquer sur ton bucket
2. **"Upload"** → glisser un PDF de test
3. **"Upload"**
4. Le fichier apparaît dans la liste → statut **"Succeeded"** ✅
5. Cliquer sur le fichier → **"Object actions"** → **"Share with a presigned URL"**
6. Durée : 1 heure → copier l'URL → l'ouvrir dans le navigateur
7. Si le PDF s'affiche → tout fonctionne ✅

### Test via AWS CLI

**Installation sur Windows :**
```
winget install Amazon.AWSCLI
```

**Configuration :**
```bash
aws configure
# AWS Access Key ID: [coller ta clé]
# AWS Secret Access Key: [coller ta clé secrète]
# Default region name: af-south-1
# Default output format: json
```

**Commandes utiles :**
```bash
# Lister tes buckets
aws s3 ls

# Lister les fichiers du bucket
aws s3 ls s3://inubil-diplomes-prod/

# Uploader un fichier
aws s3 cp diplome-test.pdf s3://inubil-diplomes-prod/diplomes/diplome-test.pdf

# Générer un lien pré-signé valable 1 heure
aws s3 presign s3://inubil-diplomes-prod/diplomes/diplome-test.pdf --expires-in 3600

# Supprimer un fichier
aws s3 rm s3://inubil-diplomes-prod/diplomes/diplome-test.pdf
```

---

## 8. Ajouter les variables dans le projet

Dans ton fichier `.env` à la racine du projet `INUBIL-VERIFY` :

```env
# AWS S3 - stockage privé des PDF de diplômes
AWS_ACCESS_KEY_ID=AKIAxxxxxxxxxxxxxxxxxxx
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AWS_REGION=af-south-1
AWS_S3_BUCKET=inubil-diplomes-prod
```

Puis recréer le container Docker pour charger les nouvelles variables :

```bash
docker compose up -d backend
```

### Vérification dans Swagger

1. `POST /auth/login` → récupère le token
2. `POST /documents` → crée un brouillon
3. `POST /documents/:id/valider` → upload un PDF
   - Vérifier que `pdf_url` contient une clé S3 comme `diplomes/INUB-2026-xxxx.pdf`
4. `GET /documents/:id/pdf` → vérifie que tu reçois un lien pré-signé AWS temporaire

---

## 9. Prix et coûts réels

### Tarifs S3 Standard (2025/2026)

| Composante | Prix |
|-----------|------|
| Stockage (premiers 50 TB/mois) | **$0.023 / GB / mois** |
| Upload (requêtes PUT) | **$0.005 / 1 000 requêtes** |
| Téléchargement (requêtes GET) | **$0.0004 / 1 000 requêtes** |
| Suppression (DELETE) | **Gratuit** |
| Transfert entrant (upload) | **Gratuit** |
| Transfert sortant - premiers 100 GB | **Gratuit** |
| Transfert sortant - au-delà | $0.09 / GB |

> Pour la région `af-south-1`, le stockage est légèrement plus cher : ~$0.026 / GB / mois.
> Vérifier les tarifs exacts sur https://aws.amazon.com/s3/pricing/

### Simulation de coût pour INUBIL-VERIFY

**1 000 diplômes PDF (200 Ko chacun) :**

| Poste | Calcul | Coût/mois |
|-------|--------|-----------|
| Stockage (195 MB) | 0.195 GB × $0.023 | $0.004 |
| 500 téléchargements | 0.5 × $0.0004 | $0.0002 |
| Transfert sortant (100 MB) | < 100 GB gratuit | $0.00 |
| **Total** | | **< $0.01 / mois** |

**10 000 diplômes PDF :**

| Poste | Calcul | Coût/mois |
|-------|--------|-----------|
| Stockage (1.9 GB) | 1.9 × $0.023 | $0.044 |
| 5 000 téléchargements | 5 × $0.0004 | $0.002 |
| **Total** | | **~$0.05 / mois** |

### Conclusion

Pour un projet de diplômes à l'échelle du Cameroun :
- **Première année** : **$0** (Free Tier 5 GB)
- **Après 12 mois** : **moins de $1/mois** même à 10 000 diplômes

---

## Liens utiles

| Ressource | URL |
|-----------|-----|
| Créer un compte | https://aws.amazon.com/free/ |
| Console AWS | https://console.aws.amazon.com |
| Console S3 | https://console.aws.amazon.com/s3/ |
| Console IAM | https://console.aws.amazon.com/iam/ |
| Budgets (alertes coût) | https://console.aws.amazon.com/billing/home#/budgets |
| Tarifs S3 officiels | https://aws.amazon.com/s3/pricing/ |
| Calculateur de coûts | https://calculator.aws/ |
| Documentation CORS S3 | https://docs.aws.amazon.com/AmazonS3/latest/userguide/cors.html |

---

*Document rédigé pour le projet INUBIL-VERIFY - Plateforme de certification de diplômes ISTAMA INUBIL, Cameroun.*
