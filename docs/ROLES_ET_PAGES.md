# Rôles, permissions et pages frontend — INUBIL Verify

> Document de référence : qui a le droit de faire quoi, et quelles pages le frontend doit exposer pour chaque rôle.
> Source de vérité des permissions : `backend/prisma/seed.ts` (constante `ROLES_METIER`) et `backend/src/auth/constants/permissions.constant.ts`.
> **Mono-université** : la plateforme sert un seul établissement (INUBIL). Les autres universités qui apparaissent dans les données (partenariats, universités partenaires françaises/camerounaises) sont des **vérificatrices**, pas des tenants qui émettent leurs propres diplômes sur la plateforme.

---

## 1. Les 7 rôles et leur hiérarchie

Seul `super_admin` est un rôle technique de plateforme. Les 6 autres sont les rôles métier réels d'INUBIL, seedés dans `ROLES_METIER`.

```
responsable_universite  (direction de l'établissement)
   └── a TOUT ce que directeur_pedagogique a
        └── directeur_pedagogique  (responsable pédagogique)
              └── a TOUT ce que agent_saisie a, + valider/rejeter/revoquer
                    └── agent_saisie  (saisie des diplômes au quotidien)
   └── PLUS : gestion du staff, clés API, webhooks, partenariats
       (que directeur_pedagogique et agent_saisie n'ont pas)

etudiant, autre_universite, employeur
   → comptes "hors hiérarchie académique", chacun cantonné à son propre espace
     (JWT seul, aucune permission RBAC — voir §3)
```

### Description de chaque rôle

| Rôle | Qui c'est | Rôle dans l'organisation |
|---|---|---|
| `super_admin` | Équipe technique INUBIL Verify | Administration complète de la plateforme, y compris les aspects techniques (rôles système, config globale) |
| `admin_istama` | Direction ISTAMA/INUBIL (niveau institution) | Supervision globale : universités, utilisateurs, rôles, stats, audit — sans les droits techniques bas niveau de `super_admin` |
| `responsable_universite` | Direction de l'établissement INUBIL | Gère le personnel, les intégrations techniques (clés API, webhooks, partenariats), et peut faire tout ce que `directeur_pedagogique` fait |
| `directeur_pedagogique` | Responsable pédagogique | Valide, rejette, révoque les diplômes — le "gardien" académique. Peut aussi saisir (cumule les droits d'`agent_saisie`) |
| `agent_saisie` | Personnel administratif (ex. Marie Ngo dans les maquettes) | Saisit les diplômes et les fiches étudiant au quotidien — **ne peut pas valider** |
| `etudiant` | Diplômé INUBIL | Consulte et partage ses propres diplômes |
| `autre_universite` / `employeur` | Vérificateur tiers avec compte optionnel | Vérifie des diplômes, garde un historique de ses vérifications |

---

## 2. Permissions par rôle (source : `seed.ts`)

### `super_admin`
Les 39 permissions du catalogue, sans exception.

### `admin_istama`
```
univ:read, univ:create, univ:edit, univ:approve, univ:activate, univ:suspend, univ:reject
user:read, user:edit, user:assign_role
role:read, role:create
stats:read, audit:read
doc:read
```
*Pas de `univ:delete`, ni de droits sur clés API/webhooks/partenariats — ce sont des outils opérationnels internes à l'établissement, pas à la supervision institutionnelle.*

### `responsable_universite`
```
user:read, user:edit, user:assign_role
doc:create, doc:validate, doc:revoke, doc:read
student:read
api:read, api:create, api:delete
webhook:read, webhook:create, webhook:edit, webhook:delete
partner:read, partner:create, partner:edit, partner:delete
stats:read
```

### `directeur_pedagogique`
```
doc:create, doc:validate, doc:revoke, doc:read
student:read
stats:read
```

### `agent_saisie`
```
doc:create, doc:read
student:read
```

### `etudiant`, `autre_universite`, `employeur`
Aucune permission RBAC. Accès via des endpoints protégés par JWT seul (`/etudiants/moi/*`, `/verifications/mes-verifications`, `/verify/*` public) — jamais par `@RequirePermissions`.

---

## 3. Pages frontend à créer, classées par niveau d'accès

37 pages au total (15 codées aujourd'hui côté `inubil-verify-front/`, en grande partie à refondre — voir note en fin de document).

### A. Public (aucun compte)

| # | Page | Endpoint(s) backend |
|---|---|---|
| 1 | Vérification par lien/QR | `GET /verify/:identifiant` |
| 2 | Vérification par hash | `POST /verify/hash` |
| 3 | Vérification par upload PDF | `POST /verify/upload` |
| 4 | Téléchargement rapport PDF | `GET /verify/:identifiant/rapport` |
| 5 | Document partagé (destinataire) | `GET /partages/:token` |

### B. Authentification (pré-connexion)

| # | Page | Endpoint(s) |
|---|---|---|
| 6 | Connexion | `POST /auth/login` |
| 7 | Inscription (comptes optionnels uniquement) | `POST /auth/register` |
| 8 | Vérification email | `POST /auth/verifier-email` (+ `/renvoyer`) |
| 9 | Mot de passe oublié | `POST /auth/forgot-password` |
| 10 | Réinitialisation mot de passe | `POST /auth/reset-password` |

### C. Communes (tout utilisateur connecté — JWT seul, aucune permission)

| # | Page | Endpoint(s) |
|---|---|---|
| 11 | Mon profil | `GET/PATCH /auth/me` |
| 12 | Changer mon mot de passe | `PATCH /auth/password` |
| 13 | Mes sessions actives | `GET /auth/sessions`, `DELETE /:id` |
| 14 | Mes notifications | `GET/PATCH /notifications` |
| 15 | Mon historique de vérifications | `GET /verifications/mes-verifications` |

### D. `agent_saisie` + `directeur_pedagogique` (pages partagées, actions visibles selon permission)

| # | Page | Endpoint(s) |
|---|---|---|
| 16 | Fiche étudiant (recherche + création inline) | `GET/POST/PATCH/DELETE /etudiants-admin` |
| 17 | **Émission de diplôme (stepper)** | `POST /documents` puis `POST /documents/:id/pdf` |
| 18 | Liste des documents | `GET /documents` |
| 19 | Détail d'un document | `GET /documents/:id`, `GET /documents/:id/pdf` |
| 20 | File de validation *(directeur_pedagogique uniquement)* | `POST /documents/:id/valider` / `/rejeter` |
| 21 | Révocation | `POST /documents/:id/revoquer` |
| 22 | Référentiels (types de documents, mentions) | `GET/POST/PATCH/DELETE /types-document`, `/mentions` |

### E. `responsable_universite` (superset de D + gestion établissement)

| # | Page | Endpoint(s) |
|---|---|---|
| 23 | Tableau de bord stats | `GET /admin/statistiques` |
| 24 | Gestion du staff | `GET/POST /invitations`, `PATCH /utilisateurs/:id/statut`, `PUT /:id/role` |
| 25 | Clés API | `GET/POST/PATCH/DELETE /cles-api` |
| 26 | Webhooks (+ livraisons, test) | `GET/POST/PATCH/DELETE /webhooks`, `/livraisons`, `/tester` |
| 27 | Partenariats inter-universités | `GET/POST/PATCH/DELETE /partenariats` |

### F. `admin_istama` / `super_admin`

| # | Page | Endpoint(s) |
|---|---|---|
| 28 | Dashboard admin global | `GET /admin/statistiques`, `/graphe` |
| 29 | Gestion des universités | `GET/POST/PATCH/DELETE /universites` + workflow approuver/activer/suspendre/rejeter |
| 30 | Gestion des utilisateurs (toutes universités) | `GET /admin/utilisateurs`, `/activer`, `/desactiver` |
| 31 | Gestion des rôles & permissions | `GET/POST/PATCH/DELETE /roles`, `PUT /:id/permissions`, `GET /permissions` |
| 32 | Journal d'audit global | `GET /admin/audit` |
| 33 | Paramètres système (6 clés) | `GET/PUT/DELETE /configurations` |
| 34 | Sauvegarde manuelle | `POST /backup` |

### G. `etudiant`

| # | Page | Endpoint(s) |
|---|---|---|
| 35 | Tableau de bord (stats persos) | `GET /etudiants/moi/statistiques` |
| 36 | Mes diplômes | `GET /etudiants/moi/documents` |
| 37 | Mes partages | `GET/POST /etudiants/moi/partages`, `DELETE /:id` |

---

## 4. Ce qu'il ne faut PAS construire

Les pages actuelles de `inubil-verify-front/` (`AdminInubil.jsx`, `DashboardDirecteur.jsx`) introduisent des concepts qui **n'existent pas côté backend** et ne doivent pas être repris tels quels dans la refonte :

- "Manifeste" / validation par lot (le backend valide un document à la fois)
- Signature "HSM"
- "Crédits" / "quotas blockchain" par établissement
- Établissements partenaires actifs avec quota individuel (contraire à la décision mono-université)

---

*Dernière mise à jour : conception issue de l'analyse RBAC du backend, session du 2026-08-19.*
