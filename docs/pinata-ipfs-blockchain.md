# Pinata, IPFS et Blockchain - Guide complet pour INUBIL-VERIFY

> Document de référence technique et pédagogique sur le stockage décentralisé
> et son rôle dans la vérification de diplômes.

---

## Table des matières

1. [C'est quoi IPFS ?](#1-cest-quoi-ipfs-)
2. [C'est quoi le CID ?](#2-cest-quoi-le-cid-)
3. [C'est quoi Pinata ?](#3-cest-quoi-pinata-)
4. [Pinata vs AWS S3 - Pourquoi pas AWS ?](#4-pinata-vs-aws-s3--pourquoi-pas-aws-)
5. [Les concurrents de Pinata](#5-les-concurrents-de-pinata)
6. [Avantages et inconvénients de Pinata](#6-avantages-et-inconvénients-de-pinata)
7. [Le lien entre Pinata et la Blockchain](#7-le-lien-entre-pinata-et-la-blockchain)
8. [Comment tout ça s'articule dans INUBIL-VERIFY](#8-comment-tout-ça-sarticule-dans-inubil-verify)
9. [Conclusion - Pourquoi Pinata est le bon choix](#9-conclusion--pourquoi-pinata-est-le-bon-choix)

---

## 1. C'est quoi IPFS ?

### Origine et nom

IPFS (InterPlanetary File System) a été créé en **2013** par **Juan Benet**, fondateur de Protocol Labs. L'idée originale était de créer un système de fichiers distribué capable de fonctionner même dans l'espace, pour la communication entre planètes - d'où le nom ambitieux. Le whitepaper a été publié en juillet 2014 (arXiv:1407.3561). Protocol Labs a ensuite levé **205,8 millions de dollars** en 2017 pour développer l'écosystème.

### Le problème qu'IPFS résout

Sur internet classique (HTTP), les fichiers sont identifiés par **leur emplacement** :

```
https://monserveur.com/fichiers/diplome.pdf
         ↑
    adresse physique du serveur
```

Problème : si le serveur tombe, l'URL est morte. Et rien ne prouve que le fichier derrière cette URL est le même qu'hier - quelqu'un peut l'avoir remplacé sans que tu le saches.

IPFS résout ça en identifiant les fichiers **par leur contenu**, pas par leur emplacement. C'est ce qu'on appelle le **content addressing**.

### Comment IPFS fonctionne

Quand tu ajoutes un fichier sur IPFS :

1. Le fichier est découpé en blocs
2. Chaque bloc est haché cryptographiquement (SHA-256)
3. Les hashes forment un arbre de Merkle
4. Le hash de la racine de cet arbre devient l'**identifiant unique du fichier** - le CID

```
Fichier PDF
    ↓
Découpage en blocs
    ↓
Hash SHA-256 de chaque bloc
    ↓
Arbre de Merkle
    ↓
CID = Hash de la racine  →  "QmSvgzCMxaAt3NW8g4hnTyrDWup7..."
```

N'importe qui dans le monde avec un nœud IPFS peut héberger et partager ce fichier. Le réseau est **pair-à-pair**, comme BitTorrent.

### Le problème de la persistance sur IPFS

IPFS seul ne garantit PAS que ton fichier reste disponible. Si personne ne le "garde" (on appelle ça le **pinning**), il peut disparaître quand un nœud manque d'espace. C'est là qu'interviennent les services comme Pinata.

---

## 2. C'est quoi le CID ?

Le CID (Content Identifier) est **l'empreinte unique d'un fichier**, calculée à partir de son contenu.

### Propriétés fondamentales

| Propriété | Explication |
|-----------|-------------|
| **Déterministe** | Le même fichier produit toujours le même CID, partout dans le monde |
| **Tamper-proof** | Changer un seul caractère ou pixel dans le fichier → CID complètement différent |
| **Universel** | Valide sur n'importe quel service IPFS (Pinata, Filebase, nœud perso…) |
| **Self-describing** | Le CID contient l'algorithme de hash utilisé, pas besoin d'info externe |

### Structure technique d'un CID

```
CIDv0  →  QmSvgzCMxaAt3NW8g4hnTyrDWup7...   (commence par "Qm", 46 caractères)
CIDv1  →  bafybei...                          (commence par "b", base32)
```

Un CIDv1 est composé de :
```
[Multibase][Version CID][Multicodec][Multihash]
     b           1         dag-pb      sha2-256 + hash du fichier
```

### Ce que le CID garantit concrètement

> Si quelqu'un te donne le CID `QmSvgz...` et que tu ouvres ce CID sur IPFS, **tu as la certitude absolue** que le fichier que tu vois est exactement le même que celui qui a été uploadé. Il est mathématiquement impossible qu'il ait été modifié.

C'est la différence fondamentale avec une URL classique.

---

## 3. C'est quoi Pinata ?

### En une phrase

Pinata est un **service d'hébergement compatible IPFS** - il stocke tes fichiers sur ses serveurs et les publie sur le réseau IPFS, te retournant un CID.

### Histoire et chiffres

| Info | Détail |
|------|--------|
| Fondation | 2019 par Kyle Tautenhan et Matt Ober |
| Siège | États-Unis |
| Financement | 21,5 M$ (Série A, 2022) - Coinbase Ventures parmi les investisseurs |
| Revenus annuels | 8,8 M$ (2024) |
| Uploads IPFS | Plus de **40 millions par mois** |
| Clients actifs | ~600 entreprises |

### Architecture technique - Elastic IPFS

Pinata n'utilise pas un simple nœud IPFS classique. Ils ont développé leur propre technologie : **Elastic IPFS**, une implémentation cloud-native qui scale automatiquement.

| Aspect | IPFS classique | Elastic IPFS (Pinata) |
|--------|---------------|----------------------|
| Mise à l'échelle | Manuelle, limitée | Automatique, élastique |
| Distribution | Ensemble fixe de nœuds | Cloud-native dynamique |
| Tolérance aux pannes | Configuration manuelle | Intégrée au cloud |
| Gestion | Lourde | Entièrement gérée |

### Est-ce que les fichiers sont sur plusieurs serveurs ?

**Oui.** Pinata réplique tes fichiers sur plusieurs nœuds de leur infrastructure avec distribution géographique. Ce n'est pas un seul serveur. En cas de panne d'un datacenter, tes fichiers restent accessibles. OpenSea a obtenu **99,2% d'amélioration de fiabilité** en passant sur Pinata.

### Ce que Pinata n'est PAS

Pinata n'est **pas vraiment décentralisé**. Tes fichiers sont sur les serveurs de Pinata, une entreprise privée américaine. Si Pinata ferme, tes URLs `gateway.pinata.cloud/...` ne fonctionnent plus.

**Mais** - et c'est crucial - le **CID reste valide à vie**. Tu peux re-uploader le même PDF sur n'importe quel autre service IPFS et obtenir exactement le même CID. Tu n'es pas prisonnier de Pinata.

### Plans tarifaires (2026)

| Plan | Prix | Stockage | Bande passante | Gateways |
|------|------|----------|---------------|----------|
| **Free** | $0/mois | 1 GB | 10 GB | 1 |
| **Picnic** | $20/mois | 1 TB | 500 GB | 1 + CDN |
| **Fiesta** | $100/mois | 5 TB | 2,5 TB | 3 + CDN |
| **Enterprise** | Sur devis | Illimité | Illimité | Illimité |

### Clients notables qui utilisent Pinata

| Entreprise | Domaine | Résultat |
|------------|---------|---------|
| **OpenSea** | Plus grande marketplace NFT mondiale | 99,2% d'amélioration de fiabilité |
| **Yuga Labs** | Créateur des Bored Apes (NFT) | Infrastructure métadonnées |
| **Ledger** | Portefeuille hardware crypto | Stockage assets |
| **DraftKings** | Fantasy sports | NFTs et médias |
| **SoRare** | NFT football | Cartes de joueurs |
| **Foundation** | Plateforme NFT créateurs | Stockage œuvres |
| **Protocol Labs** | Créateur d'IPFS lui-même | Validation de l'approche |
| **Optimism / Base** | Réseaux L2 Ethereum | Data Availability |

---

## 4. Pinata vs AWS S3 - Pourquoi pas AWS ?

### Ce qu'AWS S3 ne peut PAS faire

#### 1. L'adressage par contenu (la différence fondamentale)

```
AWS S3 :
  URL = https://bucket.s3.amazonaws.com/diplome.pdf
        ↑
  Pointe vers un EMPLACEMENT
  Amazon peut remplacer le fichier → l'URL reste la même
  Impossible à détecter

Pinata/IPFS :
  CID = QmSvgzCMxaAt3NW8g4hnTyrDWup7...
        ↑
  EST le contenu (hash mathématique)
  Changer le fichier → CID différent
  Modification impossible à masquer
```

#### 2. La vérifiabilité côté blockchain

Quand un smart contract stocke un CID IPFS, il y a un **lien cryptographique direct** entre la blockchain et le fichier.

- On lit le CID depuis le smart contract (données blockchain immuables)
- On récupère le fichier via ce CID sur IPFS
- La correspondance prouve mathématiquement l'authenticité

Avec une URL S3 dans un smart contract : on ne peut pas prouver que le fichier actuel sur S3 est le même qu'au moment de l'enregistrement. La vérification est nulle et non avenue.

#### 3. La résistance à la censure

AWS est soumis aux lois américaines. Un gouvernement peut demander à Amazon de supprimer tes fichiers. Les fichiers IPFS répliqués sur plusieurs nœuds sont beaucoup plus difficiles à censurer.

### Ce qu'AWS S3 fait mieux

| Critère | AWS S3 | Pinata |
|---------|--------|--------|
| **Maturité** | Depuis 2006, SLA 99,99% garanti | Depuis 2019, SLA non publié officiellement |
| **Conformité** | HIPAA, SOC 2, ISO 27001, RGPD | Moins documentée |
| **Fonctionnalités** | Versioning, lifecycle, S3 Select… | API simple mais moins riche |
| **Latence brute** | Souvent plus rapide selon région | Bonne avec CDN |
| **Support entreprise** | Plans avec SLA contractuels | Limité hors Enterprise |
| **Écosystème** | 200+ services AWS intégrés | Écosystème plus étroit |

### Verdict pour INUBIL-VERIFY

Pour un système de **vérification de diplômes**, le critère décisif est l'**intégrité prouvable**. Une URL S3 ne peut pas être ancrée dans un smart contract comme preuve d'authenticité - techniquement, ça ne tient pas. Un CID IPFS, oui. Ce n'est pas une question de préférence, c'est une contrainte technique.

---

## 5. Les concurrents de Pinata

### Web3.Storage → Storacha

**Statut : en transition, instable**

Web3.Storage est déprécié depuis 2024 et a migré vers **Storacha** (storacha.network). Le projet est dans une phase de reconstruction communautaire. À éviter pour un projet de production.

### NFT.Storage

**Statut : en démantèlement - À NE PAS UTILISER**

- Arrêt des nouveaux uploads depuis le **30 juin 2024**
- NFT.Storage redirige lui-même ses utilisateurs vers **Pinata et Lighthouse**
- Les données existantes se dégradent progressivement

### Infura IPFS

**Statut : restreint, sur invitation**

Infura (dans l'écosystème ConsenSys/Ethereum) a limité l'accès à son service IPFS. Il faut contacter leur support, justifier son usage, et attendre approbation. Prix minimum : **$50/mois**. Inaccessible pour la majorité des projets.

### Filebase

**Statut : actif, alternative sérieuse**

Filebase se différencie avec une **redondance géographique native 3x** - chaque fichier est automatiquement répliqué sur 3 localisations géographiques distinctes. API compatible S3 (drop-in replacement).

| Plan | Stockage | Egress | Prix |
|------|----------|--------|------|
| Gratuit | 5 GB | Gratuite | $0 |
| Starter | Illimité | Gratuite | $20/mois |

L'**egress gratuite** est un avantage majeur sur AWS et Pinata.

### Storj

**Statut : actif, mais pas IPFS natif**

Réseau de stockage décentralisé (noeuds opérés par des particuliers). Compatible S3. Prix très bas ($0,004/GB/mois). Mais : **ne génère pas de CIDs IPFS**. Inadapté pour une intégration blockchain via CID. C'est une alternative à S3, pas à Pinata.

### Arweave

**Statut : actif, architecture différente**

Arweave n'est pas IPFS. C'est un protocole de stockage **permanent** avec un paiement unique (pas d'abonnement).

| Aspect | Pinata/IPFS | Arweave |
|--------|-------------|---------|
| Paiement | Abonnement mensuel | **Paiement unique, à vie** |
| Persistance | Dépend du service de pinning | Garantie permanente par le protocole |
| Token requis | Non | Oui (AR token) |
| Maturité intégration blockchain | Très bonne | Bonne mais moins répandue |

Arweave est intéressant conceptuellement pour les diplômes (permanence à vie), mais plus complexe à intégrer avec Ethereum/Solidity et plus coûteux à l'upload.

### Tableau comparatif global

| Service | Statut | Gratuit | IPFS natif | Redondance | Pour INUBIL |
|---------|--------|---------|-----------|-----------|------------|
| **Pinata** | Actif, leader | 1 GB | Oui | Multi-nœuds cloud | ✅ Recommandé |
| **Filebase** | Actif | 5 GB | Oui | **3x géographique** | ✅ Bonne alternative |
| **Storacha** | En transition | Incertain | Oui | Variable | ❌ Instable |
| **NFT.Storage** | Fermé | Non | Non | N/A | ❌ À éviter |
| **Infura IPFS** | Restreint | Non | Oui | Bonne | ❌ Inaccessible |
| **Storj** | Actif | Non | Non | 11 nines | ❌ Pas de CID |
| **Arweave** | Actif | Non | Non (blockweave) | Permanente | ⚠️ Complexe |

---

## 6. Avantages et inconvénients de Pinata

### Avantages

| Avantage | Détail |
|----------|--------|
| **CID IPFS natif** | Chaque fichier reçoit un CID universel, ancrable sur blockchain |
| **Plan gratuit généreux** | 1 GB / 10 GB bande passante - suffisant pour un MVP |
| **Elastic IPFS** | Infrastructure qui scale automatiquement, pas de gestion de nœuds |
| **Fiabilité prouvée** | OpenSea, Ledger, Yuga Labs en production - 40M uploads/mois |
| **API simple** | Upload en quelques lignes de code, bien documenté |
| **Gateway dédiée** | CDN intégré pour des téléchargements rapides |
| **Portabilité** | Si tu quittes Pinata, le même fichier sur un autre service IPFS donne le même CID |
| **Communauté** | Support actif, documentation riche, écosystème Web3 mature |

### Inconvénients

| Inconvénient | Détail |
|--------------|--------|
| **Centralisé** | Tes fichiers sont sur les serveurs de Pinata, pas vraiment décentralisés |
| **Entreprise américaine** | Soumise aux lois US, potentiellement à des injonctions judiciaires |
| **SLA non publié** | Pas de SLA contractuel garanti sur les plans publics |
| **Prix variable** | Modèle usage-based - si tes fichiers sont très consultés, la facture augmente |
| **Dépendance** | Si Pinata ferme, les URLs `gateway.pinata.cloud/...` tombent |
| **Pas vraiment décentralisé** | Le nom "IPFS" suggère la décentralisation, mais avec Pinata c'est centralisé |
| **Conformité limitée** | Moins de certifications (HIPAA, ISO 27001) qu'AWS pour les données sensibles |

### Comment mitiger les risques

1. **Toujours stocker le CID en base de données** - pas juste l'URL. Si Pinata tombe, le CID reste valide.
2. **Ancrer le CID sur blockchain** - preuve immuable indépendante de Pinata.
3. **Garder une copie locale du PDF** - le serveur INUBIL garde le fichier original.
4. **Prévoir une migration** - si Pinata devient trop cher, Filebase accepte les mêmes CIDs.

---

## 7. Le lien entre Pinata et la Blockchain

### Le problème que la blockchain résout

Sans blockchain, même avec Pinata + CID, un scénario de fraude reste possible :

```
Scénario frauduleux sans blockchain :
Un pirate accède à la base de données INUBIL
→ Il change le CID du diplôme de quelqu'un (ex: change la note)
→ Il uploade un nouveau PDF falsifié sur Pinata
→ Nouveau CID stocké en base
→ L'employeur vérifie → tout semble correct
→ Fraude indétectable
```

La blockchain résout ça en étant un **registre public immuable** où le CID est gravé à jamais.

### Les trois couches de sécurité dans INUBIL-VERIFY

```
┌─────────────────────────────────────────────────────────────┐
│  COUCHE 3 - BLOCKCHAIN                                      │
│  "Le CID QmSvgz... a été certifié par ISTAMA INUBIL        │
│   le 13/06/2026 à 18h00"                                   │
│   → Gravé à jamais, personne ne peut modifier ça           │
├─────────────────────────────────────────────────────────────┤
│  COUCHE 2 - BASE DE DONNÉES INUBIL                         │
│  Stocke : CID, etudiant_id, universite_id, hash_sha256...   │
│  → Modifiable par un admin ou un pirate (risque)            │
├─────────────────────────────────────────────────────────────┤
│  COUCHE 1 - PINATA / IPFS                                  │
│  Stocke le PDF du diplôme                                   │
│  → CID prouve que le fichier n'a pas été modifié            │
└─────────────────────────────────────────────────────────────┘
```

| Couche | Rôle | Ce qu'elle prouve |
|--------|------|-------------------|
| **Pinata/IPFS** | Héberge le PDF | Le fichier n'a pas été modifié |
| **Base de données** | Stocke toutes les infos | Infos du diplôme (modifiable) |
| **Blockchain** | Enregistre le CID | Personne n'a touché la base |

### Le flux technique complet (blockchain intégrée)

**Étape 1 - L'université valide le diplôme**
```
PDF généré
  → Hash SHA-256 calculé
  → Upload sur Pinata → CID retourné : "QmSvgz..."
  → CID stocké en base de données
  → Transaction envoyée au smart contract :
      enregistrerDiplome(etudiant_id, "QmSvgz...", timestamp)
  → transaction_hash gravé sur la blockchain
```

**Étape 2 - L'étudiant reçoit son diplôme papier**
```
Sur le diplôme imprimé :
  - Numéro unique : INUB-2026-0003
  - QR code → https://verify.inubil.com/d/INUB-2026-0003
```

**Étape 3 - Un employeur vérifie**
```
Scan du QR code
  → INUBIL retourne les infos + CID
  → Vérification blockchain : le CID correspond à la transaction ?
  → Ouverture du PDF via le CID IPFS
  → Les 3 éléments correspondent → diplôme authentique ✅
```

### Pourquoi ancrer le CID et pas l'URL S3

| Si on ancre une URL S3 | Si on ancre un CID IPFS |
|-----------------------|------------------------|
| L'URL peut pointer vers un fichier remplacé | Le CID EST le fichier - impossible de remplacer |
| Nécessite de faire confiance à Amazon | Vérifiabilité mathématique, zéro confiance requise |
| Censurable (Amazon peut supprimer) | Difficile à censurer si répliqué |
| Preuve nulle - Amazon peut avoir modifié | Preuve cryptographique absolue |

### Smart contract Solidity (exemple simplifié)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract InubilVerify {

    struct Diplome {
        string etudiant_id;
        string ipfs_cid;       // QmSvgz...
        string universite;
        uint256 date_emission; // timestamp Unix
        bool revoque;
    }

    mapping(string => Diplome) public diplomes;
    address public owner;

    event DiplomeEnregistre(string indexed numero_unique, string ipfs_cid);
    event DiplomeRevoque(string indexed numero_unique);

    constructor() { owner = msg.sender; }

    function enregistrerDiplome(
        string memory numero_unique,  // INUB-2026-0003
        string memory etudiant_id,
        string memory ipfs_cid,       // CID retourné par Pinata
        string memory universite
    ) public {
        diplomes[numero_unique] = Diplome({
            etudiant_id: etudiant_id,
            ipfs_cid: ipfs_cid,
            universite: universite,
            date_emission: block.timestamp,
            revoque: false
        });
        emit DiplomeEnregistre(numero_unique, ipfs_cid);
    }

    function verifierDiplome(string memory numero_unique)
        public view returns (string memory cid, bool valide) {
        Diplome memory d = diplomes[numero_unique];
        return (d.ipfs_cid, !d.revoque);
    }
}
```

### Projets réels qui utilisent IPFS + Blockchain

| Projet | Domaine | Comment |
|--------|---------|---------|
| **OpenSea** | NFT | Smart contract stocke le CID des métadonnées NFT sur Ethereum |
| **Yuga Labs (Bored Apes)** | NFT | CID IPFS des images ancré on-chain |
| **CredChain (2024)** | Diplômes académiques | DApp Ethereum + IPFS, architecture identique à INUBIL |
| **EBSI** | Diplômes européens | Infrastructure blockchain UE pour credentials et diplômes |
| **Optimism / Base** | L2 Ethereum | CID IPFS ancré sur Ethereum L1 pour la disponibilité des données |
| **Chainlink** | Oracles | Preuves de données sur IPFS, CID référencé on-chain |

---

## 8. Comment tout ça s'articule dans INUBIL-VERIFY

### Ce qui est implémenté aujourd'hui

```
POST /documents/:id/valider  (avec upload du PDF)
           ↓
1. Hash SHA-256 du PDF calculé         → hash_sha256 en base
2. PDF uploadé sur Pinata              → cid_ipfs + pdf_url en base
3. QR code généré et uploadé Pinata   → qr_code_url en base
4. Document statut → "actif"
```

### Ce qui reste à implémenter (blockchain)

```
Après l'étape 4 :
5. Transaction envoyée au smart contract
   enregistrerDiplome(numero_unique, cid_ipfs, universite_id)
         ↓
6. transaction_hash + bloc_numero + reseau → enregistrés en base
```

Les champs `transaction_hash`, `bloc_numero`, `adresse_contrat`, `reseau` dans ta réponse API sont prêts - ils attendent juste l'intégration blockchain.

### La chaîne de confiance complète

```
PDF diplôme
  │
  ├── hash_sha256 ────────────────► Preuve locale d'intégrité
  │
  ├── cid_ipfs (via Pinata) ──────► Preuve IPFS d'intégrité + accès public
  │
  └── transaction_hash ────────────► Preuve blockchain d'authenticité
       (ancre le cid_ipfs sur Ethereum/Polygon)
            │
            └── Immuable, public, vérifiable par n'importe qui dans le monde
```

---

## 9. Conclusion - Pourquoi Pinata est le bon choix

### Récapitulatif des raisons

1. **Seule option stable et accessible** - NFT.Storage est fermé, Web3.Storage en migration, Infura restreint.

2. **Plan gratuit suffisant pour démarrer** - 1 GB / 10 GB bande passante, largement assez pour un MVP avec des diplômes PDF.

3. **CID IPFS indispensable** - C'est le seul moyen de créer un lien cryptographique entre le document et la blockchain. AWS ne peut pas faire ça.

4. **Fiabilité prouvée à grande échelle** - OpenSea, Ledger, Protocol Labs lui-même. 40 millions d'uploads par mois.

5. **Portabilité totale** - Si Pinata ferme demain, tu prends tes PDFs, tu les uploades sur Filebase, tu obtiens exactement les mêmes CIDs. Rien ne change côté blockchain ni côté base de données.

6. **Elastic IPFS** - Infrastructure répliquée, pas un serveur unique. Haute disponibilité.

### Ce que Pinata est vraiment pour INUBIL-VERIFY

> Pinata est le **pont entre ton backend NestJS et le réseau IPFS**. Il stocke les PDFs de diplômes et retourne des CIDs. Ces CIDs sont la **preuve mathématique d'intégrité** de chaque diplôme, et seront ancrés sur la blockchain pour être immuables et vérifiables par n'importe qui dans le monde, sans avoir à faire confiance à INUBIL, à Pinata, ou à qui que ce soit.

---

*Document rédigé pour le projet INUBIL-VERIFY - Plateforme de certification de diplômes ISTAMA INUBIL, Cameroun.*
*Sources : Pinata Blog, IPFS Docs, arXiv:1407.3561, Crunchbase, CredChain (ICCCES 2024), EBSI.*
