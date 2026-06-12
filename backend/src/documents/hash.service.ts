import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';

@Injectable()
export class HashService {
  /**
   * Calcule le SHA-256 d'un buffer et retourne la représentation hexadécimale (64 chars).
   * Utilisé pour fingerprinter le PDF généré avant stockage dans documents.hash_sha256.
   */
  calculateHash(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex');
  }
}
