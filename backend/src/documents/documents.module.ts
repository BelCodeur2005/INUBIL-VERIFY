import { Module } from '@nestjs/common';
import { HashService } from './hash.service';
import { PdfService } from './pdf.service';
import { QrCodeService } from './qr-code.service';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { NotificationEmissionService } from './notification-emission.service';
import { AuditModule } from '../audit/audit.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [AuditModule, MailModule],
  controllers: [DocumentsController],
  providers: [DocumentsService, NotificationEmissionService, HashService, PdfService, QrCodeService],
  exports: [DocumentsService, NotificationEmissionService, HashService, PdfService, QrCodeService],
})
export class DocumentsModule {}
