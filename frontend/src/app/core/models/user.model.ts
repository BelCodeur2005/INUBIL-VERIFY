export type Role =
  | 'super_admin'
  | 'admin_istama'
  | 'responsable_universite'
  | 'directeur_pedagogique'
  | 'agent_saisie'
  | 'etudiant'
  | 'employeur'
  | 'autre_universite';

export interface Utilisateur {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  role: Role;
  universite_id?: string;
  universite_nom?: string;
  avatar_url?: string;
  actif: boolean;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  utilisateur: Utilisateur;
}

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: 'Super Administrateur',
  admin_istama: 'Admin ISTAMA',
  responsable_universite: 'Responsable Université',
  directeur_pedagogique: 'Directeur Pédagogique',
  agent_saisie: 'Agent de Saisie',
  etudiant: 'Étudiant',
  employeur: 'Employeur',
  autre_universite: 'Autre Université',
};

export const ROLE_DASHBOARDS: Record<Role, string> = {
  super_admin: '/admin',
  admin_istama: '/admin',
  responsable_universite: '/universite',
  directeur_pedagogique: '/universite/validation',
  agent_saisie: '/universite/diplomes',
  etudiant: '/espace',
  employeur: '/historique',
  autre_universite: '/historique',
};
