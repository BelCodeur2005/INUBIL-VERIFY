import { IsString, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifierHashDto {
  @ApiProperty({
    example: 'a3f9c2d1e8b74f560ab12c3d4e5f6789a3f9c2d1e8b74f560ab12c3d4e5f6789',
    description: 'SHA-256 du fichier PDF, en hexadécimal (64 caractères)',
    minLength: 64,
    maxLength: 64,
  })
  @IsString()
  @Length(64, 64)
  @Matches(/^[0-9a-f]{64}$/, { message: 'Le hash doit être un SHA-256 hexadécimal de 64 caractères' })
  hash: string;
}
