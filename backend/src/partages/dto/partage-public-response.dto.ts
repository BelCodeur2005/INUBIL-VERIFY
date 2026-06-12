export class MatierePartageDto {
  nom_matiere: string;
  note: number | null;
  note_max: number;
  resultat: string;
  semestre: number | null;
}

export class DocumentPartageDto {
  numero_unique: string;
  type_document: string;
  categorie: string;
  filiere: string | null;
  annee_academique: string | null;
  date_emission: Date;
  etudiant_nom: string;
  mention: string | null;
  moyenne_generale: number | null;
  matieres: MatierePartageDto[];
  universite: string;
  statut: string;
  url_verification: string | null;
}

export class PartagePublicResponseDto {
  document: DocumentPartageDto;
  partage: {
    date_expiration: Date | null;
    nb_consultations: number;
  };
}
