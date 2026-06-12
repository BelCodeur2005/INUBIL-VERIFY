export class MatierePublicDto {
  nom_matiere: string;
  note: number | null;
  note_max: number;
  resultat: string;
  semestre: number | null;
}

export class DocumentPublicDto {
  numero_unique: string;
  url_verification: string | null;

  // Identité du document
  type_document: string;
  categorie: string;
  filiere: string | null;
  annee_academique: string | null;
  date_emission: Date;

  // Identité de l'étudiant (données présentes sur le diplôme physique)
  etudiant_nom: string;

  // Résultat académique — à comparer avec ce qui est imprimé sur le papier
  mention: string | null;
  moyenne_generale: number | null;

  // Matières (relevés de notes uniquement)
  matieres: MatierePublicDto[];

  // Émetteur
  universite: string;
  statut: string;

  /**
   * Indique qu'une vérification cryptographique forte est disponible.
   * POST /verify/upload — prouve que le fichier n'a pas été modifié.
   */
  verifiable_par_upload: true;
}

export class VerifyResponseDto {
  resultat: 'authentique' | 'revoque' | 'non_trouve' | 'falsifie';
  message: string;
  conseil_verification: string;
  document: DocumentPublicDto | null;
  verification_id: string;
  verifie_le: Date;
}
