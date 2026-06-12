import { PartialType, OmitType } from '@nestjs/swagger';
import { CreerEtudiantAdminDto } from './creer-etudiant-admin.dto';

export class UpdateEtudiantAdminDto extends PartialType(
  OmitType(CreerEtudiantAdminDto, ['universite_id'] as const),
) {}
