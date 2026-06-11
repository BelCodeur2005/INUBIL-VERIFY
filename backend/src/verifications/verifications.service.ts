import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  AdminVerificationQueryDto,
  VerificationQueryDto,
} from './dto/verification-query.dto';
import {
  VerificationAdminListResponseDto,
  VerificationAdminResponseDto,
  VerificationListResponseDto,
  VerificationResponseDto,
} from './dto/verification-response.dto';

@Injectable()
export class VerificationsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── MES VÉRIFICATIONS (vérifs que j'ai effectuées) ─────────────────
  async mesVerifications(
    utilisateurId: string,
    query: VerificationQueryDto,
  ): Promise<VerificationListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.verificationsWhereInput = { utilisateur_id: utilisateurId };
    this.appliquerFiltresCommuns(where, query);

    const [verifications, total] = await this.prisma.$transaction([
      this.prisma.verifications.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.verifications.count({ where }),
    ]);

    return this.buildList(verifications, total, page, limit);
  }

  // ─── MES DIPLÔMES (vérifs effectuées SUR mes documents) ─────────────
  async mesDiplomes(
    utilisateurId: string,
    query: VerificationQueryDto,
  ): Promise<VerificationListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    // Trouver l'étudiant lié à cet utilisateur.
    const etudiant = await this.prisma.etudiants.findFirst({
      where: { utilisateur_id: utilisateurId },
    });
    if (!etudiant) {
      // Pas d'espace étudiant associé → liste vide (aucune erreur, juste rien à voir).
      return { data: [], total: 0, page, limit, totalPages: 0 };
    }

    if (query.document_id) {
      // Vérifier que le document demandé appartient bien à cet étudiant.
      const doc = await this.prisma.documents.findFirst({
        where: { id: query.document_id, etudiant_id: etudiant.id },
      });
      if (!doc) {
        throw new ForbiddenException("Ce document ne fait pas partie de vos diplômes");
      }
    }

    // Filtre principal : verifications liées aux documents de cet étudiant.
    const where: Prisma.verificationsWhereInput = {
      document_id: { not: null },
      documents: { etudiant_id: etudiant.id },
    };

    if (query.document_id) where.document_id = query.document_id;
    this.appliquerFiltresCommuns(where, query);

    const [verifications, total] = await this.prisma.$transaction([
      this.prisma.verifications.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.verifications.count({ where }),
    ]);

    return this.buildList(verifications, total, page, limit);
  }

  // ─── TOUTES LES VÉRIFICATIONS (admin) ────────────────────────────────
  async toutesVerifications(
    query: AdminVerificationQueryDto,
  ): Promise<VerificationAdminListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.verificationsWhereInput = {};
    this.appliquerFiltresCommuns(where, query);
    if (query.utilisateur_id) where.utilisateur_id = query.utilisateur_id;
    if (query.type_verification) where.type_verification = query.type_verification as any;
    if (query.document_id) where.document_id = query.document_id;

    const [verifications, total] = await this.prisma.$transaction([
      this.prisma.verifications.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.verifications.count({ where }),
    ]);

    return {
      data: verifications.map((v) => this.formaterAdmin(v)),
      total,
      page,
      limit,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────

  private appliquerFiltresCommuns(
    where: Prisma.verificationsWhereInput,
    query: VerificationQueryDto,
  ): void {
    if (query.resultat) where.resultat = query.resultat as any;
    if (query.date_debut || query.date_fin) {
      where.created_at = {
        ...(query.date_debut ? { gte: new Date(query.date_debut) } : {}),
        ...(query.date_fin ? { lte: new Date(query.date_fin) } : {}),
      };
    }
  }

  private buildList(
    verifications: any[],
    total: number,
    page: number,
    limit: number,
  ): VerificationListResponseDto {
    return {
      data: verifications.map((v) => this.formater(v)),
      total,
      page,
      limit,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    };
  }

  private formater(v: any): VerificationResponseDto {
    return {
      id: v.id,
      type_verification: v.type_verification,
      resultat: v.resultat,
      document_id: v.document_id ?? null,
      rapport_genere: v.rapport_genere,
      rapport_pdf_url: v.rapport_pdf_url ?? null,
      pays: v.pays ?? null,
      ville: v.ville ?? null,
      organisation: v.organisation ?? null,
      created_at: v.created_at,
    };
  }

  private formaterAdmin(v: any): VerificationAdminResponseDto {
    return {
      ...this.formater(v),
      utilisateur_id: v.utilisateur_id ?? null,
      partage_id: v.partage_id ?? null,
      hash_soumis: v.hash_soumis ?? null,
      ip_address: v.ip_address ?? null,
    };
  }
}
