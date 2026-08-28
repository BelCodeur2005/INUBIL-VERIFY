import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { HashService } from './hash.service';
import { QrCodeService } from './qr-code.service';
import { NotificationEmissionService } from './notification-emission.service';
import { NotificationsService } from '../notifications/notifications.service';
import { StorageService } from '../storage/storage.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { ConfigurationsService } from '../configurations/configurations.service';
import { CreerDocumentDto } from './dto/creer-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { RevoquerDocumentDto } from './dto/revoquer-document.dto';
import { RejeterDocumentDto } from './dto/rejeter-document.dto';
import { DocumentQueryDto } from './dto/document-query.dto';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
    private readonly hash: HashService,
    private readonly qr: QrCodeService,
    private readonly notif: NotificationEmissionService,
    private readonly notificationsInApp: NotificationsService,
    private readonly storage: StorageService,
    private readonly blockchain: BlockchainService,
    private readonly configurations: ConfigurationsService,
  ) {}

  // ─── Helpers ─────────────────────────────────────────────────────────────

  /** Limite effective (en octets) pour un upload de PDF — parametre systeme "pdf_max_taille_mo". */
  private async pdfMaxTailleOctets(): Promise<number> {
    const brut = await this.configurations.get('pdf_max_taille_mo', '20');
    const mo = Number(brut);
    return (Number.isFinite(mo) && mo > 0 ? mo : 20) * 1024 * 1024;
  }

  /** Duree de validite (en secondes) d'un lien de telechargement presigne — parametre systeme "presigned_url_duree_min". */
  private async presignedUrlDureeSecondes(): Promise<number> {
    const brut = await this.configurations.get('presigned_url_duree_min', '15');
    const min = Number(brut);
    return (Number.isFinite(min) && min > 0 ? min : 15) * 60;
  }

  /**
   * Universite de l'acteur, ou null UNIQUEMENT si son role est explicitement
   * "super_admin" (verifie par nom de role, jamais devine depuis l'absence
   * d'universite). Tout autre utilisateur sans universite est refuse — ne pas
   * inferer un statut privilegie a partir d'un champ nullable.
   */
  private async getActeurUniversiteId(acteurId: string): Promise<string | null> {
    const u = await this.prisma.utilisateurs.findFirst({
      where: { id: acteurId },
      select: {
        universite_id: true,
        roles_utilisateurs_role_idToroles: { select: { nom: true } },
      },
    });
    if (u?.roles_utilisateurs_role_idToroles?.nom === 'super_admin') return null;
    if (!u?.universite_id) {
      throw new ForbiddenException("Vous n'êtes pas associé à une université");
    }
    return u.universite_id;
  }

  private assertMemeUniversite(
    docUniversiteId: string,
    acteurUniversiteId: string | null,
  ): void {
    if (acteurUniversiteId !== null && docUniversiteId !== acteurUniversiteId) {
      throw new ForbiddenException('Accès refusé : document d\'une autre université');
    }
  }

  private async trouverOuEchouer(id: string) {
    const doc = await this.prisma.documents.findFirst({
      where: { id, deleted_at: null },
      include: { matieres_document: { orderBy: { ordre: 'asc' } } },
    });
    if (!doc) throw new NotFoundException(`Document ${id} introuvable`);
    return doc;
  }

  /** Génère INUB-YYYY-XXXX unique par année. */
  private async genererNumeroUnique(annee: number): Promise<string> {
    const prefix = `INUB-${annee}-`;
    const dernier = await this.prisma.documents.findFirst({
      where: { numero_unique: { startsWith: prefix } },
      orderBy: { numero_unique: 'desc' },
      select: { numero_unique: true },
    });
    const seq = dernier
      ? parseInt(dernier.numero_unique.replace(prefix, ''), 10) + 1
      : 1;
    return `${prefix}${String(seq).padStart(4, '0')}`;
  }

  // ─── CRUD ────────────────────────────────────────────────────────────────

  async creer(dto: CreerDocumentDto, acteurId: string, ip?: string) {
    const acteurUnivId = await this.getActeurUniversiteId(acteurId);

    // Détermine l'université : super-admin doit fournir l'univ via l'étudiant
    const etudiant = await this.prisma.etudiants.findFirst({
      where: { id: dto.etudiant_id, deleted_at: null },
      select: { universite_id: true },
    });
    if (!etudiant) throw new NotFoundException('Étudiant introuvable');

    this.assertMemeUniversite(etudiant.universite_id, acteurUnivId);

    const typeDoc = await this.prisma.types_document.findFirst({
      where: { id: dto.type_document_id, est_actif: true },
    });
    if (!typeDoc) throw new NotFoundException('Type de document introuvable ou inactif');

    const dateEmission = new Date(dto.date_emission);
    const annee = dateEmission.getFullYear();
    const numeroUnique = await this.genererNumeroUnique(annee);

    const { matieres, ...champs } = dto;

    const doc = await this.prisma.documents.create({
      data: {
        numero_unique: numeroUnique,
        etudiant_id: dto.etudiant_id,
        universite_id: etudiant.universite_id,
        type_document_id: dto.type_document_id,
        date_emission: dateEmission,
        annee_academique: champs.annee_academique ?? null,
        lieu_delivrance: champs.lieu_delivrance ?? null,
        filiere: champs.filiere ?? null,
        mention_id: champs.mention_id ?? null,
        moyenne_generale: champs.moyenne_generale ?? null,
        note_sur: champs.note_sur ?? 20,
        donnees: champs.donnees ?? {},
        saisi_par: acteurId,
        statut: 'brouillon',
        ...(matieres?.length
          ? {
              matieres_document: {
                create: matieres.map((m, i) => ({
                  code_matiere: m.code_matiere ?? null,
                  nom_matiere: m.nom_matiere,
                  credits: m.credits ?? 0,
                  coefficient: m.coefficient ?? 1,
                  note: m.note ?? null,
                  note_max: m.note_max ?? 20,
                  resultat: (m.resultat ?? 'ajourne') as any,
                  semestre: m.semestre ?? null,
                  type_ue: m.type_ue ?? null,
                  ordre: m.ordre ?? i,
                })),
              },
            }
          : {}),
      },
      include: { matieres_document: { orderBy: { ordre: 'asc' } } },
    });

    await this.audit.log({
      utilisateurId: acteurId,
      action: 'DOCUMENT_CREER',
      module: 'documents',
      enregistrementId: doc.id,
      tableConcernee: 'documents',
      ip,
    });

    return doc;
  }

  async lister(query: DocumentQueryDto, acteurId: string) {
    const acteurUnivId = await this.getActeurUniversiteId(acteurId);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: any = { deleted_at: null };

    // Scoping multi-tenant
    if (acteurUnivId !== null) {
      where.universite_id = acteurUnivId;
    } else if (query.universite_id) {
      where.universite_id = query.universite_id;
    }

    if (query.statut) where.statut = query.statut;
    if (query.etudiant_id) where.etudiant_id = query.etudiant_id;
    if (query.type_document_id) where.type_document_id = query.type_document_id;
    if (query.date_debut || query.date_fin) {
      where.date_emission = {};
      if (query.date_debut) where.date_emission.gte = new Date(query.date_debut);
      if (query.date_fin) where.date_emission.lte = new Date(query.date_fin);
    }

    const [total, items] = await Promise.all([
      this.prisma.documents.count({ where }),
      this.prisma.documents.findMany({
        where,
        include: { matieres_document: { orderBy: { ordre: 'asc' } } },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return { total, page, limit, items };
  }

  async trouver(id: string, acteurId: string) {
    const acteurUnivId = await this.getActeurUniversiteId(acteurId);
    const doc = await this.trouverOuEchouer(id);
    this.assertMemeUniversite(doc.universite_id, acteurUnivId);
    return doc;
  }

  async modifier(id: string, dto: UpdateDocumentDto, acteurId: string, ip?: string) {
    const acteurUnivId = await this.getActeurUniversiteId(acteurId);
    const doc = await this.trouverOuEchouer(id);
    this.assertMemeUniversite(doc.universite_id, acteurUnivId);

    if (!['brouillon', 'rejete'].includes(doc.statut)) {
      throw new BadRequestException('Seul un brouillon ou un document rejeté peut être modifié');
    }

    const { matieres, ...champs } = dto;

    const updated = await this.prisma.documents.update({
      where: { id },
      data: {
        ...(champs.date_emission ? { date_emission: new Date(champs.date_emission) } : {}),
        ...(champs.annee_academique !== undefined ? { annee_academique: champs.annee_academique } : {}),
        ...(champs.lieu_delivrance !== undefined ? { lieu_delivrance: champs.lieu_delivrance } : {}),
        ...(champs.filiere !== undefined ? { filiere: champs.filiere } : {}),
        ...(champs.mention_id !== undefined ? { mention_id: champs.mention_id } : {}),
        ...(champs.moyenne_generale !== undefined ? { moyenne_generale: champs.moyenne_generale } : {}),
        ...(champs.note_sur !== undefined ? { note_sur: champs.note_sur } : {}),
        ...(champs.donnees !== undefined ? { donnees: champs.donnees } : {}),
        ...(matieres !== undefined
          ? {
              matieres_document: {
                deleteMany: {},
                create: matieres.map((m, i) => ({
                  code_matiere: m.code_matiere ?? null,
                  nom_matiere: m.nom_matiere,
                  credits: m.credits ?? 0,
                  coefficient: m.coefficient ?? 1,
                  note: m.note ?? null,
                  note_max: m.note_max ?? 20,
                  resultat: (m.resultat ?? 'ajourne') as any,
                  semestre: m.semestre ?? null,
                  type_ue: m.type_ue ?? null,
                  ordre: m.ordre ?? i,
                })),
              },
            }
          : {}),
      },
      include: { matieres_document: { orderBy: { ordre: 'asc' } } },
    });

    await this.audit.log({
      utilisateurId: acteurId,
      action: 'DOCUMENT_MODIFIER',
      module: 'documents',
      enregistrementId: id,
      tableConcernee: 'documents',
      ip,
    });

    return updated;
  }

  /** Upload du PDF par l'agent de saisie - calcule le hash et stocke sur R2. */
  async uploadPdf(
    id: string,
    fichierBuffer: Buffer,
    fichierTailleOctets: number,
    acteurId: string,
    ip?: string,
  ) {
    const acteurUnivId = await this.getActeurUniversiteId(acteurId);
    const doc = await this.trouverOuEchouer(id);
    this.assertMemeUniversite(doc.universite_id, acteurUnivId);

    if (!['brouillon', 'en_validation', 'rejete'].includes(doc.statut)) {
      throw new BadRequestException(
        `Impossible d'uploader un PDF pour un document en statut "${doc.statut}"`,
      );
    }

    const maxOctets = await this.pdfMaxTailleOctets();
    if (fichierTailleOctets > maxOctets) {
      throw new BadRequestException(
        `Le fichier depasse la taille maximale autorisee (${Math.round(maxOctets / 1024 / 1024)} Mo)`,
      );
    }

    const hashSha256 = this.hash.calculateHash(fichierBuffer);

    const doublon = await this.prisma.documents.findFirst({
      where: { hash_sha256: hashSha256, id: { not: id } },
    });
    if (doublon) {
      throw new ConflictException(
        'Ce fichier est déjà enregistré sur la plateforme (hash identique)',
      );
    }

    const dateEmission = new Date(doc.date_emission);
    const annee  = dateEmission.getFullYear();
    const mois   = String(dateEmission.getMonth() + 1).padStart(2, '0');
    const pdfKey = `universites/${doc.universite_id}/diplomes/${annee}/${mois}/${doc.numero_unique}.pdf`;
    const s3Pdf  = await this.storage
      .uploadFile(fichierBuffer, pdfKey, 'application/pdf')
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        const code = (err as Record<string, unknown>)?.Code ?? (err as Record<string, unknown>)?.name ?? '';
        this.logger.error(`Upload R2 PDF échoué pour doc ${id} : [${code}] ${msg}`);
        return null;
      });

    const tailleKo = Math.ceil(fichierTailleOctets / 1024);

    // Si le document était rejeté, le re-upload le remet en brouillon et efface le rejet
    const resetRejet = doc.statut === 'rejete'
      ? { statut: 'brouillon' as const, motif_rejet: null, rejete_par: null, rejete_le: null }
      : {};

    const updated = await this.prisma.documents.update({
      where: { id },
      data: {
        hash_sha256: hashSha256,
        pdf_taille_ko: tailleKo,
        pdf_url: s3Pdf?.key ?? null,
        ...resetRejet,
      },
      include: { matieres_document: { orderBy: { ordre: 'asc' } } },
    });

    await this.audit.log({
      utilisateurId: acteurId,
      action: 'DOCUMENT_UPLOAD_PDF',
      module: 'documents',
      enregistrementId: id,
      tableConcernee: 'documents',
      ip,
    });

    return updated;
  }

  /** Validation par le directeur - approuve le document, génère le QR, déclenche la blockchain. */
  async valider(id: string, acteurId: string, ip?: string, userAgent?: string) {
    const acteurUnivId = await this.getActeurUniversiteId(acteurId);
    const doc = await this.trouverOuEchouer(id);
    this.assertMemeUniversite(doc.universite_id, acteurUnivId);

    if (!['brouillon', 'en_validation'].includes(doc.statut)) {
      const hint = doc.statut === 'rejete'
        ? ' Un document rejeté doit d\'abord être corrigé (PDF re-uploadé via POST /documents/{id}/pdf) avant d\'être validé.'
        : '';
      throw new BadRequestException(
        `Impossible de valider un document en statut "${doc.statut}".${hint}`,
      );
    }

    if (!doc.pdf_url || !doc.hash_sha256) {
      throw new BadRequestException(
        'Le PDF doit être uploadé avant la validation - utiliser POST /documents/{id}/pdf',
      );
    }

    const publicVerifyUrl = this.config.get<string>('PUBLIC_VERIFY_URL', 'https://verify.inubil.com');
    const urlVerification = `${publicVerifyUrl}/d/${doc.numero_unique}`;

    const dateVal  = new Date(doc.date_emission);
    const annee   = dateVal.getFullYear();
    const mois    = String(dateVal.getMonth() + 1).padStart(2, '0');
    const qrBuffer = await this.qr.generateQr(urlVerification);
    const qrKey = `universites/${doc.universite_id}/qrcodes/${annee}/${mois}/${doc.numero_unique}-qr.png`;
    let qrCodeUrl: string | null = null;
    const s3Qr = await this.storage
      .uploadFile(qrBuffer, qrKey, 'image/png')
      .catch((err: Error) => {
        this.logger.error(`Upload R2 QR échoué pour doc ${id} : ${err.message}`);
        return null;
      });
    if (s3Qr) { qrCodeUrl = s3Qr.key; }

    const maintenant = new Date();

    const updated = await this.prisma.documents.update({
      where: { id },
      data: {
        qr_code_url: qrCodeUrl,
        statut: 'actif',
        valide_par: acteurId,
        valide_le: maintenant,
        emis_le: maintenant,
      },
      include: {
        matieres_document: { orderBy: { ordre: 'asc' } },
        etudiants: { select: { utilisateur_id: true } },
      },
    });

    await this.audit.log({
      utilisateurId: acteurId,
      action: 'DOCUMENT_VALIDER',
      module: 'documents',
      enregistrementId: id,
      tableConcernee: 'documents',
      ip,
      userAgent,
    });

    this.notif.notifierEtudiant(id).catch((err) =>
      this.logger.error(`Notification émission échouée pour doc ${id} : ${err.message}`),
    );

    if (updated.etudiants?.utilisateur_id) {
      this.notificationsInApp
        .creer({
          utilisateurId: updated.etudiants.utilisateur_id,
          type:    'document_emis',
          titre:   'Diplôme certifié',
          message: `Votre document ${updated.numero_unique} a été validé et ancré sur la blockchain.`,
          lien:    '/dashboard-etudiant',
        })
        .catch((err) => this.logger.error(`Notification in-app émission échouée pour doc ${id} : ${err.message}`));
    }

    this.enregistrerSurBlockchain(updated.id, doc.hash_sha256, updated.universite_id, updated.numero_unique)
      .catch((err) =>
        this.logger.error(`Blockchain enregistrement échoué pour doc ${id} : ${err.message}`),
      );

    return updated;
  }

  async revoquer(id: string, dto: RevoquerDocumentDto, acteurId: string, ip?: string) {
    const acteurUnivId = await this.getActeurUniversiteId(acteurId);
    const doc = await this.trouverOuEchouer(id);
    this.assertMemeUniversite(doc.universite_id, acteurUnivId);

    if (doc.statut !== 'actif') {
      throw new BadRequestException('Seul un document actif peut être révoqué');
    }

    const updated = await this.prisma.documents.update({
      where: { id },
      data: {
        statut: 'revoque',
        revoque_par: acteurId,
        revoque_le: new Date(),
        raison_revocation: dto.raison,
        // #22 - Blockchain : revokeDiploma(bytes32 hash) sera appelé ici une fois
        // le service Ethers.js + Polygon implémenté (transaction_hash mis à jour en retour).
      },
      include: {
        matieres_document: { orderBy: { ordre: 'asc' } },
        etudiants: { select: { utilisateur_id: true } },
      },
    });

    await this.audit.log({
      utilisateurId: acteurId,
      action: 'DOCUMENT_REVOQUER',
      module: 'documents',
      enregistrementId: id,
      tableConcernee: 'documents',
      ip,
    });

    // Notification email étudiant en fire & forget - un échec mail ne fait pas échouer la révocation
    this.notif.notifierRevocation(id).catch((err) =>
      this.logger.error(`Notification révocation échouée pour doc ${id} : ${err.message}`),
    );

    if (updated.etudiants?.utilisateur_id) {
      this.notificationsInApp
        .creer({
          utilisateurId: updated.etudiants.utilisateur_id,
          type:    'document_revoque',
          titre:   'Diplôme révoqué',
          message: `Votre document ${updated.numero_unique} a été révoqué par votre établissement.`,
          lien:    '/dashboard-etudiant',
        })
        .catch((err) => this.logger.error(`Notification in-app révocation échouée pour doc ${id} : ${err.message}`));
    }

    // Blockchain fire & forget - révoque le diplôme on-chain sans bloquer la réponse
    this.revoquerSurBlockchain(id, updated.numero_unique)
      .catch((err) =>
        this.logger.error(`Blockchain révocation échouée pour doc ${id} : ${err.message}`),
      );

    return updated;
  }

  /** Rejet par le directeur pédagogique - le PDF reste sur R2, le statut passe à 'rejete'. */
  async rejeter(id: string, dto: RejeterDocumentDto, acteurId: string, ip?: string) {
    const acteurUnivId = await this.getActeurUniversiteId(acteurId);
    const doc = await this.trouverOuEchouer(id);
    this.assertMemeUniversite(doc.universite_id, acteurUnivId);

    if (!['brouillon', 'en_validation'].includes(doc.statut)) {
      throw new BadRequestException(
        `Impossible de rejeter un document en statut "${doc.statut}" - seul un brouillon ou document en validation peut être rejeté`,
      );
    }

    const updated = await this.prisma.documents.update({
      where: { id },
      data: {
        statut: 'rejete',
        motif_rejet: dto.motif,
        rejete_par: acteurId,
        rejete_le: new Date(),
      },
      include: { matieres_document: { orderBy: { ordre: 'asc' } } },
    });

    await this.audit.log({
      utilisateurId: acteurId,
      action: 'DOCUMENT_REJETER',
      module: 'documents',
      enregistrementId: id,
      tableConcernee: 'documents',
      ip,
    });

    return updated;
  }


  async getPdfUrl(
    id: string,
    acteurId: string,
  ): Promise<{ url: string; expires_in_seconds: number }> {
    const acteurUnivId = await this.getActeurUniversiteId(acteurId);
    const doc = await this.trouverOuEchouer(id);
    this.assertMemeUniversite(doc.universite_id, acteurUnivId);

    if (doc.statut === 'revoque') {
      throw new ForbiddenException('Ce document a été révoqué');
    }

    if (!doc.pdf_url) {
      throw new BadRequestException('Aucun PDF associé à ce document');
    }

    const expires = await this.presignedUrlDureeSecondes();
    const url = await this.storage.getPresignedUrl(doc.pdf_url, expires);
    if (!url) throw new BadRequestException('Stockage S3 non configuré');

    return { url, expires_in_seconds: expires };
  }

  // ─── Blockchain (fire & forget) ──────────────────────────────────────────

  private async enregistrerSurBlockchain(
    docId: string,
    hashSha256: string,
    universiteId: string,
    numeroUnique: string,
  ): Promise<void> {
    const result = await this.blockchain.enregistrerDiplome(numeroUnique, hashSha256, universiteId);
    if (!result) return; // blockchain non configurée ou erreur déjà loggée

    const { txHash, blocNumero } = result;
    const contractAddress = this.config.get<string>('CONTRACT_ADDRESS') ?? '';
    const reseau = (this.config.get<string>('POLYGON_NETWORK') ?? 'polygon_amoy') as 'polygon_amoy' | 'polygon_mainnet';

    await this.prisma.documents.update({
      where: { id: docId },
      data: {
        transaction_hash: txHash,
        adresse_contrat: contractAddress,
        reseau,
        bloc_numero: blocNumero,
      },
    });

    this.logger.log(`Blockchain ✔ enregistrement doc ${docId} - tx: ${txHash}, bloc: ${blocNumero}`);
  }

  private async revoquerSurBlockchain(docId: string, numeroUnique: string): Promise<void> {
    const txHash = await this.blockchain.revoquerDiplome(numeroUnique);
    if (!txHash) return; // blockchain non configurée ou erreur déjà loggée

    this.logger.log(`Blockchain ✔ révocation doc ${docId} - tx: ${txHash}`);
  }

  async supprimer(id: string, acteurId: string, ip?: string) {
    const acteurUnivId = await this.getActeurUniversiteId(acteurId);
    const doc = await this.trouverOuEchouer(id);
    this.assertMemeUniversite(doc.universite_id, acteurUnivId);

    if (doc.statut !== 'brouillon') {
      throw new BadRequestException('Seul un brouillon peut être supprimé');
    }

    // Soft delete
    await this.prisma.documents.update({
      where: { id },
      data: { deleted_at: new Date() },
    });

    await this.audit.log({
      utilisateurId: acteurId,
      action: 'DOCUMENT_SUPPRIMER',
      module: 'documents',
      enregistrementId: id,
      tableConcernee: 'documents',
      ip,
    });
  }
}
