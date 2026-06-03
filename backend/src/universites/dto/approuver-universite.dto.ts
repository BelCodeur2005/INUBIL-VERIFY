import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class ApprouverUniversiteDto {
  @ApiPropertyOptional({
    description: 'Raison du rejet (obligatoire uniquement pour POST /rejeter).',
    example: 'Documents incomplets — merci de fournir le decret ministeriel.',
  })
  @IsOptional()
  @IsString()
  @MinLength(10, { message: 'La raison doit contenir au moins 10 caracteres' })
  raison_rejet?: string;
}
