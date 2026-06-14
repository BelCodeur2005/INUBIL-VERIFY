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
import { StorageService } from '../storage/storage.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { CreerDocumentDto } from './dto/creer-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { RevoquerDocumentDto } from './dto/revoquer-document.dto';
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
    private readonly storage: StorageService,
    private readonly blockchain: BlockchainService,
  ) {}

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private async getActeurUniversiteId(acteurId: string): Promise<string | null> {
    const u = await this.prisma.utilisateurs.findFirst({
      where: { id: acteurId },
      select: { universite_id: true },
    });
    return u?.universite_id ?? null;
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

    if (doc.statut !== 'brouillon') {
      throw new BadRequestException('Seul un brouillon peut être modifié');
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

  /**
   * Valide un document : reçoit le PDF uploadé par l'université, calcule le
   * hash SHA-256, génère le QR de vérification, passe le document en `actif`.
   * IPFS (#21) et Blockchain (#22) sont des stubs — intégrés dans les sprints suivants.
   */
  async valider(
    id: string,
    fichierBuffer: Buffer,
    fichierTailleOctets: number,
    acteurId: string,
    ip?: string,
    userAgent?: string,
  ) {
    const acteurUnivId = await this.getActeurUniversiteId(acteurId);
    const doc = await this.trouverOuEchouer(id);
    this.assertMemeUniversite(doc.universite_id, acteurUnivId);

    if (!['brouillon', 'en_validation'].includes(doc.statut)) {
      throw new BadRequestException(
        `Impossible de valider un document en statut "${doc.statut}"`,
      );
    }

    // Hash SHA-256 du PDF original uploadé par l'université
    const hashSha256 = this.hash.calculateHash(fichierBuffer);

    // Vérification unicité du hash (anti-doublon)
    const doublon = await this.prisma.documents.findFirst({
      where: { hash_sha256: hashSha256, id: { not: id } },
    });
    if (doublon) {
      throw new ConflictException(
        'Ce fichier est déjà enregistré sur la plateforme (hash identique)',
      );
    }

    const publicVerifyUrl = this.config.get<string>('PUBLIC_VERIFY_URL', 'https://verify.inubil.com');
    const urlVerification = `${publicVerifyUrl}/d/${doc.numero_unique}`;

    // Upload PDF sur S3 (privé) — fire & forget : un échec n'empêche pas la validation
    const annee  = new Date(doc.date_emission).getFullYear();
    const pdfKey = `universites/${doc.universite_id}/diplomes/${annee}/${doc.numero_unique}.pdf`;
    let pdfUrl: string | null = null;
    const s3Pdf = await this.storage
      .uploadFile(fichierBuffer, pdfKey, 'application/pdf')
      .catch((err: Error) => {
        this.logger.error(`Upload S3 PDF échoué pour doc ${id} : ${err.message}`);
        return null;
      });
    if (s3Pdf) { pdfUrl = s3Pdf.key; }

    // Générer QR code PNG et uploader sur S3 (privé)
    const qrBuffer = await this.qr.generateQr(urlVerification);
    const qrKey = `universites/${doc.universite_id}/qrcodes/${annee}/${doc.numero_unique}-qr.png`;
    let qrCodeUrl: string | null = null;
    const s3Qr = await this.storage
      .uploadFile(qrBuffer, qrKey, 'image/png')
      .catch((err: Error) => {
        this.logger.error(`Upload S3 QR échoué pour doc ${id} : ${err.message}`);
        return null;
      });
    if (s3Qr) { qrCodeUrl = s3Qr.key; }

    const maintenant = new Date();
    const tailleKo = Math.ceil(fichierTailleOctets / 1024);

    const updated = await this.prisma.documents.update({
      where: { id },
      data: {
        hash_sha256: hashSha256,
        pdf_taille_ko: tailleKo,
        pdf_url: pdfUrl,       // clé S3 : universites/{id}/diplomes/{année}/{numero}.pdf
        cid_ipfs: null,        // réservé pour ancrage blockchain (#22)
        qr_code_url: qrCodeUrl,
        // transaction_hash / bloc_numero / reseau → seront renseignés par #22
        statut: 'actif',
        valide_par: acteurId,
        valide_le: maintenant,
        emis_le: maintenant,
      },
      include: { matieres_document: { orderBy: { ordre: 'asc' } } },
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

    // Notification email étudiant en fire & forget — un échec mail ne fait pas échouer la validation
    this.notif.notifierEtudiant(id).catch((err) =>
      this.logger.error(`Notification émission échouée pour doc ${id} : ${err.message}`),
    );

    // Blockchain fire & forget — n'attend pas la confirmation pour ne pas bloquer l'admin
    this.enregistrerSurBlockchain(updated.id, hashSha256, updated.universite_id, updated.numero_unique)
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
        // #22 — Blockchain : revokeDiploma(bytes32 hash) sera appelé ici une fois
        // le service Ethers.js + Polygon implémenté (transaction_hash mis à jour en retour).
      },
      include: { matieres_document: { orderBy: { ordre: 'asc' } } },
    });

    await this.audit.log({
      utilisateurId: acteurId,
      action: 'DOCUMENT_REVOQUER',
      module: 'documents',
      enregistrementId: id,
      tableConcernee: 'documents',
      ip,
    });

    // Notification email étudiant en fire & forget — un échec mail ne fait pas échouer la révocation
    this.notif.notifierRevocation(id).catch((err) =>
      this.logger.error(`Notification révocation échouée pour doc ${id} : ${err.message}`),
    );

    // Blockchain fire & forget — révoque le diplôme on-chain sans bloquer la réponse
    this.revoquerSurBlockchain(id, updated.numero_unique)
      .catch((err) =>
        this.logger.error(`Blockchain révocation échouée pour doc ${id} : ${err.message}`),
      );

    return updated;
  }

  async getPdfUrl(
    id: string,
    acteurId: string,
  ): Promise<{ url: string; expires_in_seconds: number }> {
    const acteurUnivId = await this.getActeurUniversiteId(acteurId);
    const doc = await this.trouverOuEchouer(id);
    this.assertMemeUniversite(doc.universite_id, acteurUnivId);

    if (!doc.pdf_url) {
      throw new BadRequestException('Aucun PDF associé à ce document');
    }

    const EXPIRES = 900; // 15 minutes
    const url = await this.storage.getPresignedUrl(doc.pdf_url, EXPIRES);
    if (!url) throw new BadRequestException('Stockage S3 non configuré');

    return { url, expires_in_seconds: EXPIRES };
  }

  // ─── Blockchain (fire & forget) ──────────────────────────────────────────

  private async enregistrerSurBlockchain(
    docId: string,
    hashSha256: string,
    universiteId: string,
    numeroUnique: string,
  ): Promise<void> {
    const txHash = await this.blockchain.enregistrerDiplome(numeroUnique, hashSha256, universiteId);
    if (!txHash) return; // blockchain non configurée ou erreur déjà loggée

    const contractAddress = this.config.get<string>('CONTRACT_ADDRESS') ?? '';
    const reseau = (this.config.get<string>('POLYGON_NETWORK') ?? 'polygon_amoy') as 'polygon_amoy' | 'polygon_mainnet';

    await this.prisma.documents.update({
      where: { id: docId },
      data: { transaction_hash: txHash, adresse_contrat: contractAddress, reseau },
    });

    this.logger.log(`Blockchain ✔ enregistrement doc ${docId} — tx: ${txHash}`);
  }

  private async revoquerSurBlockchain(docId: string, numeroUnique: string): Promise<void> {
    const txHash = await this.blockchain.revoquerDiplome(numeroUnique);
    if (!txHash) return; // blockchain non configurée ou erreur déjà loggée

    this.logger.log(`Blockchain ✔ révocation doc ${docId} — tx: ${txHash}`);
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
