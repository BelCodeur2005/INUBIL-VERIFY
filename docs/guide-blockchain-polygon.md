# Guide complet — Blockchain, Polygon et INUBIL Verify

> Ce guide s'adresse à quelqu'un qui ne connaît rien à la blockchain.
> Il explique tout depuis le début : ce qu'est une blockchain, ce qu'est POL,
> pourquoi on a choisi Polygon, et comment tester le projet de A à Z.

---

## Table des matières

1. [C'est quoi une blockchain ?](#1-cest-quoi-une-blockchain-)
2. [C'est quoi une cryptomonnaie ?](#2-cest-quoi-une-cryptomonnaie-)
3. [C'est quoi Polygon et pourquoi pas Ethereum ?](#3-cest-quoi-polygon-et-pourquoi-pas-ethereum-)
4. [Les deux réseaux : Amoy (test) et Mainnet (production)](#4-les-deux-réseaux--amoy-test-et-mainnet-production)
5. [Créer un portefeuille avec MetaMask](#5-créer-un-portefeuille-avec-metamask)
6. [Exporter ta clé privée](#6-exporter-ta-clé-privée)
7. [Obtenir des POL de test (faucet)](#7-obtenir-des-pol-de-test-faucet)
8. [Configurer les fichiers .env du projet](#8-configurer-les-fichiers-env-du-projet)
9. [Déployer le contrat sur Polygon Amoy](#9-déployer-le-contrat-sur-polygon-amoy)
10. [Tester l'intégration dans le backend NestJS](#10-tester-lintégration-dans-le-backend-nestjs)
11. [Vérifier sur Polygonscan](#11-vérifier-sur-polygonscan)
12. [Passer en production (Polygon Mainnet)](#12-passer-en-production-polygon-mainnet)

---

## 1. C'est quoi une blockchain ?

### L'analogie du registre notarial

Imagine un **registre chez un notaire** : chaque acte signé est écrit dans un grand livre,
numéroté, daté, et impossible à modifier sans que tout le monde le remarque.

Une blockchain, c'est exactement ça — mais au lieu d'un seul notaire, il y en a
**des milliers dans le monde entier** qui possèdent tous une copie identique du registre.

```
Registre notarial classique :
  Un seul notaire → peut être corrompu, peut disparaître, peut mentir

Blockchain :
  Des milliers de nœuds (ordinateurs) dans le monde
  → Pour falsifier un enregistrement, il faudrait hacker 51% de tous ces nœuds
  → Pratiquement impossible
```

### Ce qui est gravé sur une blockchain

- **Ne peut pas être modifié** — une entrée écrite reste écrite pour toujours
- **Ne peut pas être supprimé** — pas d'effacement possible
- **Est visible par tout le monde** — n'importe qui peut lire le registre
- **Est horodaté précisément** — chaque entrée a une date/heure certifiée

### Dans INUBIL Verify, on grave quoi ?

Quand un diplôme est validé, on grave sur la blockchain :

```
Diplôme n° INUB-2024-0001
  → Empreinte SHA-256 du PDF : 0xa1b2c3...
  → UUID de l'université     : 3f4a1b2c-...
  → Date d'enregistrement    : 14 juin 2026, 10h00 UTC
  → Statut                   : actif
```

Après ça, **même INUBIL ne peut pas falsifier ce qui a été enregistré**.
N'importe qui peut vérifier que le diplôme est authentique
sans avoir besoin de faire confiance à INUBIL.

---

## 2. C'est quoi une cryptomonnaie ?

### Ce n'est pas juste de l'argent virtuel

Une cryptomonnaie (POL, ETH, BTC...) a plusieurs rôles :

**Rôle 1 — Payer les frais de transaction (le "gas")**

Quand tu écris quelque chose sur la blockchain, des milliers d'ordinateurs dans le monde
exécutent ton code et l'enregistrent. En échange de ce travail, tu leur paies des frais
en cryptomonnaie. On appelle ça le **gas**.

```
Enregistrer un diplôme sur Polygon = ~0.001 POL = ~0.001 $ (une fraction de centime)
Déployer le contrat une fois      = ~0.01  POL = ~0.01 $  (quelques centimes)
```

**Rôle 2 — Sécuriser le réseau**

Les ordinateurs qui maintiennent la blockchain sont récompensés en POL.
C'est ça qui les motive à rester honnêtes.

### Dans INUBIL Verify

Tu as besoin de POL **uniquement** pour :
- Déployer le contrat (une seule fois)
- Enregistrer un diplôme on-chain (une fois par diplôme validé)
- Révoquer un diplôme on-chain

La **vérification** d'un diplôme (`verifierDiplome`) est **gratuite** — pas de POL nécessaire.

---

## 3. C'est quoi Polygon et pourquoi pas Ethereum ?

### Ethereum — la blockchain originale

Ethereum est la blockchain la plus connue pour les smart contracts.
**Problème : c'est devenu très cher et lent.**

```
Ethereum aujourd'hui :
  Enregistrer un diplôme ≈ 5 à 50 $
  Attente de confirmation ≈ 15 secondes à plusieurs minutes
```

Pour une plateforme éducative en Afrique, c'est inutilisable.

### Polygon — Ethereum, mais rapide et pas cher

Polygon (anciennement Matic Network) est une **blockchain compatible Ethereum**
conçue pour être rapide et bon marché. Elle est utilisée par de grandes entreprises
(Nike, Starbucks, Reddit, Disney).

```
Polygon aujourd'hui :
  Enregistrer un diplôme ≈ 0.001 $ (une fraction de centime)
  Attente de confirmation ≈ 2 secondes
  Compatibilité          ≈ 100% compatible avec les outils Ethereum
```

### Pourquoi Polygon pour INUBIL Verify ?

| Critère | Ethereum | Polygon |
|---|---|---|
| Coût par transaction | 5 à 50 $ | < 0.001 $ |
| Vitesse | 15s à quelques min | ~2 secondes |
| Compatibilité outils | ✅ | ✅ (identique) |
| Adapté à l'Afrique | ❌ trop cher | ✅ |
| Maturité / fiabilité | ✅ | ✅ |

---

## 4. Les deux réseaux : Amoy (test) et Mainnet (production)

Polygon a deux réseaux distincts :

### Polygon Amoy — le testnet (réseau de test)

```
Nom           : Polygon Amoy
Chain ID      : 80002
RPC URL       : https://rpc-amoy.polygon.technology
Explorateur   : https://amoy.polygonscan.com
Monnaie       : POL de test (ne valent RIEN en vrai argent)
Coût          : GRATUIT — les POL s'obtiennent via un faucet
```

**C'est ici qu'on développe et qu'on teste.** Tout ce que tu fais ici
est réel techniquement (vrai réseau, vrais blocs, vrais transactions),
mais les MATIC n'ont aucune valeur réelle. Tu peux tout casser sans risque.

### Polygon Mainnet — la production

```
Nom           : Polygon Mainnet
Chain ID      : 137
RPC URL       : https://polygon-rpc.com
Explorateur   : https://polygonscan.com
Monnaie       : POL réel (a une valeur en dollars)
Coût          : Quelques centimes par transaction en vrai argent
```

**C'est ici qu'on déploie en production.** On n'y touche qu'une fois
que tout a été testé sur Amoy.

### Résumé simple

```
Amoy    = environnement de test   → comme ton environnement Docker local
Mainnet = environnement production → comme ton serveur de production
```

---

## 5. Créer un portefeuille avec MetaMask

Un **portefeuille** (wallet) blockchain, c'est l'équivalent d'un compte bancaire.
Il contient ton adresse publique et ta clé privée.

**MetaMask** est le portefeuille le plus utilisé — c'est une extension de navigateur.

### Étape 1 — Installer MetaMask

1. Va sur **https://metamask.io**
2. Clique sur **"Download"**
3. Installe l'extension pour Chrome, Firefox, ou Brave
4. Ouvre l'extension et clique **"Create a new wallet"**

### Étape 2 — Créer le portefeuille

1. Accepte les conditions
2. Crée un **mot de passe** (pour déverrouiller MetaMask sur cet appareil)
3. MetaMask génère une **phrase secrète de récupération** — 12 mots

> ⚠️ **CRITIQUE : note ces 12 mots et garde-les en sécurité.**
> Si tu perds ces mots, tu perds l'accès à ton portefeuille pour toujours.
> Ne les mets jamais en ligne, ne les envoie jamais par email ou WhatsApp.

4. Confirme les 12 mots dans l'ordre demandé
5. Ton portefeuille est créé

### Étape 3 — Ton adresse publique

Après la création, tu vois une adresse du type :
```
0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
```

**Cette adresse est publique** — tu peux la partager sans risque.
C'est l'équivalent d'un numéro de compte bancaire (IBAN).

### Étape 4 — Ajouter le réseau Polygon Amoy dans MetaMask

1. Dans MetaMask, clique sur le menu déroulant en haut (qui dit "Ethereum Mainnet")
2. Clique **"Add network"** → **"Add a network manually"**
3. Remplis ces champs :

```
Network name        : Polygon Amoy Testnet
New RPC URL         : https://rpc-amoy.polygon.technology
Chain ID            : 80002
Currency symbol     : POL
Block explorer URL  : https://amoy.polygonscan.com
```

4. Clique **"Save"**
5. Sélectionne **"Polygon Amoy Testnet"** dans le menu

---

## 6. Exporter ta clé privée

La **clé privée** c'est le code secret qui prouve que tu es le propriétaire du portefeuille.
C'est ce qu'on met dans `DEPLOYER_PRIVATE_KEY` dans le fichier `.env`.

> ⚠️ **NE PARTAGE JAMAIS TA CLÉ PRIVÉE.**
> Celui qui a ta clé privée contrôle tout ton portefeuille.

### Comment l'exporter depuis MetaMask

1. Ouvre MetaMask
2. Clique sur les **3 points** ⋮ à côté de ton nom de compte
3. Clique **"Account details"**
4. Clique **"Show private key"**
5. Entre ton mot de passe MetaMask
6. Maintiens le bouton **"Hold to reveal"**
7. Copie la clé (commence par `0x`, suivi de 64 caractères)

```
Exemple de clé privée :
0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

> ⚠️ **Pour INUBIL Verify, crée un compte MetaMask DÉDIÉ.**
> N'utilise pas ton compte personnel. Crée un nouveau compte spécialement
> pour le backend INUBIL — comme ça si la clé fuite un jour, seul ce compte
> est compromis, pas ton argent personnel.

### Créer un compte dédié dans MetaMask

1. Clique sur l'icône de ton compte (cercle coloré en haut à droite)
2. Clique **"Add account or hardware wallet"**
3. Clique **"Add a new account"**
4. Nomme-le `INUBIL Backend`
5. Exporte la clé privée de CE compte (pas de ton compte principal)

---

## 7. Obtenir des POL de test (faucet)

Un **faucet** (robinet) est un service qui distribue gratuitement des POL de test.

> **Note :** Le token s'appelait MATIC jusqu'en septembre 2024. Polygon l'a rebaptisé **POL**.
> Tu verras parfois encore "MATIC" sur certains vieux faucets — c'est le même token.

### Option 1 — Faucet officiel Polygon (recommandé)

1. Va sur **https://faucet.polygon.technology**
2. Sélectionne **"Polygon Amoy"**
3. Colle ton adresse MetaMask (`0xf39Fd6...`)
4. Clique **"Submit"**
5. Tu reçois du POL de test en 1 à 2 minutes

### Option 2 — Faucet Alchemy (si Polygon est en maintenance)

1. Va sur **https://www.alchemy.com/faucets/polygon-amoy**
2. Connecte-toi avec un compte Google (obligatoire)
3. Entre ton adresse MetaMask
4. Clique **"Send Me POL"**

### Option 3 — Faucet Chainlink

1. Va sur **https://faucets.chain.link/polygon-amoy**
2. Connecte MetaMask directement
3. Clique **"Request"** pour recevoir du POL de test

### Vérifier que tu as reçu les POL

1. Ouvre MetaMask sur le réseau **Polygon Amoy Testnet**
2. Tu devrais voir un solde > 0 POL

Ou va sur **https://amoy.polygonscan.com** et colle ton adresse dans la barre de recherche.

---

## 8. Configurer les fichiers .env du projet

Il y a deux fichiers `.env` à configurer :

### Fichier 1 — `blockchain/.env`

Ce fichier n'existe pas encore — crée-le en copiant le modèle :

```bash
cd blockchain
cp .env.example .env
```

Remplis-le avec tes vraies valeurs :

```env
# Clé privée du compte INUBIL Backend (celle que tu as exportée de MetaMask)
DEPLOYER_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# RPC URL Polygon Amoy (réseau de test)
AMOY_RPC_URL=https://rpc-amoy.polygon.technology

# RPC URL Polygon Mainnet (production — laisser vide pour l'instant)
POLYGON_RPC_URL=https://polygon-rpc.com

# Adresse du contrat (rempli APRÈS le déploiement — étape 9)
CONTRACT_ADDRESS=
```

### Fichier 2 — `.env` (racine du projet, celui du backend NestJS)

Ajoute ces lignes à ton `.env` existant :

```env
# ─── Blockchain Polygon ────────────────────────────────────────
POLYGON_RPC_URL=https://rpc-amoy.polygon.technology
DEPLOYER_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
CONTRACT_ADDRESS=     ← rempli après le déploiement (étape 9)
POLYGON_NETWORK=polygon_amoy
```

> ⚠️ **Vérifie que `.env` est bien dans `.gitignore`.**
> Ne committe jamais ce fichier avec ta vraie clé privée.

---

## 9. Déployer le contrat sur Polygon Amoy

### Pré-requis

- ✅ MetaMask installé avec un compte dédié INUBIL
- ✅ POL de test sur ce compte (au moins 0.1 POL)
- ✅ `blockchain/.env` rempli avec ta clé privée
- ✅ Le contrat compilé (`npm run compile` dans `blockchain/`)

### Lancer le déploiement

```bash
cd blockchain
npm run deploy:amoy
```

### Ce que tu vas voir dans le terminal

```
═══════════════════════════════════════════════════
  INUBIL Verify — Déploiement du contrat
═══════════════════════════════════════════════════
  Réseau        : amoy
  Déployeur     : 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
  Solde POL     : 0.5 POL
───────────────────────────────────────────────────
  Déploiement en cours...
───────────────────────────────────────────────────
  ✔  Contrat déployé !
  Adresse contrat : 0x5FbDB2315678afecb367f032d93F642f64180aa3
  Hash tx         : 0xf7b6cd7c8cf149c2...
───────────────────────────────────────────────────

  Ajoutez cette ligne dans votre .env backend :
  CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3

  ✔  Owner vérifié : 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
═══════════════════════════════════════════════════
```

### Après le déploiement

Copie l'adresse du contrat et mets-la dans les deux fichiers `.env` :

```env
# Dans blockchain/.env
CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3

# Dans .env (racine du projet)
CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
```

> ⚠️ **Cette adresse est permanente.** Une fois déployé, le contrat vit à
> cette adresse pour toujours sur Polygon Amoy. Tu n'as à déployer qu'une seule fois.

---

## 10. Tester l'intégration dans le backend NestJS

### Démarrer le backend avec les nouvelles variables

```bash
# Relancer Docker pour que les nouvelles variables .env soient prises en compte
docker compose up -d backend
```

### Test 1 — Vérifier que la connexion blockchain fonctionne

Dans les logs du backend, tu dois voir :

```
[BlockchainService] Blockchain connectée — contrat : 0x5FbDB2315678afecb367f032d93F642f64180aa3
```

Si tu vois le warning suivant, c'est que les variables ne sont pas chargées :
```
[BlockchainService] Blockchain non configurée (POLYGON_RPC_URL / DEPLOYER_PRIVATE_KEY / CONTRACT_ADDRESS manquants)
```

### Test 2 — Valider un diplôme et observer l'enregistrement blockchain

1. Via Swagger (`http://localhost:3000/api`) ou Postman :
2. Connecte-toi avec `admin@inubil.com / Admin123!`
3. Crée un diplôme (`POST /documents`)
4. Uploade un PDF pour le valider (`POST /documents/:id/valider`)
5. Attends **5 à 15 secondes** (temps de confirmation Polygon)
6. Consulte le diplôme (`GET /documents/:id`) — tu dois voir :

```json
{
  "id": "...",
  "numero_unique": "INUB-2026-0001",
  "statut": "actif",
  "transaction_hash": "0xf7b6cd7c8cf149c2...",
  "reseau": "polygon_amoy",
  "adresse_contrat": "0x5FbDB2315678afecb367f032d93F642f64180aa3"
}
```

### Test 3 — Vérifier publiquement un diplôme

```bash
GET /verify/INUB-2026-0001
```

La réponse doit inclure le champ `blockchain` :

```json
{
  "resultat": "authentique",
  "document": { ... },
  "blockchain": {
    "enregistre": true,
    "revoque": false,
    "transaction_hash": null,
    "date_enregistrement": "2026-06-14T10:00:00.000Z",
    "reseau": "polygon_amoy"
  }
}
```

---

## 11. Vérifier sur Polygonscan

**Polygonscan** est l'explorateur public de la blockchain Polygon —
c'est comme un moteur de recherche pour toutes les transactions Polygon.

### Voir les transactions de ton contrat

1. Va sur **https://amoy.polygonscan.com**
2. Dans la barre de recherche, colle l'adresse de ton contrat :
   `0x5FbDB2315678afecb367f032d93F642f64180aa3`
3. Tu vois toutes les transactions : déploiement, enregistrements, révocations

### Voir une transaction spécifique

Colle le `transaction_hash` d'un diplôme dans la barre de recherche.
Tu vois :
- La date et l'heure exacte
- Le compte qui a envoyé la transaction (ton backend)
- Les données enregistrées (le numéro du diplôme, le hash PDF)
- Les frais payés en POL

### Voir les événements émis

Sur la page du contrat → onglet **"Events"**.
Tu vois tous les `DiplomeEnregistre` et `DiplomeRevoque` dans l'ordre chronologique.

---

## 12. Passer en production (Polygon Mainnet)

> ⚠️ **Ne fais cette étape qu'une fois que tout est testé sur Amoy.**

### Étape 1 — Acheter des vrais POL

Tu as besoin d'environ **5 à 10 POL** pour commencer (couvre le déploiement + plusieurs centaines d'enregistrements).

Options pour acheter des POL au Cameroun :
- **Binance** (binance.com) — le plus accessible
- **Coinbase** (coinbase.com)
- Envoie les MATIC vers l'adresse de ton compte MetaMask INUBIL Backend

### Étape 2 — Configurer le .env pour le Mainnet

Dans `blockchain/.env` :
```env
POLYGON_RPC_URL=https://polygon-rpc.com
DEPLOYER_PRIVATE_KEY=0x...  (même clé que pour Amoy)
```

### Étape 3 — Déployer sur le Mainnet

```bash
cd blockchain
npm run deploy:polygon
```

### Étape 4 — Mettre à jour le .env du backend

```env
POLYGON_RPC_URL=https://polygon-rpc.com
CONTRACT_ADDRESS=0x...  (nouvelle adresse — celle du Mainnet)
POLYGON_NETWORK=polygon_mainnet
```

### Étape 5 — Vérifier sur Polygonscan Mainnet

Va sur **https://polygonscan.com** (sans "amoy.") et cherche ton contrat.

---

## Résumé — Ordre à suivre la première fois

```
1. Installer MetaMask                    → metamask.io
2. Créer un compte dédié "INUBIL Backend"
3. Exporter la clé privée de ce compte
4. Ajouter le réseau Polygon Amoy dans MetaMask
5. Obtenir des POL de test               → faucet.polygon.technology
6. Remplir blockchain/.env
7. cd blockchain && npm run compile      → compiler le contrat
8. cd blockchain && npm run test         → 22 tests doivent passer
9. cd blockchain && npm run deploy:amoy  → déployer sur Amoy
10. Copier CONTRACT_ADDRESS dans .env
11. docker compose up -d backend         → redémarrer le backend
12. Valider un diplôme via Swagger
13. Vérifier la transaction sur amoy.polygonscan.com
14. ✅ Tout fonctionne → déployer sur Mainnet quand tu es prêt
```

---

## Liens utiles

| Ressource | URL |
|---|---|
| MetaMask | https://metamask.io |
| Faucet officiel Polygon | https://faucet.polygon.technology |
| Faucet Alchemy | https://www.alchemy.com/faucets/polygon-amoy |
| Faucet Chainlink | https://faucets.chain.link/polygon-amoy |
| Explorateur Amoy (testnet) | https://amoy.polygonscan.com |
| Explorateur Polygon (production) | https://polygonscan.com |
| Documentation Polygon | https://docs.polygon.technology |
| RPC endpoints officiels | https://docs.polygon.technology/pos/reference/rpc-endpoints |
