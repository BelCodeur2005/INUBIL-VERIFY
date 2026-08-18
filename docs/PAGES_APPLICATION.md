# Pages de l'Application - INUBIL Verify

> Document de référence listant toutes les pages de la plateforme (frontend React).  
> Organisé par module, avec la route, le rôle requis et l'issue GitHub correspondante.

**Total : 34 pages**

---

## Légende des accès

| Symbole | Signification |
|---|---|
| 🌐 | Public - aucun compte requis |
| 🔓 | Compte optionnel (employeur, autre_universite) |
| 🔒 | Compte obligatoire |
| 👑 | Super Admin / Admin ISTAMA uniquement |
| 🏛️ | Personnel université (responsable, directeur, agent) |
| 🎓 | Étudiant uniquement |

---

## Module 1 - Pages Publiques

> Accessibles par tout le monde, sans aucun compte. Priorité mobile-first.

| # | Route | Page | Accès | Issue |
|---|---|---|---|---|
| 1 | `/` | **Landing page** - présentation INUBIL Verify, section "comment ça marche", universités partenaires, statistiques, footer | 🌐 | #42 |
| 2 | `/verifier` | **Vérification rapide** - 3 onglets : saisir un identifiant (`INB-2024-00123`) / scanner QR code / uploader PDF | 🌐 | #31 |
| 3 | `/d/:identifiant` | **Résultat vérification - Diplôme VALIDE** - badge vert, infos diplôme complètes, hash blockchain, bouton télécharger rapport PDF | 🌐 | #31 |
| 4 | `/d/:identifiant` | **Résultat vérification - Diplôme RÉVOQUÉ** - badge orange, date révocation, contact université | 🌐 | #31 |
| 5 | `/d/:identifiant` | **Résultat vérification - Introuvable** - badge rouge, suggestions, lien accueil | 🌐 | #31 |
| 6 | `/partage/:token` | **Document partagé (destinataire)** - page isolée pour employeur/université qui reçoit un lien : infos diplôme, QR code, téléchargement PDF, lien vérification. États : valide / expiré / révoqué | 🌐 | #55 |

---

## Module 2 - Authentification

> Pages de gestion de compte. Redirigent vers le dashboard selon le rôle après connexion.

| # | Route | Page | Accès | Issue |
|---|---|---|---|---|
| 7 | `/auth/connexion` | **Connexion** - email + mot de passe, lien mot de passe oublié, messages d'erreur (compte bloqué, inactif) | 🌐 | #12 |
| 8 | `/auth/inscription` | **Inscription** - pour compte employeur ou autre_universite (optionnel), email professionnel requis, vérification email | 🌐 | #12 |
| 9 | `/auth/mot-de-passe-oublier` | **Mot de passe oublié** - saisir email, envoyer lien de réinitialisation | 🌐 | #14 |
| 10 | `/auth/reinitialiser/:token` | **Réinitialisation mot de passe** - nouveau mot de passe + confirmation, token valide 1h | 🌐 | #14 |
| 11 | `/auth/activer/:token` | **Activation de compte (invitation)** - page pour les collaborateurs invités par une université : saisir nom, prénom, mot de passe, afficher rôle assigné | 🌐 | #54 |

---

## Module 3 - Administration (Super Admin / Admin ISTAMA)

> Gestion globale de la plateforme. Accès : `super_admin`, `admin_istama`.

| # | Route | Page | Accès | Issue |
|---|---|---|---|---|
| 12 | `/admin` | **Dashboard Admin** - KPIs globaux : total diplômes émis, universités actives, vérifications du mois, diplômes révoqués. Graphiques évolution mensuelle. Activité récente | 👑🔒 | #41 |
| 13 | `/admin/universites` | **Liste des universités** - tableau avec statut (active / suspendue / en attente), filtres, boutons Activer / Suspendre / Supprimer | 👑🔒 | #17 |
| 14 | `/admin/universites/nouvelle` | **Ajouter une université** - formulaire : nom, pays, ville, type, logo upload, responsable | 👑🔒 | #17 |
| 15 | `/admin/universites/:id` | **Détail / édition université** - modifier les infos, changer le statut, voir les membres | 👑🔒 | #17 |
| 16 | `/admin/utilisateurs` | **Liste des utilisateurs** - tous les comptes, filtre par rôle/université, actions Activer / Bloquer / Réinitialiser MDP | 👑🔒 | #18 |
| 17 | `/admin/utilisateurs/nouveau` | **Ajouter un utilisateur** - formulaire : nom, prénom, email, rôle, université associée | 👑🔒 | #18 |
| 18 | `/admin/utilisateurs/:id` | **Détail / édition utilisateur** - modifier les infos, changer le rôle | 👑🔒 | #18 |
| 19 | `/admin/roles` | **Gestion des rôles et permissions** - liste des rôles, création, édition, attribution de permissions | 👑🔒 | #18 |
| 20 | `/admin/audit` | **Journal d'audit** - historique de toutes les actions sensibles (émission, révocation, connexions), filtrable par date / utilisateur / action, export CSV | 👑🔒 | #41 |

---

## Module 4 - Espace Université

> Gestion des diplômes et de l'équipe. Accès selon le rôle :  
> `responsable_universite` - tout le module  
> `directeur_pedagogique` - validation diplômes  
> `agent_saisie` - saisie et liste diplômes

| # | Route | Page | Accès | Issue |
|---|---|---|---|---|
| 21 | `/universite` | **Dashboard université** - KPIs propres à l'université : diplômes émis, en attente validation, émis cette année | 🏛️🔒 | #41 |
| 22 | `/universite/diplomes` | **Liste des diplômes** - tableau filtrable par statut (brouillon / en attente / valide / révoqué), recherche par étudiant, pagination | 🏛️🔒 | #27 |
| 23 | `/universite/diplomes/nouveau` | **Saisie diplôme - Étape 1/3** - infos étudiant : nom, prénom, date naissance, numéro étudiant, email | 🏛️🔒 | #26 |
| 24 | `/universite/diplomes/nouveau` | **Saisie diplôme - Étape 2/3** - infos diplôme : type, filière, mention, date obtention, année académique, université émettrice | 🏛️🔒 | #26 |
| 25 | `/universite/diplomes/nouveau` | **Saisie diplôme - Étape 3/3** - récapitulatif complet + upload PDF + confirmation | 🏛️🔒 | #26 |
| 26 | `/universite/diplomes/:id` | **Détail diplôme** - toutes les infos, QR code, hash blockchain, lien IPFS, statut. Bouton Révoquer (si autorisé) | 🏛️🔒 | #28 |
| 27 | `/universite/diplomes/:id` | **Modal révocation** - sur la même page, motif obligatoire, confirmation avant envoi blockchain | 🏛️🔒 | #52 |
| 28 | `/universite/validation` | **File de validation** - liste des diplômes en attente de validation, aperçu, boutons Valider / Rejeter (avec motif), validation en masse | 🏛️🔒 | #27 |
| 29 | `/universite/agents` | **Gestion des collaborateurs** - liste agents et directeurs, inviter par email, désactiver un compte | 🏛️🔒 | #54 |
| 30 | `/universite/invitations` | **Invitations en cours** - tableau des invitations envoyées avec statut (en attente / utilisée / expirée), annuler / renvoyer | 🏛️🔒 | #54 |
| 31 | `/universite/parametres` | **Paramètres université** - logo, informations contact, configuration notifications email | 🏛️🔒 | #43 |

---

## Module 5 - Espace Étudiant

> Accès exclusif au rôle `etudiant`.

| # | Route | Page | Accès | Issue |
|---|---|---|---|---|
| 32 | `/espace` | **Dashboard étudiant** - liste de tous ses diplômes et relevés (carte par diplôme : type, filière, date, statut), boutons Voir / Partager / Télécharger | 🎓🔒 | #35 |
| 33 | `/espace/diplomes/:id` | **Détail diplôme (étudiant)** - infos complètes, QR code téléchargeable, hash blockchain, lien unique universel copiable (`verify.inubil.com/d/...`), bouton Télécharger PDF, bouton Générer un lien de partage | 🎓🔒 | #35 |
| 34 | `/espace/diplomes/:id/partager` | **Partage diplôme** - formulaire durée d'expiration (7j / 30j / 90j / permanent), lien généré + bouton Copier, QR code du lien, partage rapide WhatsApp / email | 🎓🔒 | #36 |
| 35 | `/espace/partages` | **Mes partages** - tableau des liens créés : destinataire, date création, expiration, nb de consultations, statut. Bouton Révoquer un partage | 🎓🔒 | #36 |

---

## Module 6 - Compte Optionnel (Employeur / Autre Université)

> Fonctionnalités bonus pour les vérificateurs qui créent un compte.

| # | Route | Page | Accès | Issue |
|---|---|---|---|---|
| 36 | `/historique` | **Historique des vérifications** - liste de toutes les vérifications passées avec date, diplôme consulté, résultat. Bouton re-vérifier | 🔓🔒 | #33 |

---

## Pages communes (tous les utilisateurs connectés)

| # | Route | Page | Accès | Issue |
|---|---|---|---|---|
| 37 | `/profil` | **Mon profil** - infos personnelles, modification email, changement mot de passe, photo de profil | 🔒 | #43 |
| 38 | `/profil/sessions` | **Mes sessions** - historique des connexions (IP, appareil, date), bouton révoquer une session | 🔒 | #11 |
| 39 | `/notifications` | **Centre de notifications** - liste des notifications avec statut lu/non-lu (validation diplôme, invitation, révocation...) | 🔒 | #43 |

---

## Pages d'erreur

| # | Route | Page |
|---|---|---|
| 40 | `/**` | **404 - Page introuvable** - message clair + bouton retour accueil |
| 41 | `/403` | **403 - Accès refusé** - message + redirection vers dashboard selon rôle |

---

## Récapitulatif par module

| Module | Nb de pages | Issues Angular |
|---|---|---|
| Pages publiques | 6 | #31, #32, #42, #55 |
| Authentification | 5 | #12, #14, #54 |
| Administration | 8 | #17, #18, #41 |
| Espace Université | 10 | #26, #27, #28, #43, #52, #54 |
| Espace Étudiant | 4 | #35, #36 |
| Compte Optionnel | 1 | #33 |
| Pages communes | 3 | #11, #43 |
| Pages d'erreur | 2 | - |
| **TOTAL** | **39 pages** | |

---

## Redirections post-connexion (selon rôle)

| Rôle | Redirection après `/auth/connexion` |
|---|---|
| `super_admin` | `/admin` |
| `admin_istama` | `/admin` |
| `responsable_universite` | `/universite` |
| `directeur_pedagogique` | `/universite/validation` |
| `agent_saisie` | `/universite/diplomes` |
| `etudiant` | `/espace` |
| `employeur` | `/historique` |
| `autre_universite` | `/historique` |

---

## Routes Angular - Structure de routing recommandée

```
AppRoutingModule
├── /                          → LandingComponent (public)
├── /verifier                  → VerificationPageComponent (public)
├── /d/:identifiant            → ResultatVerificationComponent (public)
├── /partage/:token            → DocumentPartageComponent (public)
│
├── /auth
│   ├── /connexion             → LoginComponent
│   ├── /inscription           → InscriptionComponent
│   ├── /mot-de-passe-oublier  → ForgotPasswordComponent
│   ├── /reinitialiser/:token  → ResetPasswordComponent
│   └── /activer/:token        → ActivationCompteComponent
│
├── /admin (AuthGuard + RoleGuard: super_admin, admin_istama)
│   ├── /                      → AdminDashboardComponent
│   ├── /universites           → UniversitesListeComponent
│   ├── /universites/nouvelle  → UniversiteFormComponent
│   ├── /universites/:id       → UniversiteDetailComponent
│   ├── /utilisateurs          → UtilisateursListeComponent
│   ├── /utilisateurs/nouveau  → UtilisateurFormComponent
│   ├── /utilisateurs/:id      → UtilisateurDetailComponent
│   ├── /roles                 → RolesComponent
│   └── /audit                 → AuditComponent
│
├── /universite (AuthGuard + RoleGuard: responsable, directeur, agent)
│   ├── /                      → UniversiteDashboardComponent
│   ├── /diplomes              → DiplomesListeComponent
│   ├── /diplomes/nouveau      → SaisieDiplomeComponent (stepper)
│   ├── /diplomes/:id          → DiplomeDetailComponent
│   ├── /validation            → ValidationListeComponent
│   ├── /agents                → AgentsComponent
│   ├── /invitations           → InvitationsComponent
│   └── /parametres            → UniversiteParametresComponent
│
├── /espace (AuthGuard + RoleGuard: etudiant)
│   ├── /                      → EtudiantDashboardComponent
│   ├── /diplomes/:id          → EtudiantDiplomeDetailComponent
│   ├── /diplomes/:id/partager → PartagerDiplomeComponent
│   └── /partages              → MesPartagesComponent
│
├── /historique (AuthGuard: employeur, autre_universite)
│   └── /                      → HistoriqueVerificationsComponent
│
├── /profil (AuthGuard)
│   ├── /                      → ProfilComponent
│   └── /sessions              → SessionsComponent
│
├── /notifications (AuthGuard)  → NotificationsComponent
│
├── /403                        → AccesRefuseComponent
└── /**                         → NotFoundComponent
```
