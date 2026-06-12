import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HashService } from '../documents/hash.service';
import { VerifyResponseDto, DocumentPublicDto } from './dto/verify-response.dto';

@Injectable()
export class PublicVerifyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hash: HashService,
  ) {}

  // ─── Points d'entrée publics ──────────────────────────────────────────

  /** Vérifie par numéro unique (INUB-2026-0001) — type : lien_unique */
  async verifierParIdentifiant(
    identifiant: string,
    ip?: string,
    userAgent?: string,
  ): Promise<VerifyResponseDto> {
    const doc = await this.chargerDocument({ numero_unique: identifiant });
    const resultat = this.evaluerStatut(doc);
    return this.construireReponse(resultat, doc, null, 'lien_unique', ip, userAgent);
  }

  /** Vérifie par hash SHA-256 soumis directement — type : hash */
  async verifierParHash(
    hashSoumis: string,
    ip?: string,
    userAgent?: string,
  ): Promise<VerifyResponseDto> {
    const doc = await this.chargerDocument({ hash_sha256: hashSoumis });
    const resultat = this.evaluerStatut(doc);
    return this.construireReponse(resultat, doc, hashSoumis, 'hash', ip, userAgent);
  }

  /** Vérifie par upload PDF — calcule le hash côté serveur — type : upload_pdf */
  async verifierParUpload(
    pdfBuffer: Buffer,
    ip?: string,
    userAgent?: string,
  ): Promise<VerifyResponseDto> {
    const hashCalcule = this.hash.calculateHash(pdfBuffer);
    const doc = await this.chargerDocument({ hash_sha256: hashCalcule });
    const resultat = this.evaluerStatut(doc);
    return this.construireReponse(resultat, doc, hashCalcule, 'upload_pdf', ip, userAgent);
  }

  // ─── Helpers privés ──────────────────────────────────────────────────

  private async chargerDocument(where: Record<string, string>) {
    return this.prisma.documents.findFirst({
      where: { ...where, deleted_at: null },
      include: {
        etudiants: { select: { prenom: true, nom: true } },
        universites: { select: { nom: true } },
        types_document: { select: { nom: true, categorie: true } },
      },
    });
  }

  /**
   * Détermine le résultat de vérification à partir du document trouvé.
   * La vérification blockchain (Polygon) sera ajoutée ici quand #22 sera implémenté.
   */
  private evaluerStatut(doc: any): VerifyResponseDto['resultat'] {
    if (!doc) return 'non_trouve';
    if (doc.statut === 'revoque') return 'revoque';
    if (doc.statut === 'actif') return 'authentique';
    // brouillon / en_validation / expire → non trouvable publiquement
    return 'non_trouve';
  }

  private messagesPourResultat(resultat: VerifyResponseDto['resultat']): string {
    const messages = {
      authentique: 'Ce document est authentique et certifié sur la blockchain INUBIL.',
      revoque:     'Ce document a été révoqué par l\'établissement émetteur.',
      non_trouve:  'Aucun document certifié ne correspond à cet identifiant.',
      falsifie:    'Ce document ne correspond à aucun certificat enregistré — possible falsification.',
    };
    return messages[resultat];
  }

  private formaterDocumentPublic(doc: any): DocumentPublicDto {
    return {
      numero_unique:    doc.numero_unique,
      url_verification: doc.url_verification ?? null,
      type_document:    doc.types_document.nom,
      categorie:        doc.types_document.categorie,
      filiere:          doc.filiere ?? null,
      date_emission:    doc.date_emission,
      universite:       doc.universites.nom,
      etudiant_nom:     `${doc.etudiants.prenom} ${doc.etudiants.nom}`,
      statut:           doc.statut,
    };
  }

  private async construireReponse(
    resultat: VerifyResponseDto['resultat'],
    doc: any,
    hashSoumis: string | null,
    typeVerification: 'lien_unique' | 'hash' | 'upload_pdf',
    ip?: string,
    userAgent?: string,
  ): Promise<VerifyResponseDto> {
    const maintenant = new Date();

    // Enregistrement dans la table verifications
    const verif = await this.prisma.verifications.create({
      data: {
        document_id:       doc?.id ?? null,
        type_verification: typeVerification,
        resultat,
        hash_soumis:       hashSoumis ?? null,
        ip_address:        ip ?? null,
        user_agent:        userAgent ?? null,
        rapport_genere:    false,
      },
    });

    return {
      resultat,
      message:          this.messagesPourResultat(resultat),
      document:         doc ? this.formaterDocumentPublic(doc) : null,
      verification_id:  verif.id,
      verifie_le:       maintenant,
    };
  }
}
