import { IsOptional, IsUUID, IsIn, IsISO8601 } from 'class-validator';
import { Type } from 'class-transformer';
import { IsNumber, Min } from 'class-validator';

export class DocumentQueryDto {
  @IsOptional()
  @IsIn(['brouillon', 'en_validation', 'actif', 'revoque', 'expire'])
  statut?: string;

  @IsOptional()
  @IsUUID()
  universite_id?: string;

  @IsOptional()
  @IsUUID()
  etudiant_id?: string;

  @IsOptional()
  @IsUUID()
  type_document_id?: string;

  @IsOptional()
  @IsISO8601()
  date_debut?: string;

  @IsOptional()
  @IsISO8601()
  date_fin?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 20;
}
