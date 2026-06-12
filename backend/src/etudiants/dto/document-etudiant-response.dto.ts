import { IsIn, IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class DocumentsEtudiantQueryDto {
  @IsOptional()
  @IsIn(['brouillon', 'en_validation', 'actif', 'revoque', 'expire'])
  statut?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}

export class MatiereEtudiantDto {
  nom_matiere: string;
  note: number | null;
  note_max: number;
  resultat: string;
  semestre: number | null;
}

export class DocumentEtudiantDto {
  id: string;
  numero_unique: string;
  type_document: string;
  categorie: string;
  filiere: string | null;
  annee_academique: string | null;
  date_emission: Date | null;
  statut: string;
  mention: string | null;
  moyenne_generale: number | null;
  url_verification: string | null;
  matieres: MatiereEtudiantDto[];
  universite: string;
}

export class DocumentsEtudiantListeDto {
  data: DocumentEtudiantDto[];
  total: number;
  page: number;
  limit: number;
}
