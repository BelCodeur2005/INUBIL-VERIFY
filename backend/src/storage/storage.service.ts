import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface StorageUploadResult {
  key: string;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client | null = null;
  private readonly bucket: string;
  readonly configured: boolean;

  private readonly useR2: boolean;

  constructor(private readonly config: ConfigService) {
    const accessKeyId     = config.get<string>('AWS_ACCESS_KEY_ID', '');
    const secretAccessKey = config.get<string>('AWS_SECRET_ACCESS_KEY', '');
    const region          = config.get<string>('AWS_REGION', 'auto');
    const accountId       = config.get<string>('CLOUDFLARE_ACCOUNT_ID', '');
    this.bucket           = config.get<string>('AWS_S3_BUCKET', '');

    this.configured = !!(accessKeyId && secretAccessKey && this.bucket);
    this.useR2      = !!accountId;

    if (this.configured) {
      this.client = new S3Client({
        region,
        credentials: { accessKeyId, secretAccessKey },
        // Si CLOUDFLARE_ACCOUNT_ID est renseigné → Cloudflare R2, sinon → AWS S3
        ...(this.useR2 && {
          endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        }),
      });
      this.logger.log(
        this.useR2
          ? `Stockage Cloudflare R2 configuré - bucket : ${this.bucket}`
          : `Stockage AWS S3 configuré - bucket : ${this.bucket}`,
      );
    } else {
      this.logger.warn(
        'AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_S3_BUCKET non configurés - stockage désactivé',
      );
    }
  }

  /**
   * Upload un fichier sur S3.
   * Retourne null si S3 non configuré (dégradation gracieuse).
   * Réessaie jusqu'à 3 fois avec backoff exponentiel.
   */
  async uploadFile(
    buffer: Buffer,
    key: string,
    mimeType: string,
  ): Promise<StorageUploadResult | null> {
    if (!this.configured || !this.client) return null;
    return this.avecRetry(() => this.doUpload(buffer, key, mimeType));
  }

  /**
   * Génère un lien pré-signé temporaire pour accéder à un fichier privé.
   * Par défaut valable 15 minutes.
   */
  async getPresignedUrl(key: string, expiresInSeconds = 900): Promise<string | null> {
    if (!this.configured || !this.client) return null;
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }

  /**
   * Supprime un fichier du bucket (utilisé pour le droit à l'oubli).
   */
  async deleteFile(key: string): Promise<void> {
    if (!this.configured || !this.client) return;
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  private async doUpload(
    buffer: Buffer,
    key: string,
    mimeType: string,
  ): Promise<StorageUploadResult> {
    await this.client!.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        // R2 : les buckets sont privés par défaut, ACL non supporté
        // AWS S3 : ACL 'private' ajouté uniquement si pas R2
        ...(!this.useR2 && { ACL: 'private' }),
      }),
    );
    return { key };
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
        `Upload S3 échoué, retry dans ${delaiMs}ms (${tentatives - 1} tentative(s) restante(s))`,
      );
      await new Promise((r) => setTimeout(r, delaiMs));
      return this.avecRetry(fn, tentatives - 1, delaiMs * 2);
    }
  }
}
