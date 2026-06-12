import { Module } from '@nestjs/common';
import { HashService } from './hash.service';
import { PdfService } from './pdf.service';
import { QrCodeService } from './qr-code.service';

/**
 * Module documents — regroupe les services utilitaires de l'émission de diplômes.
 * Sera enrichi avec le CRUD documents, la révocation et les notifications (#24, #51, #25).
 */
@Module({
  providers: [HashService, PdfService, QrCodeService],
  exports: [HashService, PdfService, QrCodeService],
})
export class DocumentsModule {}
