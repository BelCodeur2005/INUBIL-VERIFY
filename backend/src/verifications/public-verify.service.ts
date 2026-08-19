import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { HashService } from '../documents/hash.service';
import { RapportVerificationPdfService, RapportVerificationData } from '../documents/rapport-verification-pdf.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { ConfigurationsService } from '../configurations/configurations.service';
import { VerifyResponseDto, DocumentPublicDto, MatierePublicDto, BlockchainInfoDto } from './dto/verify-response.dto';

@Injectable()
export class PublicVerifyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hash: HashService,
    private readonly rapportPdf: RapportVerificationPdfService,
    private readonly blockchain: BlockchainService,
    private readonly config: ConfigService,
    private readonly configurations: ConfigurationsService,
  ) {}

  /** Limite effective (en octets) pour un upload de PDF — parametre systeme "pdf_max_taille_mo". */
  private async pdfMaxTailleOctets(): Promise<number> {
    const brut = await this.configurations.get('pdf_max_taille_mo', '20');
    const mo = Number(brut);
    return (Number.isFinite(mo) && mo > 0 ? mo : 20) * 1024 * 1024;
  }

  // ─── Points d'entrée publics ──────────────────────────────────────────

  /** Vérifie par numéro unique (INUB-2026-0001) - type : lien_unique */
  async verifierParIdentifiant(
    identifiant: string,
    ip?: string,
    userAgent?: string,
  ): Promise<VerifyResponseDto> {
    const doc = await this.chargerDocument({ numero_unique: identifiant });
    const infoBlockchain = doc ? await this.lireBlockchain(doc.numero_unique) : null;
    const resultat = this.evaluerStatut(doc, infoBlockchain);
    return this.construireReponse(resultat, doc, null, 'lien_unique', infoBlockchain, ip, userAgent);
  }

  /** Vérifie par hash SHA-256 soumis directement - type : hash */
  async verifierParHash(
    hashSoumis: string,
    ip?: string,
    userAgent?: string,
  ): Promise<VerifyResponseDto> {
    const doc = await this.chargerDocument({ hash_sha256: hashSoumis });
    const infoBlockchain = doc ? await this.lireBlockchain(doc.numero_unique) : null;
    const resultat = this.evaluerStatut(doc, infoBlockchain);
    return this.construireReponse(resultat, doc, hashSoumis, 'hash', infoBlockchain, ip, userAgent);
  }

  /** Vérifie par upload PDF - calcule le hash côté serveur - type : upload_pdf */
  async verifierParUpload(
    pdfBuffer: Buffer,
    ip?: string,
    userAgent?: string,
  ): Promise<VerifyResponseDto> {
    const maxOctets = await this.pdfMaxTailleOctets();
    if (pdfBuffer.length > maxOctets) {
      throw new BadRequestException(
        `Le fichier depasse la taille maximale autorisee (${Math.round(maxOctets / 1024 / 1024)} Mo)`,
      );
    }

    const hashCalcule = this.hash.calculateHash(pdfBuffer);
    const doc = await this.chargerDocument({ hash_sha256: hashCalcule });
    const infoBlockchain = doc ? await this.lireBlockchain(doc.numero_unique) : null;
    const resultat = this.evaluerStatut(doc, infoBlockchain);
    return this.construireReponse(resultat, doc, hashCalcule, 'upload_pdf', infoBlockchain, ip, userAgent);
  }

  // ─── Rapport PDF ─────────────────────────────────────────────────────

  /**
   * Génère un rapport PDF horodaté pour un document identifié par son numéro unique.
   * Accessible publiquement - crée une entrée verifications avec rapport_genere:true.
   */
  async genererRapport(
    identifiant: string,
    ip?: string,
    userAgent?: string,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const doc = await this.chargerDocument({ numero_unique: identifiant });
    const infoBlockchain = doc ? await this.lireBlockchain(doc.numero_unique) : null;
    const resultat = this.evaluerStatut(doc, infoBlockchain);
    const maintenant = new Date();

    const verif = await this.prisma.verifications.create({
      data: {
        document_id:       doc?.id ?? null,
        type_verification: 'lien_unique',
        resultat,
        ip_address:        ip ?? null,
        user_agent:        userAgent ?? null,
        rapport_genere:    true,
      },
    });

    const rapportData: RapportVerificationData = {
      resultat,
      verification_id:  verif.id,
      verifie_le:       maintenant,
      type_verification: 'lien_unique',
      ip_verifieur:     ip,
      ...(doc ? {
        numero_unique:    doc.numero_unique,
        etudiant_nom:     `${doc.etudiants.prenom} ${doc.etudiants.nom}`,
        filiere:          doc.filiere ?? undefined,
        mention:          doc.mentions_document?.nom ?? undefined,
        universite:       doc.universites.nom,
        date_emission:    doc.date_emission,
        hash_sha256:      doc.hash_sha256 ?? undefined,
        transaction_hash: doc.transaction_hash ?? undefined,
      } : {}),
    };

    const buffer = await this.rapportPdf.generateRapport(rapportData);
    const filename = `rapport-verification-${identifiant}-${maintenant.toISOString().slice(0, 10)}.pdf`;

    return { buffer, filename };
  }

  // ─── Helpers privés ──────────────────────────────────────────────────

  private async chargerDocument(where: Record<string, string>) {
    return this.prisma.documents.findFirst({
      where: { ...where, deleted_at: null },
      include: {
        etudiants:      { select: { prenom: true, nom: true } },
        universites:    { select: { nom: true } },
        types_document: { select: { nom: true, categorie: true, a_matieres: true } },
        mentions_document: { select: { nom: true } },
        matieres_document: {
          orderBy: [{ semestre: 'asc' }, { ordre: 'asc' }],
          select: { nom_matiere: true, note: true, note_max: true, resultat: true, semestre: true },
        },
      },
    });
  }

  private evaluerStatut(
    doc: any,
    infoBlockchain: BlockchainInfoDto | null,
  ): VerifyResponseDto['resultat'] {
    if (!doc) return 'non_trouve';

    // Si la blockchain dit révoqué, on le prend en compte même si la DB dit actif
    if (infoBlockchain?.revoque) return 'revoque';

    if (doc.statut === 'revoque') return 'revoque';
    if (doc.statut === 'actif')   return 'authentique';
    // brouillon / en_validation / expire → non trouvable publiquement
    return 'non_trouve';
  }

  private messagesPourResultat(resultat: VerifyResponseDto['resultat']): string {
    const messages = {
      authentique: 'Ce document est authentique et certifié sur la blockchain INUBIL.',
      revoque:     'Ce document a été révoqué par l\'établissement émetteur.',
      non_trouve:  'Aucun document certifié ne correspond à cet identifiant.',
      falsifie:    'Ce document ne correspond à aucun certificat enregistré - possible falsification.',
    };
    return messages[resultat];
  }

  private conseilPourResultat(resultat: VerifyResponseDto['resultat']): string {
    if (resultat === 'authentique') {
      return 'Comparez les informations affichées avec celles présentes sur le document physique. ' +
             'Pour une preuve cryptographique inviolable, utilisez POST /verify/upload avec le fichier PDF.';
    }
    return '';
  }

  private formaterDocumentPublic(doc: any): DocumentPublicDto {
    const matieres: MatierePublicDto[] = (doc.matieres_document ?? []).map((m: any) => ({
      nom_matiere: m.nom_matiere,
      note:        m.note !== null ? Number(m.note) : null,
      note_max:    Number(m.note_max),
      resultat:    m.resultat,
      semestre:    m.semestre ?? null,
    }));

    return {
      numero_unique:      doc.numero_unique,
      url_verification:   doc.url_verification ?? null,
      type_document:      doc.types_document.nom,
      categorie:          doc.types_document.categorie,
      filiere:            doc.filiere ?? null,
      annee_academique:   doc.annee_academique ?? null,
      date_emission:      doc.date_emission,
      etudiant_nom:       `${doc.etudiants.prenom} ${doc.etudiants.nom}`,
      mention:            doc.mentions_document?.nom ?? null,
      moyenne_generale:   doc.moyenne_generale !== null ? Number(doc.moyenne_generale) : null,
      matieres,
      universite:         doc.universites.nom,
      statut:             doc.statut,
      verifiable_par_upload: true,
    };
  }

  private async construireReponse(
    resultat: VerifyResponseDto['resultat'],
    doc: any,
    hashSoumis: string | null,
    typeVerification: 'lien_unique' | 'hash' | 'upload_pdf',
    infoBlockchain: BlockchainInfoDto | null,
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
      message:               this.messagesPourResultat(resultat),
      conseil_verification:  this.conseilPourResultat(resultat),
      document:              doc ? this.formaterDocumentPublic(doc) : null,
      verification_id:       verif.id,
      verifie_le:            maintenant,
      blockchain: infoBlockchain
        ? { ...infoBlockchain, transaction_hash: doc?.transaction_hash ?? null }
        : null,
    };
  }

  // ─── Blockchain ───────────────────────────────────────────────────────────

  private async lireBlockchain(numeroUnique: string): Promise<BlockchainInfoDto | null> {
    const data = await this.blockchain.verifierDiplome(numeroUnique);
    if (!data) return null; // blockchain non configurée

    const reseau = this.config.get<string>('POLYGON_NETWORK', 'polygon_amoy');

    return {
      enregistre:          data.existe,
      revoque:             data.revoque,
      transaction_hash:    null, // hash d'enregistrement stocké en base, pas retourné par le contrat
      date_enregistrement: data.dateEmission,
      reseau,
    };
  }
}
