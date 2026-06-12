import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { HashService } from './hash.service';
import { QrCodeService } from './qr-code.service';
import { CreerDocumentDto } from './dto/creer-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { RevoquerDocumentDto } from './dto/revoquer-document.dto';
import { DocumentQueryDto } from './dto/document-query.dto';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly hash: HashService,
    private readonly qr: QrCodeService,
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

    // QR code vers l'URL de vérification publique
    // La qr_code_url sera l'URL IPFS du PNG une fois #21 implémenté.
    // Pour l'instant on génère le QR mais on ne le stocke pas (pas d'IPFS).
    const urlVerification = `https://verify.inubil.com/d/${doc.numero_unique}`;
    await this.qr.generateQr(urlVerification); // exécuté pour valider la génération

    const maintenant = new Date();
    const tailleKo = Math.ceil(fichierTailleOctets / 1024);

    const updated = await this.prisma.documents.update({
      where: { id },
      data: {
        hash_sha256: hashSha256,
        pdf_taille_ko: tailleKo,
        // pdf_url   → sera renseigné par #21 (IPFS Pinata)
        // cid_ipfs  → sera renseigné par #21
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

    return updated;
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
