import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'admin@inubil.com', description: 'Email du compte a reinitialiser.' })
  @IsEmail({}, { message: 'Email invalide' })
  email: string;
}
