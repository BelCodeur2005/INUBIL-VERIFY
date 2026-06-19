export type StatutDocument =
  | 'brouillon'
  | 'en_validation'
  | 'actif'
  | 'revoque'
  | 'rejete';

export type TypeDocument =
  | 'bts'
  | 'licence_pro'
  | 'licence_academique'
  | 'master'
  | 'ingenieur';

export interface Document {
  id: string;
  numero_unique: string;
  statut: StatutDocument;
  type_document: string;
  filiere: string;
  annee_academique: string;
  date_emission: string;
  moyenne_generale: string;
  note_sur: string;
  mention_id: string;
  universite_id: string;
  etudiant_id: string;
  pdf_url: string | null;
  pdf_taille_ko: number | null;
  hash_sha256: string | null;
  qr_code_url: string | null;
  transaction_hash: string | null;
  bloc_numero: string | null;
  reseau: string | null;
  adresse_contrat: string | null;
  motif_rejet: string | null;
  motif_revocation: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentListItem {
  id: string;
  numero_unique: string;
  statut: StatutDocument;
  type_document: string;
  filiere: string;
  date_emission: string;
  etudiant_nom: string;
  etudiant_prenom: string;
  transaction_hash: string | null;
}

export const STATUT_LABELS: Record<StatutDocument, string> = {
  brouillon: 'Brouillon',
  en_validation: 'En validation',
  actif: 'Actif',
  revoque: 'Révoqué',
  rejete: 'Rejeté',
};
