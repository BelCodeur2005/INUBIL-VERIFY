import {
  IsString,
  IsOptional,
  IsArray,
  IsDateString,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreerCleApiDto {
  @ApiProperty({ example: 'Integration ERP RH', maxLength: 100 })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  nom: string;

  @ApiPropertyOptional({
    example: ['verify:read', 'doc:read'],
    description: 'Liste de permissions accordées à cette clé',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];

  @ApiPropertyOptional({
    example: '2027-01-01T00:00:00.000Z',
    description: "Date d'expiration (null = jamais)",
  })
  @IsOptional()
  @IsDateString()
  expiration?: string;

  @ApiPropertyOptional({
    example: ['192.168.1.0/24'],
    description: 'IPs autorisées (liste vide = toutes)',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ip_whitelist?: string[];
}
