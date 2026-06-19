import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { roleGuard } from './core/auth/role.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/auth/connexion', pathMatch: 'full' },

  // Auth (public)
  {
    path: 'auth',
    loadComponent: () => import('./shared/layouts/auth-layout/auth-layout').then(m => m.AuthLayout),
    children: [
      { path: 'connexion',            loadComponent: () => import('./features/auth/login/login').then(m => m.LoginPage) },
      { path: 'mot-de-passe-oublier', loadComponent: () => import('./features/auth/forgot-password/forgot-password').then(m => m.ForgotPasswordPage) },
      { path: 'reinitialiser/:token', loadComponent: () => import('./features/auth/reset-password/reset-password').then(m => m.ResetPasswordPage) },
      { path: 'activer/:token',       loadComponent: () => import('./features/auth/activation/activation').then(m => m.ActivationPage) },
    ],
  },

  // Vérification publique
  {
    path: 'verifier',
    loadComponent: () => import('./shared/layouts/public-layout/public-layout').then(m => m.PublicLayout),
    children: [
      { path: '',      loadComponent: () => import('./features/verification/recherche/recherche').then(m => m.RecherchePage) },
      { path: 'd/:id', loadComponent: () => import('./features/verification/resultat/resultat').then(m => m.ResultatPage) },
    ],
  },

  // Admin
  {
    path: 'admin',
    canActivate: [authGuard, roleGuard(['super_admin', 'admin_istama'])],
    loadComponent: () => import('./shared/layouts/app-layout/app-layout').then(m => m.AppLayout),
    children: [
      { path: '',                     loadComponent: () => import('./features/admin/dashboard/dashboard').then(m => m.AdminDashboardPage) },
      { path: 'universites',          loadComponent: () => import('./features/admin/universites/liste/liste').then(m => m.UniversitesListePage) },
      { path: 'universites/nouvelle', loadComponent: () => import('./features/admin/universites/form/form').then(m => m.UniversiteFormPage) },
      { path: 'universites/:id',      loadComponent: () => import('./features/admin/universites/detail/detail').then(m => m.UniversiteDetailPage) },
      { path: 'utilisateurs',         loadComponent: () => import('./features/admin/utilisateurs/liste/liste').then(m => m.UtilisateursListePage) },
      { path: 'utilisateurs/nouveau', loadComponent: () => import('./features/admin/utilisateurs/form/form').then(m => m.UtilisateurFormPage) },
      { path: 'audit',                loadComponent: () => import('./features/admin/audit/audit').then(m => m.AuditPage) },
    ],
  },

  // Université
  {
    path: 'universite',
    canActivate: [authGuard, roleGuard(['responsable_universite', 'directeur_pedagogique', 'agent_saisie'])],
    loadComponent: () => import('./shared/layouts/app-layout/app-layout').then(m => m.AppLayout),
    children: [
      { path: '',                 loadComponent: () => import('./features/universite/dashboard/dashboard').then(m => m.UniversiteDashboardPage) },
      { path: 'diplomes',         loadComponent: () => import('./features/universite/diplomes/liste/liste').then(m => m.DiplomesListePage) },
      { path: 'diplomes/nouveau', loadComponent: () => import('./features/universite/diplomes/nouveau/nouveau').then(m => m.NouveauDiplomePage) },
      { path: 'diplomes/:id',     loadComponent: () => import('./features/universite/diplomes/detail/detail').then(m => m.DiplomeDetailPage) },
      { path: 'validation',       loadComponent: () => import('./features/universite/validation/validation').then(m => m.ValidationPage) },
      { path: 'agents',           loadComponent: () => import('./features/universite/agents/agents').then(m => m.AgentsPage) },
      { path: 'parametres',       loadComponent: () => import('./features/universite/parametres/parametres').then(m => m.ParametresPage) },
    ],
  },

  // Espace étudiant
  {
    path: 'espace',
    canActivate: [authGuard, roleGuard(['etudiant'])],
    loadComponent: () => import('./shared/layouts/app-layout/app-layout').then(m => m.AppLayout),
    children: [
      { path: '',                      loadComponent: () => import('./features/etudiant/dashboard/dashboard').then(m => m.EtudiantDashboardPage) },
      { path: 'diplomes/:id',          loadComponent: () => import('./features/etudiant/detail/detail').then(m => m.EtudiantDetailPage) },
      { path: 'diplomes/:id/partager', loadComponent: () => import('./features/etudiant/partage/partage').then(m => m.PartagerPage) },
      { path: 'partages',              loadComponent: () => import('./features/etudiant/mes-partages/mes-partages').then(m => m.MesPartagesPage) },
    ],
  },

  // Profil
  {
    path: 'profil',
    canActivate: [authGuard],
    loadComponent: () => import('./shared/layouts/app-layout/app-layout').then(m => m.AppLayout),
    children: [
      { path: '',         loadComponent: () => import('./features/profil/compte/compte').then(m => m.ComptePage) },
      { path: 'sessions', loadComponent: () => import('./features/profil/sessions/sessions').then(m => m.SessionsPage) },
    ],
  },

  // Erreurs
  { path: '403', loadComponent: () => import('./features/errors/forbidden').then(m => m.ForbiddenPage) },
  { path: '**',  loadComponent: () => import('./features/errors/not-found').then(m => m.NotFoundPage) },
];
