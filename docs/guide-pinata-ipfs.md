# Guide : Obtenir les clés API Pinata (IPFS)

> Ce guide est destiné à un développeur qui n'a jamais utilisé Pinata ni IPFS.  
> Temps estimé : **10 minutes**.

---

## C'est quoi IPFS et Pinata ?

**IPFS** (InterPlanetary File System) est un réseau décentralisé de stockage de fichiers.  
Au lieu d'héberger un fichier sur un serveur central (comme AWS S3), le fichier est distribué sur des milliers de nœuds dans le monde. Chaque fichier est identifié par son **CID** (Content Identifier), un hash unique calculé à partir du contenu du fichier.

**Pinata** est un service qui simplifie l'utilisation d'IPFS : tu uploades un fichier via leur API, ils s'occupent de le "pinner" (le maintenir disponible) sur le réseau IPFS. Sans Pinata, les fichiers IPFS peuvent disparaître si personne ne les maintient.

Dans le projet INUBIL Verify, Pinata sert à stocker les PDFs de diplômes et les QR codes de vérification de façon permanente et décentralisée.

---

## Étape 1 — Créer un compte Pinata

1. Aller sur **https://app.pinata.cloud/register**

2. Remplir le formulaire d'inscription :
   - **Email** : ton adresse email
   - **Password** : un mot de passe fort

3. Cliquer sur **Sign Up**

4. Ouvrir ta boîte mail et cliquer sur le **lien de confirmation** reçu de Pinata

5. Tu es maintenant connecté au dashboard Pinata

> **Plan gratuit inclus automatiquement :**
>
> | Limite | Valeur |
> |---|---|
> | Stockage | 1 Go |
> | Bande passante | 10 Go/mois |
> | Fichiers max | 500 fichiers |
> | Prix | **Gratuit** |
>
> Suffisant pour tous les tests et la démo ISTAMA.

---

## Étape 2 — Naviguer vers la section API Keys

Une fois connecté au dashboard :

1. Dans le menu de gauche, chercher la section **Developers**
2. Cliquer sur **API Keys**

Ou accéder directement via : **https://app.pinata.cloud/developers/api-keys**

---

## Étape 3 — Créer une nouvelle clé API

1. Cliquer sur le bouton **"+ New Key"** (en haut à droite de la page)

2. Une fenêtre modale **"New Key"** s'ouvre

3. Dans cette fenêtre, configurer :

   **a. Nom de la clé (obligatoire)**
   - Dans le champ **"Key Name"**, taper : `inubil-verify-dev`

   **b. Permissions**
   - Deux options : **Admin** ou **Scoped**
   - Pour notre usage, sélectionner **Admin** (donne accès à tous les endpoints dont `pinFileToIPFS`)
   - Si tu préfères limiter les accès, sélectionner **Scoped** puis cocher uniquement :
     - `pinFileToIPFS`
     - `pinJSONToIPFS`

   **c. Max Uses (optionnel)**
   - Laisser vide (illimité) pour une clé de développement

4. Cliquer sur **"Create Key"**

---

## Étape 4 — Copier les clés immédiatement

> **ATTENTION** : Pinata affiche les clés **une seule fois**. Après fermeture de cette fenêtre, il sera impossible de les récupérer. Il faudra en créer de nouvelles.

Une popup affiche **3 valeurs** :

```
API Key        : a1b2c3d4e5f6...    ← environ 32 caractères
API Secret     : x9y8z7...          ← environ 64 caractères
JWT            : eyJhbGci...        ← non utilisé dans ce projet
```

**Actions à faire immédiatement :**

1. Cliquer sur **"Copy All"** pour copier les 3 valeurs
2. Les coller dans un fichier texte temporaire sur ton PC
3. Cliquer **"Got it!"** pour fermer la fenêtre

---

## Étape 5 — Remplir le `.env` du projet

Ouvrir le fichier **`INUBIL-VERIFY/.env`** et remplir les 3 variables IPFS :

```env
# ─── IPFS — Pinata ────────────────────────────────────────────────────────────
PINATA_API_KEY=<coller ta valeur "API Key" ici>
PINATA_SECRET_KEY=<coller ta valeur "API Secret" ici>
PINATA_GATEWAY=https://gateway.pinata.cloud
```

**Exemple concret (valeurs fictives) :**

```env
PINATA_API_KEY=a1b2c3d4e5f67890abcdef1234567890
PINATA_SECRET_KEY=abc123def456ghi789jkl012mno345pqr678stu901vwx234yz567890abcdef12
PINATA_GATEWAY=https://gateway.pinata.cloud
```

> **Ne jamais commiter le `.env`** — il est déjà dans `.gitignore`.

---

## Étape 6 — Redémarrer le backend

Après avoir modifié le `.env`, redémarrer le conteneur backend pour que les nouvelles variables soient prises en compte :

```bash
docker-compose restart backend
```

---

## Étape 7 — Vérifier que les clés sont reconnues

Dans les logs du backend (`docker-compose logs -f backend`), tu dois **ne plus voir** ce message :

```
WARN [IpfsService] PINATA_API_KEY / PINATA_SECRET_KEY non configurés — uploads IPFS désactivés
```

Si ce message a disparu, les clés sont correctement chargées.

---

## Étape 8 — Tester l'upload IPFS

1. Ouvrir Swagger : **http://localhost:3000/api/docs**
2. Se connecter et s'authentifier (Bearer token)
3. Aller sur **Documents → POST /documents/:id/valider**
4. Choisir un document en statut `brouillon` et uploader un PDF

La réponse doit contenir des valeurs renseignées pour :

```json
{
  "cid_ipfs": "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco",
  "pdf_url": "https://gateway.pinata.cloud/ipfs/QmXoy...",
  "qr_code_url": "https://gateway.pinata.cloud/ipfs/Qm..."
}
```

Si `cid_ipfs` est `null`, vérifier les logs du backend pour identifier l'erreur.

---

## Étape 9 — Vérifier les fichiers dans le dashboard Pinata

1. Retourner sur **https://app.pinata.cloud**
2. Cliquer sur **"Files"** dans le menu gauche
3. Tu dois voir 2 nouveaux fichiers uploadés :
   - `INUB-2026-XXXX.pdf`
   - `qr-INUB-2026-XXXX.png`

Tu peux cliquer sur un fichier pour l'ouvrir via le gateway public.

---

## Résumé des variables à renseigner

| Variable `.env` | Où la trouver | Exemple |
|---|---|---|
| `PINATA_API_KEY` | Dashboard Pinata → API Keys → "API Key" | `a1b2c3...` |
| `PINATA_SECRET_KEY` | Dashboard Pinata → API Keys → "API Secret" | `xyz789...` |
| `PINATA_GATEWAY` | Valeur fixe | `https://gateway.pinata.cloud` |

---

## En cas de problème

**"Invalid API key"** → Les clés sont mal copiées. Créer une nouvelle paire de clés dans le dashboard Pinata.

**"Rate limit exceeded"** → Plan gratuit dépassé. Vérifier la consommation dans le dashboard.

**`cid_ipfs` toujours `null` après restart** → Vérifier avec `docker-compose logs -f backend` si la ligne `WARN [IpfsService]` disparaît.

**Vérifier que les clés sont bien chargées** (sans révéler leur valeur) :
```bash
docker-compose exec backend printenv | grep PINATA
```
Doit afficher les 3 variables avec leurs valeurs.
