export class ProfilEtudiantDto {
  id: string;
  numero_etudiant: string;
  nom: string;
  prenom: string;
  email: string | null;
  telephone: string | null;
  photo_url: string | null;
  date_naissance: Date | null;
  lieu_naissance: string | null;
  nationalite: string | null;
  annee_entree: number | null;
  universite: string;
  universite_id: string;
  created_at: Date;
}
