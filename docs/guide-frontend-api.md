# Guide Frontend - Comment utiliser l'API INUBIL Verify

> Ce guide est écrit pour quelqu'un qui n'a jamais connecté un frontend Angular à une API.
> Lis-le dans l'ordre, chaque partie s'appuie sur la précédente.

---

## Sommaire

1. [C'est quoi une API ? (la base)](#1-cest-quoi-une-api)
2. [La documentation Swagger - ton meilleur outil](#2-la-documentation-swagger)
3. [Installer et préparer Angular](#3-installer-et-préparer-angular)
4. [L'authentification JWT - comment ça marche](#4-lauthentification-jwt)
5. [Créer les services Angular](#5-créer-les-services-angular)
6. [L'intercepteur HTTP - le token automatique](#6-lintercepteur-http)
7. [Les guards - protéger les pages selon le rôle](#7-les-guards)
8. [Gérer les erreurs proprement](#8-gérer-les-erreurs)
9. [Exemples concrets par fonctionnalité](#9-exemples-concrets)
10. [Checklist de démarrage](#10-checklist-de-démarrage)

---

## 1. C'est quoi une API ?

Imagine un restaurant. Toi tu es le client (le frontend Angular). La cuisine c'est le backend (NestJS). Tu ne rentres pas directement en cuisine - tu passes par un **serveur** qui prend ta commande et te ramène le plat. Ce serveur, c'est l'**API**.

Concrètement dans ce projet :

```
Ton composant Angular          API INUBIL Verify          Base de données
(le navigateur)         --->   (port 3000)           --->  PostgreSQL
                               - vérifie qui tu es
                               - exécute la logique
                        <---   - retourne les données
```

La communication se fait via **HTTP** - les mêmes requêtes que ton navigateur fait quand tu visites un site web. Il y a 4 types d'actions :

| Type | Ce que ça fait | Exemple |
|---|---|---|
| `GET` | Lire des données | Récupérer la liste des diplômes |
| `POST` | Créer quelque chose | Créer un nouveau diplôme |
| `PATCH` | Modifier partiellement | Changer le statut d'un utilisateur |
| `DELETE` | Supprimer | Supprimer un brouillon |

Le backend répond toujours avec un **code de statut** :
- `200` / `201` → succès
- `400` → tu as envoyé des données incorrectes
- `401` → tu n'es pas connecté
- `403` → tu es connecté mais tu n'as pas le droit
- `404` → la ressource n'existe pas
- `500` → erreur côté serveur (pas de ta faute)

---

## 2. La documentation Swagger

**C'est ton outil numéro 1.** Avant d'écrire une seule ligne de code Angular, passe du temps ici.

### Comment y accéder

Le backend doit tourner (Docker lancé). Ouvre dans ton navigateur :

```
http://localhost:3000/api/docs
```

Tu vois une page avec tous les endpoints de l'API organisés par catégorie (Documents, Utilisateurs, Vérification publique, etc.).

### Comment l'utiliser

**Étape 1 - Se connecter dans Swagger**

1. Trouve `POST /auth/login` dans la section "Auth"
2. Clique sur l'endpoint, puis sur "Try it out"
3. Entre les identifiants de test :
```json
{
  "email": "admin@inubil.com",
  "mot_de_passe": "Admin123!"
}
```
4. Clique "Execute"
5. Dans la réponse, copie la valeur de `access_token`
6. Clique sur le bouton **"Authorize"** en haut de la page (icône cadenas)
7. Colle le token et valide

À partir de là, tous tes appels dans Swagger seront authentifiés.

**Étape 2 - Tester un endpoint**

Par exemple `GET /documents` :
1. Clique sur l'endpoint
2. "Try it out"
3. "Execute"
4. Tu vois la réponse exacte que ton Angular recevra

> **Conseil** : Teste TOUJOURS un endpoint dans Swagger avant de l'écrire dans Angular. Si ça ne marche pas dans Swagger, ça ne marchera pas dans ton code non plus.

### Le schéma JSON - comment lire la réponse

Swagger te montre la structure exacte des données. Par exemple pour un document :

```json
{
  "id": "uuid-ici",
  "numero_unique": "INUB-2026-0001",
  "statut": "actif",
  "etudiant_nom": "KAMGA Bertrand",
  "date_emission": "2026-01-15T00:00:00.000Z",
  ...
}
```

C'est exactement ce que tu vas recevoir dans Angular. Tu peux copier cette structure pour créer tes interfaces TypeScript.

---

## 3. Installer et préparer Angular

### Créer le projet Angular

Dans le dossier `frontend/` du projet :

```bash
cd frontend
ng new inubil-frontend --routing --style=scss --standalone=false
cd inubil-frontend
```

### Configurer les environnements

Crée deux fichiers pour gérer l'URL de l'API selon si tu es en développement ou en production.

`src/environments/environment.ts` (développement) :
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000'
};
```

`src/environments/environment.prod.ts` (production) :
```typescript
export const environment = {
  production: true,
  apiUrl: 'https://api.inubil.com'  // à changer quand le VPS est prêt
};
```

### Activer HttpClient dans AppModule

Angular ne peut pas faire de requêtes HTTP sans ce module. Ouvre `src/app/app.module.ts` :

```typescript
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule  // ← ajoute cette ligne
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
```

---

## 4. L'authentification JWT

### C'est quoi un JWT ?

Quand tu te connectes à l'API, le serveur te donne un **jeton** (token) - une longue chaîne de caractères qui prouve que tu es bien qui tu prétends être. Ce token ressemble à ça :

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMi...
```

Pour chaque requête suivante, tu dois envoyer ce token dans le header HTTP :
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Le backend lit ce token, sait qui tu es et quelles permissions tu as.

### Où stocker le token ?

Dans `localStorage` du navigateur. C'est simple et ça persiste entre les pages.

```typescript
// Sauvegarder
localStorage.setItem('access_token', token);

// Lire
const token = localStorage.getItem('access_token');

// Supprimer (déconnexion)
localStorage.removeItem('access_token');
```

### Le token expire au bout de 15 minutes

L'API renvoie aussi un `refresh_token` (valable 7 jours). Quand le `access_token` expire, tu dois appeler `POST /auth/refresh` avec le refresh_token pour en obtenir un nouveau. On verra comment automatiser ça dans la section intercepteur.

---

## 5. Créer les services Angular

Un **service** Angular est une classe qui contient toutes les fonctions pour parler à l'API. On crée un service par module de l'API.

### Structure recommandée

```
src/app/
├── core/
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── documents.service.ts
│   │   ├── utilisateurs.service.ts
│   │   ├── invitations.service.ts
│   │   ├── etudiants.service.ts
│   │   └── verification.service.ts
│   ├── interceptors/
│   │   └── auth.interceptor.ts
│   ├── guards/
│   │   ├── auth.guard.ts
│   │   └── role.guard.ts
│   └── models/
│       ├── document.model.ts
│       ├── utilisateur.model.ts
│       └── auth.model.ts
```

### Créer les modèles TypeScript (interfaces)

Les interfaces décrivent la forme des données que l'API retourne. Copie la structure depuis Swagger.

`src/app/core/models/auth.model.ts` :
```typescript
export interface LoginRequest {
  email: string;
  mot_de_passe: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface UtilisateurConnecte {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  role: {
    nom: string;
    permissions: string[];
  };
  universite_id: string | null;
}
```

`src/app/core/models/document.model.ts` :
```typescript
export interface Document {
  id: string;
  numero_unique: string;
  statut: 'brouillon' | 'en_validation' | 'actif' | 'revoque';
  etudiant_id: string;
  type_document: { nom: string; categorie: string };
  date_emission: string;
  filiere: string | null;
  mention: string | null;
  hash_sha256: string | null;
  transaction_hash: string | null;
  pdf_url: string | null;
  qr_code_url: string | null;
  url_verification: string | null;
}

export interface DocumentListResponse {
  total: number;
  page: number;
  limit: number;
  items: Document[];
}
```

### Le service Auth

`src/app/core/services/auth.service.ts` :
```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { LoginRequest, AuthResponse, UtilisateurConnecte } from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = environment.apiUrl;

  // BehaviorSubject = une valeur qui peut changer et que les composants peuvent écouter
  private utilisateurConnecte$ = new BehaviorSubject<UtilisateurConnecte | null>(null);

  constructor(private http: HttpClient, private router: Router) {}

  // Se connecter
  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, credentials).pipe(
      tap(response => {
        localStorage.setItem('access_token', response.access_token);
        localStorage.setItem('refresh_token', response.refresh_token);
        this.chargerProfil().subscribe();
      })
    );
  }

  // Récupérer le profil de l'utilisateur connecté
  chargerProfil(): Observable<UtilisateurConnecte> {
    return this.http.get<UtilisateurConnecte>(`${this.apiUrl}/auth/me`).pipe(
      tap(user => this.utilisateurConnecte$.next(user))
    );
  }

  // Se déconnecter
  logout(): void {
    this.http.post(`${this.apiUrl}/auth/logout`, {}).subscribe();
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    this.utilisateurConnecte$.next(null);
    this.router.navigate(['/auth/connexion']);
  }

  // Renouveler le token
  refreshToken(): Observable<AuthResponse> {
    const refreshToken = localStorage.getItem('refresh_token');
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/refresh`, {
      refresh_token: refreshToken
    }).pipe(
      tap(response => {
        localStorage.setItem('access_token', response.access_token);
      })
    );
  }

  // Accesseurs utiles
  getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  estConnecte(): boolean {
    return !!this.getToken();
  }

  getUtilisateur(): Observable<UtilisateurConnecte | null> {
    return this.utilisateurConnecte$.asObservable();
  }

  aPermission(permission: string): boolean {
    const user = this.utilisateurConnecte$.getValue();
    return user?.role?.permissions?.includes(permission) ?? false;
  }
}
```

### Le service Documents

`src/app/core/services/documents.service.ts` :
```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Document, DocumentListResponse } from '../models/document.model';

@Injectable({ providedIn: 'root' })
export class DocumentsService {
  private apiUrl = `${environment.apiUrl}/documents`;

  constructor(private http: HttpClient) {}

  // Lister les documents (avec filtres optionnels)
  lister(filtres?: { statut?: string; page?: number; limit?: number }): Observable<DocumentListResponse> {
    return this.http.get<DocumentListResponse>(this.apiUrl, { params: filtres as any });
  }

  // Détail d'un document
  trouver(id: string): Observable<Document> {
    return this.http.get<Document>(`${this.apiUrl}/${id}`);
  }

  // Créer un brouillon
  creer(dto: any): Observable<Document> {
    return this.http.post<Document>(this.apiUrl, dto);
  }

  // Uploader le PDF (agent de saisie)
  uploadPdf(id: string, fichier: File): Observable<Document> {
    const formData = new FormData();
    formData.append('fichier', fichier);
    return this.http.post<Document>(`${this.apiUrl}/${id}/pdf`, formData);
  }

  // Valider un document (directeur pédagogique)
  valider(id: string): Observable<Document> {
    return this.http.post<Document>(`${this.apiUrl}/${id}/valider`, {});
  }

  // Révoquer un document
  revoquer(id: string, raison: string): Observable<Document> {
    return this.http.post<Document>(`${this.apiUrl}/${id}/revoquer`, { raison });
  }

  // Obtenir le lien de téléchargement du PDF (lien temporaire 15 min)
  getPdfUrl(id: string): Observable<{ url: string; expires_in_seconds: number }> {
    return this.http.get<{ url: string; expires_in_seconds: number }>(`${this.apiUrl}/${id}/pdf`);
  }
}
```

### Utiliser un service dans un composant

```typescript
import { Component, OnInit } from '@angular/core';
import { DocumentsService } from '../../core/services/documents.service';
import { Document } from '../../core/models/document.model';

@Component({
  selector: 'app-liste-diplomes',
  templateUrl: './liste-diplomes.component.html'
})
export class ListeDiplomesComponent implements OnInit {
  diplomes: Document[] = [];
  chargement = false;
  erreur: string | null = null;

  constructor(private documentsService: DocumentsService) {}

  ngOnInit(): void {
    this.chargerDiplomes();
  }

  chargerDiplomes(): void {
    this.chargement = true;
    this.documentsService.lister({ statut: 'actif', page: 1, limit: 20 }).subscribe({
      next: (response) => {
        this.diplomes = response.items;
        this.chargement = false;
      },
      error: (err) => {
        this.erreur = 'Impossible de charger les diplômes';
        this.chargement = false;
      }
    });
  }
}
```

---

## 6. L'intercepteur HTTP

L'intercepteur est un "middleware" Angular - il s'exécute automatiquement avant **chaque** requête HTTP. Sans lui, tu devrais ajouter le token à la main sur chaque appel. Avec lui, c'est automatique.

`src/app/core/interceptors/auth.interceptor.ts` :
```typescript
import { Injectable } from '@angular/core';
import {
  HttpInterceptor, HttpRequest, HttpHandler,
  HttpEvent, HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private enCoursDeRefresh = false;
  private tokenRefreshed$ = new BehaviorSubject<boolean>(false);

  constructor(private authService: AuthService, private router: Router) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // 1. Ajouter le token à la requête
    const token = this.authService.getToken();
    const requeteAvecToken = token
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

    // 2. Envoyer la requête et gérer les erreurs
    return next.handle(requeteAvecToken).pipe(
      catchError((erreur: HttpErrorResponse) => {

        // Token expiré → renouveler automatiquement
        if (erreur.status === 401 && !req.url.includes('/auth/')) {
          return this.gererTokenExpire(req, next);
        }

        // Accès refusé → rediriger vers /403
        if (erreur.status === 403) {
          this.router.navigate(['/403']);
        }

        return throwError(() => erreur);
      })
    );
  }

  private gererTokenExpire(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (this.enCoursDeRefresh) {
      // Si un refresh est déjà en cours, attendre qu'il se termine
      return this.tokenRefreshed$.pipe(
        filter(Boolean),
        take(1),
        switchMap(() => next.handle(this.ajouterToken(req)))
      );
    }

    this.enCoursDeRefresh = true;
    this.tokenRefreshed$.next(false);

    return this.authService.refreshToken().pipe(
      switchMap(() => {
        this.enCoursDeRefresh = false;
        this.tokenRefreshed$.next(true);
        return next.handle(this.ajouterToken(req));
      }),
      catchError((err) => {
        // Refresh échoué → déconnecter
        this.enCoursDeRefresh = false;
        this.authService.logout();
        return throwError(() => err);
      })
    );
  }

  private ajouterToken(req: HttpRequest<any>): HttpRequest<any> {
    const token = this.authService.getToken();
    return token
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;
  }
}
```

### Enregistrer l'intercepteur dans AppModule

```typescript
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { AuthInterceptor } from './core/interceptors/auth.interceptor';

@NgModule({
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    }
  ]
})
export class AppModule { }
```

À partir de maintenant, **toutes** tes requêtes HTTP auront le token automatiquement. Tu n'as plus à y penser.

---

## 7. Les guards

Un guard empêche l'accès à une route si une condition n'est pas remplie. Sans guard, n'importe qui pourrait naviguer vers `/admin` en tapant l'URL directement.

### Guard d'authentification

`src/app/core/guards/auth.guard.ts` :
```typescript
import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(): boolean {
    if (this.authService.estConnecte()) {
      return true;
    }
    this.router.navigate(['/auth/connexion']);
    return false;
  }
}
```

### Guard par rôle

`src/app/core/guards/role.guard.ts` :
```typescript
import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, take } from 'rxjs/operators';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): Observable<boolean> {
    const rolesAutorises: string[] = route.data['roles'] ?? [];

    return this.authService.getUtilisateur().pipe(
      take(1),
      map(user => {
        if (!user) {
          this.router.navigate(['/auth/connexion']);
          return false;
        }
        if (rolesAutorises.includes(user.role.nom)) {
          return true;
        }
        this.router.navigate(['/403']);
        return false;
      })
    );
  }
}
```

### Utiliser les guards dans le routing

`src/app/app-routing.module.ts` :
```typescript
const routes: Routes = [
  // Pages publiques - sans guard
  { path: '', component: LandingComponent },
  { path: 'verifier', component: VerificationComponent },
  { path: 'd/:identifiant', component: ResultatVerificationComponent },

  // Auth
  { path: 'auth/connexion', component: LoginComponent },
  { path: 'auth/activer/:token', component: ActivationCompteComponent },

  // Admin - réservé super_admin
  {
    path: 'admin',
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['super_admin'] },
    children: [
      { path: '', component: AdminDashboardComponent },
      { path: 'universites', component: UniversitesListeComponent },
      { path: 'audit', component: AuditComponent },
    ]
  },

  // Espace université - pour le personnel
  {
    path: 'universite',
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['responsable_universite', 'directeur_pedagogique', 'agent_saisie'] },
    children: [
      { path: '', component: UniversiteDashboardComponent },
      { path: 'diplomes', component: DiplomesListeComponent },
      { path: 'diplomes/:id', component: DiplomeDetailComponent },
    ]
  },

  // Espace étudiant
  {
    path: 'espace',
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['etudiant'] },
    children: [
      { path: '', component: EtudiantDashboardComponent },
    ]
  },

  { path: '403', component: AccesRefuseComponent },
  { path: '**', component: NotFoundComponent }
];
```

---

## 8. Gérer les erreurs

Ne laisse jamais une erreur silencieuse. L'utilisateur doit toujours savoir ce qui s'est passé.

### Service de notification (toasts)

```typescript
// Dans ton composant
validerDiplome(id: string): void {
  this.chargement = true;
  this.documentsService.valider(id).subscribe({
    next: (doc) => {
      this.chargement = false;
      // Afficher un message de succès
      alert(`Diplôme ${doc.numero_unique} validé avec succès !`);
      // Ou utiliser une librairie de toasts comme ngx-toastr
    },
    error: (err) => {
      this.chargement = false;
      // Afficher l'erreur retournée par l'API
      const message = err.error?.message ?? 'Une erreur est survenue';
      alert(message);
    }
  });
}
```

### Lire les erreurs de l'API

L'API retourne toujours les erreurs dans ce format :
```json
{
  "statusCode": 400,
  "message": "PDF manquant - utiliser POST /documents/{id}/pdf d'abord.",
  "error": "Bad Request"
}
```

Pour l'afficher :
```typescript
error: (err: HttpErrorResponse) => {
  const messageErreur = err.error?.message ?? 'Erreur inconnue';
  console.error('Erreur API:', messageErreur);
  this.erreur = messageErreur;
}
```

---

## 9. Exemples concrets

### Page de connexion

```typescript
// login.component.ts
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  template: `
    <form (ngSubmit)="seConnecter()">
      <input [(ngModel)]="email" name="email" type="email" placeholder="Email" />
      <input [(ngModel)]="motDePasse" name="motDePasse" type="password" placeholder="Mot de passe" />
      <p *ngIf="erreur" style="color:red">{{ erreur }}</p>
      <button type="submit" [disabled]="chargement">
        {{ chargement ? 'Connexion...' : 'Se connecter' }}
      </button>
    </form>
  `
})
export class LoginComponent {
  email = '';
  motDePasse = '';
  chargement = false;
  erreur: string | null = null;

  constructor(private authService: AuthService, private router: Router) {}

  seConnecter(): void {
    this.chargement = true;
    this.erreur = null;

    this.authService.login({ email: this.email, mot_de_passe: this.motDePasse }).subscribe({
      next: () => {
        // Rediriger selon le rôle après connexion
        this.authService.getUtilisateur().subscribe(user => {
          const redirections: Record<string, string> = {
            super_admin: '/admin',
            directeur_pedagogique: '/universite/validation',
            agent_saisie: '/universite/diplomes',
            etudiant: '/espace',
          };
          const route = redirections[user?.role?.nom ?? ''] ?? '/';
          this.router.navigate([route]);
        });
      },
      error: (err) => {
        this.chargement = false;
        this.erreur = err.error?.message ?? 'Identifiants incorrects';
      }
    });
  }
}
```

### Upload du PDF par l'agent de saisie

```typescript
// Le template HTML
// <input type="file" (change)="selectionnerFichier($event)" accept=".pdf" />
// <button (click)="uploadPdf()" [disabled]="!fichierSelectionne || chargement">
//   Envoyer le PDF
// </button>

fichierSelectionne: File | null = null;

selectionnerFichier(event: Event): void {
  const input = event.target as HTMLInputElement;
  this.fichierSelectionne = input.files?.[0] ?? null;
}

uploadPdf(): void {
  if (!this.fichierSelectionne) return;
  this.chargement = true;

  this.documentsService.uploadPdf(this.documentId, this.fichierSelectionne).subscribe({
    next: (doc) => {
      this.chargement = false;
      console.log('PDF uploadé, hash:', doc.hash_sha256);
    },
    error: (err) => {
      this.chargement = false;
      this.erreur = err.error?.message;
    }
  });
}
```

### Page de vérification publique (sans connexion)

```typescript
// verification.service.ts - pas de token nécessaire pour les endpoints /verify
verifierParIdentifiant(identifiant: string): Observable<any> {
  return this.http.get(`${environment.apiUrl}/verify/${identifiant}`);
}

verifierParUpload(fichier: File): Observable<any> {
  const formData = new FormData();
  formData.append('fichier', fichier);
  return this.http.post(`${environment.apiUrl}/verify/upload`, formData);
}
```

---

## 10. Checklist de démarrage

Fais ces étapes dans l'ordre avant de commencer à coder les pages.

- [ ] **Lancer le backend** : `docker compose up -d` dans le dossier racine
- [ ] **Ouvrir Swagger** : `http://localhost:3000/api/docs` et tester la connexion
- [ ] **Créer le projet Angular** dans le dossier `frontend/`
- [ ] **Configurer les environments** (dev / prod)
- [ ] **Ajouter HttpClientModule** dans AppModule
- [ ] **Créer les modèles TypeScript** (copier les structures depuis Swagger)
- [ ] **Créer AuthService** avec login / logout / refreshToken / chargerProfil
- [ ] **Créer l'intercepteur** et l'enregistrer dans AppModule
- [ ] **Créer AuthGuard et RoleGuard**
- [ ] **Configurer le routing** avec les guards
- [ ] **Créer la page de connexion** et tester la connexion complète
- [ ] **Vérifier** que le token est bien envoyé dans les requêtes (onglet Réseau des DevTools Chrome)

---

## Questions fréquentes

**Q : Je reçois une erreur CORS, qu'est-ce que ça veut dire ?**

Le backend n'autorise les requêtes que depuis `http://localhost:4200`. Vérifie que ton Angular tourne bien sur ce port (`ng serve --port 4200`) et que `FRONTEND_URL=http://localhost:4200` est bien dans le `.env` du backend.

**Q : Mon token ne fonctionne pas, j'ai une erreur 401.**

Le token JWT expire au bout de 15 minutes. L'intercepteur renouvelle le token automatiquement. Si l'erreur persiste, déconnecte-toi et reconnecte-toi manuellement.

**Q : Comment savoir quels champs envoyer dans un POST ?**

Dans Swagger, chaque endpoint POST montre un "Request body" avec tous les champs attendus. Les champs avec `*` sont obligatoires.

**Q : J'ai une erreur 403 alors que je suis connecté.**

Ton compte n'a pas la permission requise pour cette action. Par exemple, un agent de saisie ne peut pas valider un document (seul le directeur pédagogique peut). Vérifie le rôle du compte de test que tu utilises.

---

*Document généré pour le projet INUBIL Verify - ISTAMA INUBIL, Douala, Cameroun.*
