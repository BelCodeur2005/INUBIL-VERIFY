export class MatiereResponseDto {
  id: string;
  code_matiere: string | null;
  nom_matiere: string;
  credits: number;
  coefficient: number;
  note: number | null;
  note_max: number;
  resultat: string;
  semestre: number | null;
  type_ue: string | null;
  ordre: number;
}

export class DocumentResponseDto {
  id: string;
  numero_unique: string;
  url_verification: string | null;
  etudiant_id: string;
  universite_id: string;
  type_document_id: string;
  annee_academique: string | null;
  date_emission: Date;
  lieu_delivrance: string | null;
  filiere: string | null;
  mention_id: string | null;
  moyenne_generale: number | null;
  note_sur: number;
  hash_sha256: string | null;
  cid_ipfs: string | null;
  transaction_hash: string | null;
  qr_code_url: string | null;
  pdf_url: string | null;
  pdf_taille_ko: number | null;
  statut: string;
  saisi_par: string | null;
  valide_par: string | null;
  valide_le: Date | null;
  emis_le: Date | null;
  donnees: any;
  matieres: MatiereResponseDto[];
  created_at: Date;
  updated_at: Date;
}
