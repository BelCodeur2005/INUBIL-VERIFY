import { Module } from '@nestjs/common';
import { HashService } from './hash.service';
import { PdfService } from './pdf.service';
import { QrCodeService } from './qr-code.service';
import { RapportVerificationPdfService } from './rapport-verification-pdf.service';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { NotificationEmissionService } from './notification-emission.service';
import { AuditModule } from '../audit/audit.module';
import { MailModule } from '../mail/mail.module';
import { StorageModule } from '../storage/storage.module';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { ConfigurationsModule } from '../configurations/configurations.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AuditModule, MailModule, StorageModule, BlockchainModule, ConfigurationsModule, NotificationsModule],
  controllers: [DocumentsController],
  providers: [DocumentsService, NotificationEmissionService, HashService, PdfService, QrCodeService, RapportVerificationPdfService],
  exports: [DocumentsService, NotificationEmissionService, HashService, PdfService, QrCodeService, RapportVerificationPdfService],
})
export class DocumentsModule {}
