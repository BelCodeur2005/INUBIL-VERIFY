import { IsString, Length, Matches } from 'class-validator';

export class VerifierHashDto {
  @IsString()
  @Length(64, 64)
  @Matches(/^[0-9a-f]{64}$/, { message: 'Le hash doit être un SHA-256 hexadécimal de 64 caractères' })
  hash: string;
}
