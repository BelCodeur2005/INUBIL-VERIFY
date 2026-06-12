import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface IpfsUploadResult {
  cid: string;
  url: string;
}

@Injectable()
export class IpfsService {
  private readonly logger = new Logger(IpfsService.name);
  private readonly apiKey: string;
  private readonly secretKey: string;
  private readonly gateway: string;
  readonly configured: boolean;

  constructor(private readonly config: ConfigService) {
    this.apiKey    = config.get<string>('PINATA_API_KEY', '');
    this.secretKey = config.get<string>('PINATA_SECRET_KEY', '');
    this.gateway   = config.get<string>('PINATA_GATEWAY', 'https://gateway.pinata.cloud');
    this.configured = !!(this.apiKey && this.secretKey);

    if (!this.configured) {
      this.logger.warn(
        'PINATA_API_KEY / PINATA_SECRET_KEY non configurés — uploads IPFS désactivés',
      );
    }
  }

  /**
   * Upload un fichier sur IPFS via Pinata.
   * Retourne null si les clés ne sont pas configurées (dégradation gracieuse).
   * Réessaie jusqu'à 3 fois avec backoff exponentiel (1s → 2s → 4s).
   */
  async uploadFile(
    buffer: Buffer,
    filename: string,
    mimeType: string,
  ): Promise<IpfsUploadResult | null> {
    if (!this.configured) return null;
    return this.avecRetry(() => this.doUpload(buffer, filename, mimeType));
  }

  private async doUpload(
    buffer: Buffer,
    filename: string,
    mimeType: string,
  ): Promise<IpfsUploadResult> {
    const formData = new FormData();
    const arrayBuffer = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength,
    ) as ArrayBuffer;
    formData.append('file', new Blob([arrayBuffer], { type: mimeType }), filename);

    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        pinata_api_key: this.apiKey,
        pinata_secret_api_key: this.secretKey,
      },
      body: formData,
    });

    if (!response.ok) {
      const texte = await response.text();
      throw new Error(`Pinata ${response.status}: ${texte}`);
    }

    const data = (await response.json()) as { IpfsHash: string };
    const cid = data.IpfsHash;
    return { cid, url: `${this.gateway}/ipfs/${cid}` };
  }

  private async avecRetry<T>(
    fn: () => Promise<T>,
    tentatives = 3,
    delaiMs = 1000,
  ): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      if (tentatives <= 1) throw err;
      this.logger.warn(
        `Upload IPFS échoué, retry dans ${delaiMs}ms (${tentatives - 1} tentative(s) restante(s))`,
      );
      await new Promise((r) => setTimeout(r, delaiMs));
      return this.avecRetry(fn, tentatives - 1, delaiMs * 2);
    }
  }
}
