import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ChangerStatutDto {
  @ApiPropertyOptional({
    description: 'Raison optionnelle (ex: motif de suspension).',
    example: 'Non-conformite aux normes MINESUP detectee lors du controle annuel.',
  })
  @IsOptional()
  @IsString()
  raison?: string;
}
