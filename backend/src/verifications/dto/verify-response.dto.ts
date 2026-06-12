export class DocumentPublicDto {
  numero_unique: string;
  url_verification: string | null;
  type_document: string;
  categorie: string;
  filiere: string | null;
  date_emission: Date;
  universite: string;
  etudiant_nom: string;
  statut: string;
}

export class VerifyResponseDto {
  resultat: 'authentique' | 'revoque' | 'non_trouve' | 'falsifie';
  message: string;
  document: DocumentPublicDto | null;
  verification_id: string;
  verifie_le: Date;
}
