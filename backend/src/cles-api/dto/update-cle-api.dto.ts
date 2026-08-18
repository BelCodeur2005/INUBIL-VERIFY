import {
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  IsDateString,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCleApiDto {
  @ApiPropertyOptional({ example: 'Integration ERP RH v2', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  nom?: string;

  @ApiPropertyOptional({ example: ['verify:read'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  est_active?: boolean;

  @ApiPropertyOptional({ example: '2027-01-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  expiration?: string;

  @ApiPropertyOptional({ example: ['10.0.0.0/8'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ip_whitelist?: string[];
}
