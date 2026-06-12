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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreerMatiereDto {
  @ApiPropertyOptional({ example: 'INFO-301' })
  @IsOptional()
  @IsString()
  code_matiere?: string;

  @ApiProperty({ example: 'Algorithmique et Structures de Données' })
  @IsString()
  nom_matiere: string;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsInt()
  @Min(0)
  credits?: number;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  coefficient?: number;

  @ApiPropertyOptional({ example: 14 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  note?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  note_max?: number;

  @ApiPropertyOptional({ enum: ['valide', 'ajourne', 'absent', 'dispense'], example: 'valide' })
  @IsOptional()
  @IsIn(['valide', 'ajourne', 'absent', 'dispense'])
  resultat?: string;

  @ApiPropertyOptional({ example: 1, minimum: 1, maximum: 6 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(6)
  semestre?: number;

  @ApiPropertyOptional({ example: 'UE Fondamentale' })
  @IsOptional()
  @IsString()
  type_ue?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  ordre?: number;
}

export class CreerDocumentDto {
  @ApiProperty({ format: 'uuid', example: 'b1e2d3f4-0000-0000-0000-000000000001', description: 'ID de l\'étudiant' })
  @IsUUID()
  etudiant_id: string;

  @ApiProperty({ format: 'uuid', example: 'a1b2c3d4-0000-0000-0000-000000000002', description: 'ID du type de document (Licence, Master, etc.)' })
  @IsUUID()
  type_document_id: string;

  @ApiProperty({ example: '2026-06-12', description: 'Date d\'émission officielle du document (ISO 8601)' })
  @IsDateString()
  date_emission: string;

  @ApiPropertyOptional({ example: '2025-2026' })
  @IsOptional()
  @IsString()
  annee_academique?: string;

  @ApiPropertyOptional({ example: 'Douala, Cameroun' })
  @IsOptional()
  @IsString()
  lieu_delivrance?: string;

  @ApiPropertyOptional({ example: 'Licence en Informatique option Génie Logiciel' })
  @IsOptional()
  @IsString()
  filiere?: string;

  @ApiPropertyOptional({ format: 'uuid', example: 'c1d2e3f4-0000-0000-0000-000000000003', description: 'ID de la mention (Très Bien, Bien, etc.)' })
  @IsOptional()
  @IsUUID()
  mention_id?: string;

  @ApiPropertyOptional({ example: 13.5, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  moyenne_generale?: number;

  @ApiPropertyOptional({ example: 20, description: 'Note maximale (barème)' })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  note_sur?: number;

  @ApiPropertyOptional({ example: { promotion: 'Major de promotion' }, description: 'Données supplémentaires libres (JSON)' })
  @IsOptional()
  donnees?: Record<string, any>;

  @ApiPropertyOptional({ type: [CreerMatiereDto], description: 'Liste des matières (pour un relevé de notes)' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreerMatiereDto)
  matieres?: CreerMatiereDto[];
}
