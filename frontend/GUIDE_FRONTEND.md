# Guide Frontend — INUBIL Verify

Ce document explique la structure complète du frontend Angular. Lis-le **en entier avant de commencer** à coder une page.

---

## Table des matières

1. [Stack et versions](#1-stack-et-versions)
2. [Lancer le projet](#2-lancer-le-projet)
3. [Arborescence des fichiers](#3-arborescence-des-fichiers)
4. [Les 3 layouts](#4-les-3-layouts)
5. [Le système de routing](#5-le-système-de-routing)
6. [Core — auth, guards, intercepteur](#6-core--auth-guards-intercepteur)
7. [Core — modèles TypeScript](#7-core--modèles-typescript)
8. [Core — services partagés](#8-core--services-partagés)
9. [Le système de styles (TailwindCSS v4)](#9-le-système-de-styles-tailwindcss-v4)
10. [Comment créer une nouvelle page](#10-comment-créer-une-nouvelle-page)
11. [Règles absolues à respecter](#11-règles-absolues-à-respecter)

---

## 1. Stack et versions

| Technologie | Version | Rôle |
|---|---|---|
| Angular | **21** | Framework principal |
| TailwindCSS | **v4** | Styles utilitaires |
| TypeScript | 5.x | Langage |
| Node.js | 20 LTS | Runtime |

> **Important :** Angular 21 utilise la nouvelle syntaxe de template (`@if`, `@for`, `@switch`). N'utilise **pas** `*ngIf` ou `*ngFor` — ces directives sont dépassées dans cette version.

---

## 2. Lancer le projet

```bash
# Depuis le dossier frontend/
npm install
npm start
```

Le frontend tourne sur **http://localhost:4200** (ou un autre port si 4200 est occupé — Angular l'indique dans le terminal).

L'API backend doit tourner sur **http://localhost:3000**. Si elle n'est pas lancée, les appels HTTP échoueront mais tu peux quand même travailler sur les composants visuels.

---

## 3. Arborescence des fichiers

```
frontend/
├── public/
│   └── images/
│       └── logo_inubil_verify.png     ← logo officiel utilisé partout
│
└── src/
    ├── main.ts                         ← point d'entrée (ne pas toucher)
    ├── styles.css                      ← styles globaux + tokens de design
    ├── environments/
    │   ├── environment.ts              ← dev  → apiUrl: 'http://localhost:3000'
    │   └── environment.prod.ts         ← prod → apiUrl: 'https://api.inubil-verify.com'
    │
    └── app/
        ├── app.ts                      ← composant racine (juste <router-outlet>)
        ├── app.config.ts               ← configuration Angular (providers)
        ├── app.routes.ts               ← TOUTES les routes de l'application
        │
        ├── core/                       ← code partagé global
        │   ├── auth/
        │   │   ├── auth.service.ts     ← service d'authentification (Signals)
        │   │   ├── auth.guard.ts       ← protège les routes (utilisateur connecté)
        │   │   └── role.guard.ts       ← protège les routes par rôle
        │   ├── interceptors/
        │   │   └── jwt.interceptor.ts  ← ajoute automatiquement le token JWT
        │   ├── models/
        │   │   ├── user.model.ts       ← types Utilisateur, Role, AuthResponse
        │   │   ├── document.model.ts   ← types Document, StatutDocument
        │   │   └── api.model.ts        ← types ApiError, PaginatedResponse<T>
        │   └── services/
        │       └── toast.service.ts    ← notifications toast
        │
        ├── shared/
        │   └── layouts/
        │       ├── auth-layout/        ← layout connexion/activation
        │       ├── app-layout/         ← layout sidebar (pages connectées)
        │       └── public-layout/      ← layout vérification publique
        │
        └── features/                   ← une page = un dossier
            ├── auth/
            │   ├── login/login.ts
            │   ├── forgot-password/forgot-password.ts
            │   ├── reset-password/reset-password.ts
            │   └── activation/activation.ts
            ├── admin/
            │   ├── dashboard/dashboard.ts
            │   ├── universites/
            │   │   ├── liste/liste.ts
            │   │   ├── form/form.ts
            │   │   └── detail/detail.ts
            │   ├── utilisateurs/
            │   │   ├── liste/liste.ts
            │   │   └── form/form.ts
            │   └── audit/audit.ts
            ├── universite/
            │   ├── dashboard/dashboard.ts
            │   ├── diplomes/
            │   │   ├── liste/liste.ts
            │   │   ├── nouveau/nouveau.ts
            │   │   └── detail/detail.ts
            │   ├── validation/validation.ts
            │   ├── agents/agents.ts
            │   └── parametres/parametres.ts
            ├── etudiant/
            │   ├── dashboard/dashboard.ts
            │   ├── detail/detail.ts
            │   ├── partage/partage.ts
            │   └── mes-partages/mes-partages.ts
            ├── verification/
            │   ├── recherche/recherche.ts
            │   └── resultat/resultat.ts
            ├── profil/
            │   ├── compte/compte.ts
            │   └── sessions/sessions.ts
            └── errors/
                ├── forbidden.ts        ← page 403
                └── not-found.ts        ← page 404
```

---

## 4. Les 3 layouts

Il y a **3 layouts** dans l'application. Chaque layout enveloppe un groupe de pages. Tu ne les modifies **que si** on te le demande — tes pages s'insèrent dedans via `<router-outlet>`.

---

### `auth-layout` — pages d'authentification

Utilisé pour : connexion, mot de passe oublié, réinitialisation, activation de compte.

**Structure visuelle :**

```
┌─────────────────────────────────────────────────────┐
│  [logo]                              header #002C53 │
├─────────────────────────────────────────────────────┤
│                                                     │
│           ┌────────────────────────┐               │
│           │   <router-outlet>      │               │
│           │   (ta page s'affiche   │               │
│           │    ici dans la carte)  │               │
│           └────────────────────────┘               │
│                                                     │
│                  fond gris #F8F9FA                  │
└─────────────────────────────────────────────────────┘
```

Ta page reçoit une zone centrée de **max-width 480px**. Elle doit afficher une **carte blanche** avec coins arrondis et ombre. Regarde `features/auth/login/login.ts` comme référence complète.

---

### `app-layout` — pages de l'application (utilisateur connecté)

Utilisé pour : tous les tableaux de bord, gestion des diplômes, profil, admin.

**Structure visuelle :**

```
┌───────────┬─────────────────────────────────────────┐
│           │  topbar blanc (recherche + notifications │
│  sidebar  │  + avatar utilisateur)                  │
│  #002C53  ├─────────────────────────────────────────┤
│  264px    │                                         │
│  (fixe)   │     <router-outlet>                     │
│           │     (ta page s'affiche ici)             │
│           │     padding: 1.5rem, scroll vertical    │
└───────────┴─────────────────────────────────────────┘
```

Ta page reçoit le `<main>` avec padding et scroll. **Tu n'as pas à gérer la sidebar ou le topbar** — ils font partie du layout.

> **Note :** La sidebar est actuellement vide (navigation à implémenter). Le topbar affiche un champ de recherche et un avatar statique pour l'instant.

---

### `public-layout` — vérification publique

Utilisé pour : la vérification de diplôme accessible sans connexion.

**Structure :** header navy avec logo + nom + zone de contenu centrée (max-width standard).

---

## 5. Le système de routing

Toutes les routes sont définies dans **`app/app.routes.ts`**. Ce fichier est la **source de vérité** pour la navigation.

### Comment les routes sont organisées

```typescript
// La route parente définit le layout
{
  path: 'admin',
  canActivate: [authGuard, roleGuard(['super_admin', 'admin_istama'])],
  loadComponent: () =>
    import('./shared/layouts/app-layout/app-layout').then(m => m.AppLayout),
  children: [
    // Les routes enfants définissent les pages
    {
      path: '',
      loadComponent: () =>
        import('./features/admin/dashboard/dashboard').then(m => m.AdminDashboardPage),
    },
    {
      path: 'universites',
      loadComponent: () =>
        import('./features/admin/universites/liste/liste').then(m => m.UniversitesListePage),
    },
  ],
},
```

Chaque page utilise le **lazy loading** : Angular ne charge le code d'une page que quand l'utilisateur y navigue. C'est déjà configuré — **ne change pas ce pattern**.

### Tableau de toutes les routes

| URL | Composant exporté | Rôles autorisés |
|---|---|---|
| `/auth/connexion` | `LoginPage` | Public |
| `/auth/mot-de-passe-oublier` | `ForgotPasswordPage` | Public |
| `/auth/reinitialiser/:token` | `ResetPasswordPage` | Public |
| `/auth/activer/:token` | `ActivationPage` | Public |
| `/verifier` | `RecherchePage` | Public |
| `/verifier/d/:id` | `ResultatPage` | Public |
| `/admin` | `AdminDashboardPage` | super_admin, admin_istama |
| `/admin/universites` | `UniversitesListePage` | super_admin, admin_istama |
| `/admin/universites/nouvelle` | `UniversiteFormPage` | super_admin, admin_istama |
| `/admin/universites/:id` | `UniversiteDetailPage` | super_admin, admin_istama |
| `/admin/utilisateurs` | `UtilisateursListePage` | super_admin, admin_istama |
| `/admin/utilisateurs/nouveau` | `UtilisateurFormPage` | super_admin, admin_istama |
| `/admin/audit` | `AuditPage` | super_admin, admin_istama |
| `/universite` | `UniversiteDashboardPage` | responsable_universite, directeur_pedagogique, agent_saisie |
| `/universite/diplomes` | `DiplomesListePage` | responsable_universite, directeur_pedagogique, agent_saisie |
| `/universite/diplomes/nouveau` | `NouveauDiplomePage` | responsable_universite, agent_saisie |
| `/universite/diplomes/:id` | `DiplomeDetailPage` | responsable_universite, directeur_pedagogique, agent_saisie |
| `/universite/validation` | `ValidationPage` | responsable_universite, directeur_pedagogique |
| `/universite/agents` | `AgentsPage` | responsable_universite |
| `/universite/parametres` | `ParametresPage` | responsable_universite |
| `/espace` | `EtudiantDashboardPage` | etudiant |
| `/espace/diplomes/:id` | `EtudiantDetailPage` | etudiant |
| `/espace/diplomes/:id/partager` | `PartagerPage` | etudiant |
| `/espace/partages` | `MesPartagesPage` | etudiant |
| `/profil` | `ComptePage` | Tous connectés |
| `/profil/sessions` | `SessionsPage` | Tous connectés |
| `/403` | `ForbiddenPage` | — |

> **Règle :** le nom exporté de ta classe doit correspondre **exactement** à ce qui est dans `app.routes.ts`. Si la route dit `.then(m => m.DiplomesListePage)`, ton `export class` doit s'appeler `DiplomesListePage`.

---

## 6. Core — auth, guards, intercepteur

### `AuthService` — `core/auth/auth.service.ts`

C'est le service central de gestion de session. Il utilise les **Angular Signals** pour l'état réactif — tout changement d'état met à jour automatiquement les templates qui s'y abonnent.

```typescript
// Injecter dans n'importe quel composant
private auth = inject(AuthService);

// Signals exposés (lecture seule, appelés comme des fonctions)
auth.utilisateur()   // Utilisateur | null — l'utilisateur connecté
auth.estConnecte()   // boolean
auth.role()          // Role | undefined
auth.nomComplet()    // 'Prénom Nom'

// Méthodes disponibles
auth.login(email, motDePasse)  // retourne Observable<AuthResponse>
auth.logout()                  // déconnecte + redirige vers /auth/connexion
auth.getToken()                // retourne le JWT brut (string | null)
auth.getDashboard()            // retourne l'URL du dashboard selon le rôle
```

**Stockage :** le token JWT est dans `localStorage` sous la clé `inubil_token`. L'utilisateur est dans `inubil_user`. L'intercepteur les utilise automatiquement.

---

### `authGuard` — `core/auth/auth.guard.ts`

Vérifie que l'utilisateur est connecté. Si non → redirige vers `/auth/connexion`.

```typescript
// Déclaré dans app.routes.ts sur les routes protégées
canActivate: [authGuard]
```

---

### `roleGuard` — `core/auth/role.guard.ts`

Vérifie que l'utilisateur a l'un des rôles autorisés. Si non → redirige vers `/403`.

```typescript
// Toujours avec authGuard en premier
canActivate: [authGuard, roleGuard(['super_admin', 'admin_istama'])]
```

> Mets toujours `authGuard` **avant** `roleGuard`. Le roleGuard suppose que l'utilisateur est déjà connecté.

---

### `jwtInterceptor` — `core/interceptors/jwt.interceptor.ts`

S'exécute automatiquement sur **chaque requête HTTP sortante**. Il récupère le token depuis `AuthService` et ajoute l'en-tête :

```
Authorization: Bearer <token>
```

Tu n'as **rien à faire** — c'est complètement transparent. Toutes tes requêtes `HttpClient` sont déjà authentifiées.

---

## 7. Core — modèles TypeScript

Utilise toujours les types du dossier `core/models/` — ne recrée jamais des interfaces qui existent déjà.

---

### `user.model.ts`

**Les 8 rôles de l'application :**

| Valeur | Label affiché | Dashboard après connexion |
|---|---|---|
| `super_admin` | Super Administrateur | `/admin` |
| `admin_istama` | Admin ISTAMA | `/admin` |
| `responsable_universite` | Responsable Université | `/universite` |
| `directeur_pedagogique` | Directeur Pédagogique | `/universite/validation` |
| `agent_saisie` | Agent de Saisie | `/universite/diplomes` |
| `etudiant` | Étudiant | `/espace` |
| `employeur` | Employeur | `/historique` |
| `autre_universite` | Autre Université | `/historique` |

**Utiliser `ROLE_LABELS` pour afficher le nom d'un rôle :**

```typescript
import { ROLE_LABELS } from '../../../core/models/user.model';

// Dans le template
{{ ROLE_LABELS[utilisateur().role] }}   // → 'Agent de Saisie'
```

---

### `document.model.ts`

**Les 5 statuts d'un document :**

| Valeur | Signification |
|---|---|
| `brouillon` | Créé, PDF pas encore uploadé ou non envoyé en validation |
| `en_validation` | En attente de validation par le directeur pédagogique |
| `actif` | Validé + ancré sur la blockchain |
| `revoque` | Révoqué après avoir été actif |
| `rejete` | Rejeté par le directeur avec un motif |

**Utiliser `STATUT_LABELS` pour afficher le statut :**

```typescript
import { STATUT_LABELS } from '../../../core/models/document.model';

STATUT_LABELS['en_validation']  // → 'En validation'
```

**Les champs blockchain** (`transaction_hash`, `bloc_numero`, `reseau`, `adresse_contrat`) peuvent être `null` si le document n'est pas encore ancré. Gère toujours ce cas dans l'affichage.

---

### `api.model.ts`

```typescript
// Pour les listes paginées retournées par l'API
interface PaginatedResponse<T> {
  data: T[];
  total: number;       // nombre total de résultats
  page: number;        // page actuelle (commence à 1)
  limit: number;       // résultats par page
  totalPages: number;
}

// Pour les erreurs de l'API
interface ApiError {
  statusCode: number;
  message: string | string[];  // peut être un tableau (erreurs de validation)
  error?: string;
}
```

---

## 8. Core — services partagés

### `ToastService` — `core/services/toast.service.ts`

Système de notifications. Les toasts disparaissent automatiquement après **4 secondes**.

```typescript
private toast = inject(ToastService);

// Afficher une notification
this.toast.success('Diplôme enregistré avec succès.');
this.toast.error('Une erreur est survenue.');
this.toast.info('Validation en cours...');
this.toast.warning('Ce document sera archivé.');
```

> Le composant visuel qui affiche les toasts (`ToastContainer`) **n'est pas encore créé**. C'est l'une des premières choses à implémenter dans `shared/` et à ajouter au `app-layout`.

---

## 9. Le système de styles (TailwindCSS v4)

### Comment ça fonctionne

TailwindCSS v4 est configuré via `src/styles.css`. Le fichier définit les **tokens de design** dans un bloc `@theme {}`. Ces tokens sont ensuite utilisables comme classes Tailwind dans les templates.

### Tokens de couleur

| Token CSS | Valeur | Usage dans le template |
|---|---|---|
| `--color-primary` | `#002C53` | `bg-primary`, `text-primary` |
| `--color-primary-container` | `#0A4275` | `bg-primary-container` |
| `--color-secondary` | `#0060AC` | `bg-secondary`, `text-secondary` |
| `--color-success` | `#22C486` | `bg-success`, `text-success` |
| `--color-error` | `#BA1A1A` | `bg-error`, `text-error` |
| `--color-surface` | `#F8F9FA` | `bg-surface` (fond des pages) |
| `--color-surface-bright` | `#FFFFFF` | `bg-surface-bright` |
| `--color-on-surface` | `#191C1D` | `text-on-surface` (texte principal) |
| `--color-on-surface-variant` | `#42474F` | `text-on-surface-variant` (texte secondaire) |
| `--color-outline-variant` | `#C2C6D1` | `border-outline-variant` |

### Classes composants pré-définies dans `styles.css`

Ces classes sont **déjà disponibles** dans tous les templates sans import :

```html
<!-- Boutons -->
<button class="btn-primary">Enregistrer</button>
<button class="btn-secondary">Annuler</button>
<button class="btn-ghost">Voir plus</button>
<button class="btn-danger">Supprimer</button>

<!-- Formulaires -->
<label class="input-label">Intitulé du champ</label>
<input class="input-field" type="text" />
<p class="input-error">Message d'erreur</p>

<!-- Carte -->
<div class="card">contenu de la carte</div>

<!-- Badges de statut document -->
<span class="badge badge-actif">Actif</span>
<span class="badge badge-brouillon">Brouillon</span>
<span class="badge badge-validation">En validation</span>
<span class="badge badge-revoque">Révoqué</span>
<span class="badge badge-rejete">Rejeté</span>

<!-- Tableaux -->
<th class="table-header">Colonne</th>
<td class="table-cell">Valeur</td>
<tr class="table-row">...</tr>

<!-- Hash blockchain (police monospace) -->
<div class="hash-block">0x3f4a9c...</div>
```

### Styles spécifiques à un composant

TailwindCSS v4 peut ne pas détecter toutes les classes dans les templates inline Angular. **Solution recommandée** : utilise la propriété `styles: [...]` du décorateur `@Component` avec du CSS brut pour les styles propres à ton composant. Regarde `login.ts` pour voir comment c'est fait.

```typescript
@Component({
  styles: [`
    .ma-carte {
      background: #fff;
      border-radius: 1rem;
      padding: 2rem;
      box-shadow: 0 4px 24px rgba(0, 44, 83, 0.08);
    }
  `],
  template: `<div class="ma-carte">...</div>`,
})
```

---

## 10. Comment créer une nouvelle page

### Étape 1 — Créer le fichier

Convention : **un seul fichier `.ts`** par page, dans son dossier dédié.

```
features/universite/diplomes/liste/liste.ts   ✓
features/universite/diplomes/liste/liste.html ✗  (ne pas faire)
features/universite/diplomes/liste/liste.scss ✗  (ne pas faire)
```

### Étape 2 — Structure de base d'une page

```typescript
import { Component, inject, signal, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { PaginatedResponse } from '../../../core/models/api.model';
import { DocumentListItem, STATUT_LABELS } from '../../../core/models/document.model';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-page',          // ← toujours 'app-page' pour les pages
  standalone: true,
  imports: [RouterLink],
  template: `
    <div>
      <!-- En-tête de page -->
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
        <h1 style="font-size:1.5rem; font-weight:700; color:#002C53;">Liste des diplômes</h1>
        <a routerLink="nouveau" class="btn-primary">Nouveau diplôme</a>
      </div>

      <!-- État chargement -->
      @if (chargement()) {
        <p>Chargement...</p>
      }

      <!-- État erreur -->
      @else if (erreur()) {
        <div class="card" style="color:#BA1A1A;">{{ erreur() }}</div>
      }

      <!-- Contenu -->
      @else {
        <div class="card">
          @for (doc of documents(); track doc.id) {
            <div class="table-row">
              <span class="table-cell">{{ doc.numero_unique }}</span>
              <span class="badge badge-{{ doc.statut }}">{{ statutLabel(doc.statut) }}</span>
            </div>
          } @empty {
            <p>Aucun diplôme trouvé.</p>
          }
        </div>
      }
    </div>
  `,
})
export class DiplomesListePage implements OnInit {
  private http  = inject(HttpClient);
  private toast = inject(ToastService);

  chargement = signal(true);
  erreur     = signal<string | null>(null);
  documents  = signal<DocumentListItem[]>([]);

  // Rendre STATUT_LABELS accessible dans le template
  statutLabel = (statut: string) =>
    STATUT_LABELS[statut as keyof typeof STATUT_LABELS] ?? statut;

  ngOnInit() {
    this.http
      .get<PaginatedResponse<DocumentListItem>>(`${environment.apiUrl}/documents`)
      .subscribe({
        next: (res) => {
          this.documents.set(res.data);
          this.chargement.set(false);
        },
        error: () => {
          this.erreur.set('Impossible de charger les diplômes.');
          this.chargement.set(false);
        },
      });
  }
}
```

### Étape 3 — Vérifier le nom d'export dans `app.routes.ts`

Toutes les routes sont **déjà définies** dans `app.routes.ts`. Tu n'as pas à les ajouter. Vérifie juste que le nom de l'export de ta classe correspond exactement à ce qui est dans le fichier.

```typescript
// Dans app.routes.ts, la route dit :
loadComponent: () =>
  import('./features/universite/diplomes/liste/liste').then(m => m.DiplomesListePage)

// Donc ta classe doit s'appeler exactement :
export class DiplomesListePage { ... }
```

### Étape 4 — Tester

Navigue vers l'URL dans le navigateur. Si la page est blanche ou en erreur → ouvre la console (F12) et lis le message.

---

## 11. Règles absolues à respecter

Ces règles maintiennent la cohérence du projet. Elles ne sont **pas négociables**.

### Architecture

- **Un seul fichier `.ts` par page.** Pas de `.html` ou `.scss` séparé.
- **Tous les composants sont `standalone: true`.** Pas de NgModule.
- **Le selector est `'app-page'`** pour toutes les pages (composants enfants de route).
- **N'ajoute jamais de route dans `app.routes.ts`** sans coordination — elles sont toutes déjà présentes.
- **N'installe pas de nouvelles librairies** sans en discuter d'abord avec l'équipe.

### State management (gestion d'état)

- **Utilise `signal()` pour tout l'état local** d'un composant.
- **N'installe pas NgRx** — les Signals Angular suffisent pour ce projet.
- **N'utilise pas `BehaviorSubject`** — c'est l'ancienne façon de faire, remplacée par les Signals.

```typescript
// CORRECT
chargement = signal(false);
erreur     = signal<string | null>(null);
donnees    = signal<MonType[]>([]);

// INTERDIT
chargement$ = new BehaviorSubject(false);
```

### Syntaxe de template Angular 21

```html
<!-- CORRECT — nouvelle syntaxe -->
@if (condition()) { <div>visible</div> }
@for (item of liste(); track item.id) { <div>{{ item.nom }}</div> }
@switch (statut()) { @case ('actif') { <span>Actif</span> } }

<!-- INTERDIT — ancienne syntaxe -->
<div *ngIf="condition">visible</div>
<div *ngFor="let item of liste">{{ item.nom }}</div>
```

### Appels HTTP

- **Utilise toujours `environment.apiUrl`** comme base d'URL. Jamais `http://localhost:3000` en dur.
- **Gère toujours les deux cas** : `next:` (succès) et `error:` (échec).
- **Ne mets jamais de header `Authorization` manuellement** — l'intercepteur le fait automatiquement.
- **Réinitialise `chargement` dans les deux cas** (succès et erreur), sinon le spinner tourne indéfiniment.

```typescript
// Pattern correct
this.http.get<MonType>(`${environment.apiUrl}/ma-ressource`).subscribe({
  next: (data) => {
    this.donnees.set(data);
    this.chargement.set(false);    // ← indispensable
  },
  error: () => {
    this.erreur.set('Erreur de chargement.');
    this.chargement.set(false);    // ← indispensable aussi
  },
});
```

### Styles

- **N'utilise pas de couleurs hexadécimales dans les templates.** Utilise les classes Tailwind (`text-primary`) ou les classes composants (`.btn-primary`).
- **Ne modifie pas `styles.css`** sans coordination — c'est le design system global.
- **Pour les styles propres à un composant**, utilise `styles: [...]` dans le décorateur.

### Formulaires

- **Utilise `ReactiveFormsModule`**, jamais `FormsModule` avec `[(ngModel)]`.
- **Valide sur `blur`** (quand l'utilisateur quitte le champ), pas à chaque frappe.
- **Affiche les erreurs sous le champ** concerné, pas en haut du formulaire.
- **Désactive le bouton submit** pendant l'envoi : `[disabled]="chargement() || form.invalid"`.

---

## Page de référence : `login.ts`

Le fichier `features/auth/login/login.ts` est **la page la plus complète** du projet. Lis-le pour comprendre :

- Comment structurer les Signals (`chargement`, `erreur`, état local)
- Comment utiliser `ReactiveFormsModule` avec validation
- Comment injecter et appeler `AuthService`
- Comment gérer les différents codes d'erreur HTTP (`401`, `403`, `0`)
- Comment utiliser `styles: [...]` pour les styles spécifiques à un composant
- Comment faire un toggle (afficher/masquer le mot de passe)
- Comment rediriger après une action avec `router.navigateByUrl()`
