import { IsString, MinLength } from 'class-validator';

export class RevoquerDocumentDto {
  @IsString()
  @MinLength(10)
  raison: string;
}
