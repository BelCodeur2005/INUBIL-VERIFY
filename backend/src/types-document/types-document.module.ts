import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { TypesDocumentController } from './types-document.controller';
import { TypesDocumentService } from './types-document.service';

@Module({
  imports: [AuditModule],
  controllers: [TypesDocumentController],
  providers: [TypesDocumentService],
  exports: [TypesDocumentService],
})
export class TypesDocumentModule {}
