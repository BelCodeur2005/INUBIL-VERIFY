import {
  IsUUID,
  IsOptional,
  IsEmail,
  IsDateString,
  ValidateIf,
} from 'class-validator';

export class CreerPartageDto {
  @IsUUID()
  document_id: string;

  @IsOptional()
  @IsEmail()
  email_destinataire?: string;

  @IsOptional()
  @IsUUID()
  universite_destinataire_id?: string;

  @IsOptional()
  @IsDateString()
  @ValidateIf((o) => o.date_expiration !== undefined)
  date_expiration?: string;
}
