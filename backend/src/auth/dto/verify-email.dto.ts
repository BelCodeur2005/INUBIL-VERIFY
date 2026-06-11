import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({
    description: 'Token de verification recu par email (64 caracteres hex).',
    example: 'a1b2c3d4...',
  })
  @IsString()
  @Length(1, 128)
  token: string;
}
