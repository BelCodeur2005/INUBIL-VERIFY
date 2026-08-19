import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { roleGuard } from './core/auth/role.guard';

export const routes: Routes = [
  // =========================================================================
  // 1. ESPACE AUTHENTIFICATION & PUBLIC
  // =========================================================================
  {
    path: 'auth',
    loadComponent: () => import('./shared/layouts/auth-layout/auth-layout').then(m => m.AuthLayoutComponent),
    children: [
      {
        path: 'login',
        loadComponent: () => import('./features/auth/login/login').then(m => m.LoginComponent)
      },
      {
        path: 'forgot-password',
        loadComponent: () => import('./features/auth/forgot-password/forgot-password').then(m => m.ForgotPasswordComponent)
      },
      {
        path: 'reset-password',
        loadComponent: () => import('./features/auth/reset-password/reset-password').then(m => m.ResetPasswordComponent)
      },
      {
        path: 'activation',
        loadComponent: () => import('./features/auth/activation/activation').then(m => m.ActivationComponent)
      },
      { path: '', redirectTo: 'login', pathMatch: 'full' }
    ]
  },

  // =========================================================================
  // 2. ESPACE ADMINISTRATION (Super Admin & Admin ISTAMA)
  // =========================================================================
  {
    path: 'admin',
    loadComponent: () => import('./shared/layouts/app-layout/app-layout').then(m => m.AppLayoutComponent),
    canActivate: [authGuard, roleGuard(['super_admin', 'admin_istama'])],
    children: [
      {
        path: '',
        loadComponent: () => import('./features/admin/dashboard/dashboard').then(m => m.DashboardComponent)
      },
      {
        path: 'universites',
        children: [
          {
            path: '',
            loadComponent: () => import('./features/admin/universites/liste/liste').then(m => m.ListeComponent)
          },
          {
            path: 'nouveau',
            loadComponent: () => import('./features/admin/universites/form/form').then(m => m.FormComponent)
          },
          {
            path: 'modifier/:id',
            loadComponent: () => import('./features/admin/universites/form/form').then(m => m.FormComponent)
          },
          {
            path: 'detail/:id',
            loadComponent: () => import('./features/admin/universites/detail/detail').then(m => m.DetailComponent)
          }
        ]
      },
      {
        path: 'utilisateurs',
        children: [
          {
            path: '',
            loadComponent: () => import('./features/admin/utilisateurs/liste/liste').then(m => m.ListeComponent)
          },
          {
            path: 'nouveau',
            loadComponent: () => import('./features/admin/utilisateurs/form/form').then(m => m.FormComponent)
          }
        ]
      },
      {
        path: 'audit',
        loadComponent: () => import('./features/admin/audit/audit').then(m => m.AuditComponent)
      }
    ]
  },

  // =========================================================================
  // 3. ESPACE INSTITUTIONNEL / UNIVERSITÉ
  // =========================================================================
  {
    path: 'universite',
    loadComponent: () => import('./shared/layouts/app-layout/app-layout').then(m => m.AppLayoutComponent),
    canActivate: [authGuard, roleGuard(['responsable_universite', 'directeur_pedagogique', 'agent_saisie'])],
    children: [
      {
        path: '',
        loadComponent: () => import('./features/universite/dashboard/dashboard').then(m => m.DashboardComponent)
      },
      {
        path: 'diplomes',
        children: [
          {
            path: '',
            loadComponent: () => import('./features/universite/diplomes/liste/liste').then(m => m.ListeComponent)
          },
          {
            path: 'nouveau',
            loadComponent: () => import('./features/universite/diplomes/nouveau/nouveau').then(m => m.NouveauComponent)
          },
          {
            path: 'detail/:id',
            loadComponent: () => import('./features/universite/diplomes/detail/detail').then(m => m.DetailComponent)
          }
        ]
      },
      {
        path: 'validation',
        loadComponent: () => import('./features/universite/validation/validation').then(m => m.ValidationComponent),
        canActivate: [roleGuard(['responsable_universite', 'directeur_pedagogique'])]
      },
      {
        path: 'agents',
        loadComponent: () => import('./features/universite/agents/agents').then(m => m.AgentsComponent),
        canActivate: [roleGuard(['responsable_universite'])]
      },
      {
        path: 'parametres',
        loadComponent: () => import('./features/universite/parametres/parametres').then(m => m.ParametresComponent)
      }
    ]
  },

  // =========================================================================
  // 4. ESPACE ÉTUDIANT
  // =========================================================================
  {
    path: 'espace',
    loadComponent: () => import('./shared/layouts/app-layout/app-layout').then(m => m.AppLayoutComponent),
    canActivate: [authGuard, roleGuard(['etudiant'])],
    children: [
      {
        path: '',
        loadComponent: () => import('./features/etudiant/dashboard/dashboard').then(m => m.DashboardComponent)
      },
      {
        path: 'diplome',
        loadComponent: () => import('./features/etudiant/detail/detail').then(m => m.DetailComponent)
      },
      {
        path: 'partager',
        loadComponent: () => import('./features/etudiant/partage/partage').then(m => m.PartageComponent)
      },
      {
        path: 'mes-partages',
        loadComponent: () => import('./features/etudiant/mes-partages/mes-partages').then(m => m.MesPartagesComponent)
      }
    ]
  },

  // =========================================================================
  // 5. ESPACE RECHERCHE & HISTORIQUE
  // =========================================================================
  {
    path: 'verification',
    loadComponent: () => import('./shared/layouts/public-layout/public-layout').then(m => m.PublicLayoutComponent),
    children: [
      {
        path: 'recherche',
        loadComponent: () => import('./features/verification/recherche/recherche').then(m => m.RechercheComponent)
      },
      {
        path: 'resultat/:id',
        loadComponent: () => import('./features/verification/resultat/resultat').then(m => m.ResultatComponent)
      }
    ]
  },
  {
    path: 'historique',
    loadComponent: () => import('./shared/layouts/app-layout/app-layout').then(m => m.AppLayoutComponent),
    canActivate: [authGuard, roleGuard(['employeur', 'autre_universite'])],
    loadComponent: () => import('./features/verification/historique/historique').then(m => m.HistoriqueComponent)
  },

  // =========================================================================
  // 6. GESTION DU PROFIL GLOBALE
  // =========================================================================
  {
    path: 'profil',
    loadComponent: () => import('./shared/layouts/app-layout/app-layout').then(m => m.AppLayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'compte',
        loadComponent: () => import('./features/profil/compte/compte').then(m => m.CompteComponent)
      },
      {
        path: 'sessions',
        loadComponent: () => import('./features/profil/sessions/sessions').then(m => m.SessionsComponent)
      }
    ]
  },

  // =========================================================================
  // 7. PAGES D'ERREURS & REDIRECTIONS FINALES
  // =========================================================================
  {
    path: '403',
    loadComponent: () => import('./features/errors/forbidden').then(m => m.ForbiddenComponent)
  },
  {
    path: '404',
    loadComponent: () => import('./features/errors/not-found').then(m => m.NotFoundComponent)
  },
  {
    path: '',
    redirectTo: 'auth/login',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: '404'
  }
];