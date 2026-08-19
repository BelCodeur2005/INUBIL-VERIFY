# Base de données INUBIL-VERIFY — Guide des tables

Ce document explique à quoi sert chaque table de la base de données, pourquoi elle existe,
et dans quels cas concrèts elle est utilisée.

---

## Vue d'ensemble

La base compte **24 tables** organisées en 6 domaines :

| Domaine | Tables |
|---------|--------|
| Identité & Accès | `utilisateurs`, `roles`, `permissions`, `role_permissions`, `sessions` |
| Universités | `universites`, `partenariats_universite` |
| Étudiants & Documents | `etudiants`, `documents`, `types_document`, `mentions_document`, `matieres_document` |
| Blockchain & Vérification | `transactions_blockchain`, `verifications` |
| Partage & Intégrations | `partages_document`, `invitations`, `webhooks`, `webhook_livraisons`, `cles_api` |
| Opérations & Logs | `journal_audit`, `notifications`, `emails_log`, `tentatives_connexion`, `configurations` |

---

## Domaine 1 — Identité & Accès

### `utilisateurs`

**Ce que c'est :** Le compte de connexion de toute personne qui se connecte à la plateforme.
Un utilisateur peut être un directeur d'université, un agent administratif, ou un super admin INUBIL.

**Champs clés :**
- `email` + `mot_de_passe` — identifiants de connexion (mot de passe bcrypt)
- `role_id` — détermine ce que l'utilisateur peut faire
- `universite_id` — l'université à laquelle il appartient (null pour les super admins)
- `statut` — `en_attente_email` → `actif` → `suspendu`
- `tentatives_connexion` / `bloque_jusqu` — protection anti-brute-force
- `token_reset_password` — token de réinitialisation de mot de passe (expire après 1h)

**Utilisé quand :** Un directeur se connecte, un agent saisit un diplôme, un admin INUBIL
gère les universités.

**Note :** Les étudiants ont leur propre table (`etudiants`). Ils n'ont pas de compte
`utilisateurs` par défaut — sauf s'ils s'inscrivent pour accéder à leur espace personnel.

---

### `roles`

**Ce que c'est :** Un rôle définit un profil de permissions. Exemples : `super_admin`,
`directeur`, `agent_saisie`.

**Champs clés :**
- `nom` + `universite_id` — un rôle est soit global (INUBIL, `universite_id = null`) soit
  propre à une université (chaque université peut créer ses propres rôles)
- `est_systeme` — si `true`, le rôle ne peut pas être supprimé (ex: `super_admin`)

**Utilisé quand :** On assigne un rôle à un utilisateur lors de son invitation.
Un directeur d'ISTAMA ne peut pas accéder aux données d'une autre université.

---

### `permissions`

**Ce que c'est :** Une permission atomique au format `module:action`.
Exemples : `doc:validate`, `univ:approve`, `audit:read`.

**Champs clés :**
- `nom` — la permission elle-même (ex: `doc:validate`)
- `module` — le groupe (ex: `documents`, `universites`)

**Utilisé quand :** Le `PermissionsGuard` vérifie à chaque requête si l'utilisateur
connecté possède la permission requise par l'endpoint.

---

### `role_permissions`

**Ce que c'est :** La table de jonction entre `roles` et `permissions`.
Un rôle peut avoir plusieurs permissions, une permission peut appartenir à plusieurs rôles.

**Utilisé quand :** On assigne des permissions à un rôle via `POST /roles/:id/permissions`.
Le seed peuple cette table automatiquement pour `super_admin`.

---

### `sessions`

**Ce que c'est :** Chaque connexion réussie crée une session. Le JWT access token est
éphémère (15min), mais la session en base permet de révoquer l'accès immédiatement sans
attendre l'expiration du JWT.

**Champs clés :**
- `token_hash` — hash SHA-256 du refresh token (jamais le token en clair)
- `expires_at` — durée de vie de la session (ex: 7 jours)
- `revoquee` — mise à `true` lors du logout pour invalider la session

**Utilisé quand :** Logout, déconnexion forcée par un admin, ou expiration de session.

---

## Domaine 2 — Universités

### `universites`

**Ce que c'est :** Chaque établissement qui utilise la plateforme est une université.
Les universités doivent d'abord être approuvées par INUBIL avant de pouvoir émettre des diplômes.

**Cycle de vie :**
```
en_attente → approuvee → active
                      ↘ rejetee
               active → suspendue
```

**Champs clés :**
- `statut` — contrôle si l'université peut opérer
- `approuvee_par` + `approuvee_le` — traçabilité de qui a approuvé
- `config` (JSON) — paramètres spécifiques à l'université (modèle de numérotation, etc.)

**Utilisé quand :** Une nouvelle école s'inscrit et demande l'accès à la plateforme.
L'admin INUBIL valide ou rejette sa demande.

---

### `partenariats_universite`

**Ce que c'est :** Un lien formel entre deux universités sur la plateforme.
Permet de documenter des accords inter-établissements (reconnaissance mutuelle de diplômes,
double-diplôme, programme d'échange, etc.).

**Pourquoi c'est utile même avec la blockchain :**
La blockchain prouve qu'un diplôme *existe et est authentique*. La table `partenariats_universite`
documente *qui reconnaît quoi* — une université de Yaoundé peut dire officiellement qu'elle
reconnaît les diplômes d'ISTAMA INUBIL, et cette reconnaissance est enregistrée et auditable.

**Exemple concret :** L'Université de Yaoundé signe un accord de reconnaissance avec ISTAMA INUBIL.
Quand un ancien étudiant d'ISTAMA postule à Yaoundé, le jury peut voir que Yaoundé a un
partenariat actif avec ISTAMA → la confiance dans le diplôme vérifié on-chain est renforcée
par ce contexte institutionnel.

**Champs clés :**
- `universite_id` + `universite_liee_id` — les deux parties
- `type_partenariat` — `reconnaissance`, `double_diplome`, `echange`, `cotutelle`
- `statut` — `actif` / `suspendu` / `termine`
- `document_url` — lien vers l'accord signé (stocké sur R2)

---

## Domaine 3 — Étudiants & Documents

### `etudiants`

**Ce que c'est :** Le dossier académique d'un étudiant, indépendamment de s'il a un compte
sur la plateforme. Un étudiant peut avoir des diplômes émis en son nom sans jamais se connecter.

**Champs clés :**
- `numero_etudiant` — identifiant unique au sein de l'université (ex: `ISTAMA-2023-0001`)
- `utilisateur_id` — lien vers un compte utilisateur si l'étudiant s'est inscrit (optionnel)
- `universite_id` — l'université qui a créé ce dossier

**Utilisé quand :** Un agent saisit un nouveau diplôme et sélectionne (ou crée) l'étudiant
bénéficiaire.

---

### `documents`

**C'est la table centrale de toute la plateforme.** Un document représente un diplôme,
un relevé de notes, ou une attestation, avec tout son cycle de vie.

**Cycle de vie :**
```
brouillon → en_validation → actif (ancré sur blockchain)
          ↘ rejete (renvoyé à l'agent pour correction)
actif → revoque (diplôme retiré)
actif → expire (date de validité dépassée)
```

**Champs clés blockchain :**
- `hash_sha256` — empreinte du PDF (ce hash est ancré on-chain, pas le fichier lui-même)
- `transaction_hash` — identifiant de la transaction Polygon
- `adresse_contrat` — adresse du smart contract
- `reseau` — `polygon_amoy` (testnet) ou `polygon_mainnet`

**Champs stockage :**
- `pdf_url` — chemin vers le PDF sur Cloudflare R2
- `qr_code_url` — QR code généré automatiquement à la validation

**Utilisé quand :**
1. Agent saisit les données → `brouillon`
2. Agent uploade le PDF → toujours `brouillon` (ou re-part de `rejete` à `brouillon`)
3. Directeur valide → PDF ancré sur blockchain → `actif`
4. Quiconque scanne le QR → vérification publique

---

### `types_document`

**Ce que c'est :** Un modèle de document. Définit les caractéristiques d'un type de diplôme
pour une université donnée.

**Exemples :** `Licence en Informatique (Bac+3)`, `Master en Gestion`, `Attestation de scolarité`

**Champs clés :**
- `categorie` — `diplome`, `releve`, `attestation`, `certificat`
- `niveau_bac_plus` — 3 pour une licence, 5 pour un master
- `a_matieres` — si `true`, les agents peuvent saisir le détail des matières
- `est_partage` — si `true`, partagé entre toutes les universités (types génériques)

**Utilisé quand :** L'université configure ses types de diplômes avant de commencer à saisir.

---

### `mentions_document`

**Ce que c'est :** Les mentions académiques utilisables dans les diplômes d'une université.
Chaque université définit sa propre grille.

**Exemples :** Très Bien (16-20), Bien (14-16), Assez Bien (12-14), Passable (10-12)

**Utilisé quand :** Un agent saisit un diplôme et choisit la mention obtenue par l'étudiant.

---

### `matieres_document`

**Ce que c'est :** Le détail des matières/cours pour un document donné.
Utilisé pour les relevés de notes détaillés.

**Champs clés :**
- `nom_matiere`, `code_matiere` — identification de la matière
- `note`, `note_max`, `credits`, `coefficient` — les résultats
- `resultat` — `valide`, `ajourne`, `absent`, `dispense`

**Utilisé quand :** Un relevé de notes nécessite le détail cours par cours.
Non utilisé pour une simple attestation de scolarité.

---

## Domaine 4 — Blockchain & Vérification

### `transactions_blockchain`

**Ce que c'est :** Le journal de toutes les transactions envoyées à la blockchain Polygon,
qu'elles aient réussi ou échoué.

**Champs clés :**
- `transaction_hash` — le hash Polygon (identique à celui dans `documents`)
- `type` — `ANCRAGE`, `REVOCATION`
- `statut` — `en_attente`, `confirme`, `echec`
- `gas_utilise`, `gas_prix` — coût de la transaction
- `bloc_numero` — le bloc Polygon qui contient la transaction

**Utilisé quand :**
- Validation d'un diplôme → une transaction `ANCRAGE` est créée
- Révocation d'un diplôme → une transaction `REVOCATION` est créée
- Le service blockchain poll la transaction jusqu'à confirmation

**Pourquoi séparer de `documents` :** Un document peut avoir plusieurs transactions
(ancrage initial + éventuelles révocations). Et on garde l'historique même si le document
est supprimé.

---

### `verifications`

**Ce que c'est :** Chaque fois qu'un tiers vérifie un diplôme (via le QR code ou l'API publique),
une entrée est créée. C'est le registre d'audience du diplôme.

**Champs clés :**
- `type_verification` — `qr_code`, `hash`, `url`, `api`
- `resultat` — `authentique`, `revoque`, `non_trouve`, `falsifie`
- `ip_address`, `pays`, `ville` — géolocalisation du vérificateur
- `organisation` — si le vérificateur s'est identifié (ex: "Recruteur RH BNP")

**Utilisé quand :** Un recruteur scanne le QR d'un diplôme soumis par un candidat.
L'université peut voir combien de fois son diplôme a été vérifié et par qui.

---

## Domaine 5 — Partage & Intégrations

### `partages_document`

**Ce que c'est :** Un lien de partage temporaire et contrôlé qu'un étudiant génère
pour partager son diplôme avec un tiers (recruteur, autre université).

**Champs clés :**
- `token_acces` — token unique de 64 caractères, non devinable
- `date_expiration` — le lien expire automatiquement
- `nb_consultations` — compteur de consultations
- `universite_destinataire_id` — si partagé avec une université sur la plateforme
- `email_destinataire_externe` — si partagé avec un email externe

**Différence avec la vérification publique :**
- Vérification publique (QR/URL) : ouverte à tous, pas d'expiration
- Partage : contrôlé par l'étudiant, peut expirer, peut être révoqué

**Utilisé quand :** L'étudiant veut envoyer son diplôme à un employeur avec une durée de
validité limitée (ex: lien valable 30 jours).

---

### `invitations`

**Ce que c'est :** Système d'invitation par email, utilisé pour deux cas :
1. Inviter un nouveau collaborateur (agent, directeur) à rejoindre l'université
2. Inviter un étudiant à créer son compte pour accéder à ses diplômes

**Champs clés :**
- `cible` — `etudiant` ou `collaborateur`
- `token` — token unique envoyé par email (expire après 48h)
- `statut` — `en_attente`, `acceptee`, `expiree`, `revoquee`
- `role_id` — le rôle qui sera assigné au collaborateur invité

**Utilisé quand :** Le directeur invite son agent de saisie à rejoindre la plateforme.
Il reçoit un email avec un lien qui lui permet de définir son mot de passe.

---

### `webhooks`

**Ce que c'est :** Un endpoint externe que l'université configure pour recevoir des
notifications en temps réel quand des événements se produisent sur la plateforme.

**Champs clés :**
- `url` — l'endpoint de l'université (ex: `https://erp.mon-universite.cm/webhook`)
- `evenements` (JSON) — liste des événements à écouter (ex: `["document.valide", "document.revoque"]`)
- `secret` — secret HMAC pour que l'université vérifie que c'est bien nous qui envoyons
- `statut` — `actif`, `inactif`, `en_erreur`

**Utilisé quand :** Le système ERP de l'université veut être notifié automatiquement quand
un diplôme est validé, sans avoir à interroger l'API toutes les 5 minutes.

**Sécurité :** Chaque requête webhook inclut un header `X-INUBIL-Signature: sha256=...`
calculé avec le secret HMAC. L'université vérifie ce header avant de traiter le payload.

---

### `webhook_livraisons`

**Ce que c'est :** Le journal de chaque tentative d'envoi de webhook.
Permet de voir si les notifications sont bien reçues et de diagnostiquer les échecs.

**Champs clés :**
- `statut_http` — code HTTP retourné par l'endpoint (200, 500, timeout...)
- `succes` — `true` si la livraison a réussi
- `duree_ms` — temps de réponse en millisecondes
- `reponse` — corps de la réponse (les 500 premiers caractères)

**Utilisé quand :** Un admin vérifie pourquoi les webhooks ne sont plus reçus depuis hier.
Il voit que l'endpoint répond 503 depuis 3h.

---

### `cles_api`

**Ce que c'est :** Des clés d'API programmatiques pour les intégrations automatisées.
Permettent à un système externe (ERP, script) d'appeler l'API sans passer par un compte
utilisateur avec login/mot de passe.

**Champs clés :**
- `cle_hachee` — seul le hash SHA-256 est stocké. La clé en clair (`inub_xxxxx_...`) est
  retournée **une seule fois** à la création, jamais stockée
- `prefix` — les 12 premiers caractères en clair (pour identifier la clé sans la dévoiler)
- `permissions` (JSON) — liste des permissions accordées à cette clé
- `ip_whitelist` (JSON) — liste d'IPs autorisées (vide = toutes)
- `expiration` — date d'expiration optionnelle

**Utilisé quand :** Le service informatique de l'université veut automatiser la saisie des
diplômes depuis leur système de gestion académique, sans créer de compte humain.

---

## Domaine 6 — Opérations & Logs

### `journal_audit`

**Ce que c'est :** Le registre immuable de toutes les actions sensibles effectuées sur la
plateforme. Chaque action importante crée une entrée.

**Champs clés :**
- `action` — ce qui s'est passé (ex: `DOCUMENT_VALIDER`, `UNIVERSITE_SUSPENDRE`)
- `module` — le domaine concerné
- `enregistrement_id` — l'ID de l'entité modifiée
- `donnees_avant` / `donnees_apres` — snapshot JSON avant et après la modification
- `ip_address`, `user_agent` — contexte de la requête

**Utilisé quand :** Audit de sécurité, investigation d'incident, conformité réglementaire.
Si quelqu'un supprime un diplôme par erreur, l'audit montre qui, quand, et depuis quelle IP.

**Note :** Ce journal est en lecture seule via l'API. Aucun endpoint ne permet de modifier
ou supprimer des entrées d'audit.

---

### `notifications`

**Ce que c'est :** Les notifications in-app affichées dans l'interface de l'utilisateur.
Générées automatiquement par le système en réponse aux événements.

**Exemples :**
- "Votre diplôme REF-2024-001 a été validé par le directeur"
- "L'université ISTAMA a été approuvée"
- "Nouveau collaborateur a rejoint votre équipe"

**Champs clés :**
- `type` — catégorie de notification (ex: `document.valide`, `invitation.acceptee`)
- `statut` — `non_lue`, `lue`, `archivee`
- `lue_le` — horodatage de la lecture
- `lien` — lien direct vers l'élément concerné dans l'interface

**Différence avec les webhooks :**
- Notifications : pour les humains, affichées dans l'interface web
- Webhooks : pour les systèmes, envoyés à des URLs externes

---

### `emails_log`

**Ce que c'est :** Le journal de tous les emails envoyés par la plateforme.
Chaque email transactionnel (vérification d'email, réinitialisation de mot de passe,
invitation) crée une entrée.

**Champs clés :**
- `template` — le template utilisé (ex: `verification-email`, `invitation-collaborateur`)
- `statut` — `en_attente`, `envoye`, `echoue`
- `tentatives` / `max_tentatives` — retry automatique en cas d'échec
- `message_id` — ID retourné par Resend (pour tracker l'email côté fournisseur)

**Utilisé quand :** L'utilisateur n'a pas reçu son email d'invitation. L'admin vérifie
dans `emails_log` si l'email a bien été envoyé ou s'il a échoué.

---

### `tentatives_connexion`

**Ce que c'est :** Chaque tentative de connexion (réussie ou non) est loggée.
Utilisé pour la protection anti-brute-force et la détection d'intrusion.

**Champs clés :**
- `email` — l'email utilisé dans la tentative
- `ip_address` — l'IP source
- `succes` — `true` si la connexion a réussi
- `raison_echec` — `mot_de_passe_incorrect`, `compte_bloque`, `email_non_verifie`

**Utilisé quand :**
- Après 5 échecs sur le même compte → compte bloqué 30 minutes
- Détection d'attaque : 100 tentatives depuis la même IP en 1 minute

---

### `configurations`

**Ce que c'est :** Un stockage clé-valeur pour les paramètres dynamiques de la plateforme.
Permet de modifier des comportements sans redéploiement.

**Exemples de clés :**
- `MAX_INVITATIONS_PAR_JOUR` → `"10"`
- `MAINTENANCE_MODE` → `"false"`
- `POLYGON_GAS_LIMIT` → `"300000"`

**Champs clés :**
- `cle` — le nom du paramètre (unique)
- `valeur` — toujours une string (même pour les nombres et booléens)
- `type` — `string`, `number`, `boolean`, `json` (pour savoir comment parser)
- `modifiable_par` — `super_admin` ou `admin_universite`

**Utilisé quand :** On veut activer le mode maintenance sans redéployer, ou ajuster
une limite sans modifier le code.

---

## Résumé des relations principales

```
universites
  ├── utilisateurs (M)        → les comptes des agents/directeurs
  ├── etudiants (M)           → les dossiers étudiants
  ├── roles (M)               → les rôles propres à cette université
  ├── types_document (M)      → les modèles de diplômes
  ├── mentions_document (M)   → la grille de mentions
  ├── webhooks (M)            → les intégrations
  ├── cles_api (M)            → les clés d'accès programmatique
  └── partenariats_universite (M) → les accords avec d'autres universités

etudiants
  └── documents (M)           → ses diplômes et attestations

documents
  ├── matieres_document (M)   → le détail des cours (si relevé)
  ├── transactions_blockchain (M) → l'historique blockchain
  ├── verifications (M)       → chaque scan du QR
  └── partages_document (M)   → les liens de partage

utilisateurs
  └── notifications (M)       → ses notifications in-app
```
