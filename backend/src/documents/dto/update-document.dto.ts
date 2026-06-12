import { PartialType, OmitType } from '@nestjs/swagger';
import { CreerDocumentDto } from './creer-document.dto';

export class UpdateDocumentDto extends PartialType(
  OmitType(CreerDocumentDto, ['etudiant_id', 'type_document_id'] as const),
) {}
