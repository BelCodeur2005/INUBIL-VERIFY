import { Module } from '@nestjs/common';
import { HashService } from './hash.service';
import { PdfService } from './pdf.service';
import { QrCodeService } from './qr-code.service';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [DocumentsController],
  providers: [DocumentsService, HashService, PdfService, QrCodeService],
  exports: [DocumentsService, HashService, PdfService, QrCodeService],
})
export class DocumentsModule {}
