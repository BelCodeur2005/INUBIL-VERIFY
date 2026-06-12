import {
  IsUUID,
  IsOptional,
  IsString,
  IsDateString,
  IsNumber,
  IsPositive,
  IsArray,
  ValidateNested,
  IsIn,
  Min,
  Max,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreerMatiereDto {
  @IsOptional()
  @IsString()
  code_matiere?: string;

  @IsString()
  nom_matiere: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  credits?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  coefficient?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  note?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  note_max?: number;

  @IsOptional()
  @IsIn(['valide', 'ajourne', 'absent', 'dispense'])
  resultat?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(6)
  semestre?: number;

  @IsOptional()
  @IsString()
  type_ue?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  ordre?: number;
}

export class CreerDocumentDto {
  @IsUUID()
  etudiant_id: string;

  @IsUUID()
  type_document_id: string;

  @IsDateString()
  date_emission: string;

  @IsOptional()
  @IsString()
  annee_academique?: string;

  @IsOptional()
  @IsString()
  lieu_delivrance?: string;

  @IsOptional()
  @IsString()
  filiere?: string;

  @IsOptional()
  @IsUUID()
  mention_id?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  moyenne_generale?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  note_sur?: number;

  @IsOptional()
  donnees?: Record<string, any>;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreerMatiereDto)
  matieres?: CreerMatiereDto[];
}
