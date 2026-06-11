import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ResendVerificationDto {
  @ApiProperty({
    example: 'john.doe@inubil.com',
    description: 'Email du compte dont on souhaite renvoyer la verification.',
  })
  @IsEmail({}, { message: 'Email invalide' })
  email: string;
}
