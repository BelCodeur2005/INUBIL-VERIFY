import { Injectable } from '@nestjs/common';
import * as QRCode from 'qrcode';

@Injectable()
export class QrCodeService {
  /**
   * Génère un QR code PNG pointant vers l'URL de vérification publique du diplôme.
   * Retourne un Buffer PNG prêt à être embarqué dans le PDF ou uploadé sur le stockage S3/R2.
   * Format URL attendu : https://verify.inubil.com/d/{numero_unique}
   */
  async generateQr(url: string): Promise<Buffer> {
    return QRCode.toBuffer(url, {
      type: 'png',
      width: 300,
      margin: 2,
      color: { dark: '#1a1a2e', light: '#ffffff' },
      errorCorrectionLevel: 'H',
    }) as Promise<Buffer>;
  }
}
