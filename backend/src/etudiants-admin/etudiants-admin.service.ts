import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreerEtudiantAdminDto } from './dto/creer-etudiant-admin.dto';
import { UpdateEtudiantAdminDto } from './dto/update-etudiant-admin.dto';
import { EtudiantAdminQueryDto } from './dto/etudiant-admin-query.dto';
import {
  EtudiantAdminListeDto,
  EtudiantAdminResponseDto,
} from './dto/etudiant-admin-response.dto';

@Injectable()
export class EtudiantsAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private async getActeurUniversiteId(acteurId: string): Promise<string | null> {
    const u = await this.prisma.utilisateurs.findFirst({
      where: { id: acteurId },
      select: { universite_id: true },
    });
    return u?.universite_id ?? null;
  }

  private toDto(e: any): EtudiantAdminResponseDto {
    return {
      id: e.id,
      numero_etudiant: e.numero_etudiant,
      nom: e.nom,
      prenom: e.prenom,
      email: e.email,
      telephone: e.telephone,
      date_naissance: e.date_naissance,
      lieu_naissance: e.lieu_naissance,
      nationalite: e.nationalite,
      photo_url: e.photo_url,
      annee_entree: e.annee_entree,
      universite_id: e.universite_id,
      universite_nom: e.universites?.nom_court ?? e.universites?.nom ?? '',
      nb_documents: e._count?.documents ?? 0,
      created_at: e.created_at,
      updated_at: e.updated_at,
    };
  }

  async lister(query: EtudiantAdminQueryDto, acteurId: string): Promise<EtudiantAdminListeDto> {
    const acteurUnivId = await this.getActeurUniversiteId(acteurId);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = { deleted_at: null };

    if (acteurUnivId !== null) {
      where.universite_id = acteurUnivId;
    } else if (query.universite_id) {
      where.universite_id = query.universite_id;
    }

    if (query.search) {
      where.OR = [
        { nom: { contains: query.search, mode: 'insensitive' } },
        { prenom: { contains: query.search, mode: 'insensitive' } },
        { numero_etudiant: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.etudiants.count({ where }),
      this.prisma.etudiants.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
        include: {
          universites: { select: { nom: true, nom_court: true } },
          _count: { select: { documents: true } },
        },
      }),
    ]);

    return { data: items.map((e) => this.toDto(e)), total, page, limit };
  }

  async findOne(id: string, acteurId: string): Promise<EtudiantAdminResponseDto> {
    const acteurUnivId = await this.getActeurUniversiteId(acteurId);

    const etudiant = await this.prisma.etudiants.findFirst({
      where: { id, deleted_at: null },
      include: {
        universites: { select: { nom: true, nom_court: true } },
        _count: { select: { documents: true } },
      },
    });
    if (!etudiant) throw new NotFoundException(`Étudiant ${id} introuvable`);

    if (acteurUnivId !== null && etudiant.universite_id !== acteurUnivId) {
      throw new ForbiddenException('Accès refusé : étudiant d\'une autre université');
    }

    return this.toDto(etudiant);
  }

  async creer(dto: CreerEtudiantAdminDto, acteurId: string, ip?: string): Promise<EtudiantAdminResponseDto> {
    const acteurUnivId = await this.getActeurUniversiteId(acteurId);

    if (acteurUnivId !== null && dto.universite_id !== acteurUnivId) {
      throw new ForbiddenException('Vous ne pouvez créer des étudiants que pour votre propre université');
    }

    const universite = await this.prisma.universites.findFirst({
      where: { id: dto.universite_id, statut: 'active', deleted_at: null },
    });
    if (!universite) throw new NotFoundException('Université introuvable ou non active');

    const existant = await this.prisma.etudiants.findFirst({
      where: { numero_etudiant: dto.numero_etudiant, deleted_at: null },
    });
    if (existant) throw new ConflictException(`Le matricule "${dto.numero_etudiant}" est déjà utilisé`);

    const etudiant = await this.prisma.etudiants.create({
      data: {
        numero_etudiant: dto.numero_etudiant,
        nom: dto.nom,
        prenom: dto.prenom,
        universite_id: dto.universite_id,
        date_naissance: dto.date_naissance ? new Date(dto.date_naissance) : null,
        lieu_naissance: dto.lieu_naissance ?? null,
        nationalite: dto.nationalite ?? null,
        email: dto.email ?? null,
        telephone: dto.telephone ?? null,
        photo_url: dto.photo_url ?? null,
        annee_entree: dto.annee_entree ?? null,
        created_by: acteurId,
      },
      include: {
        universites: { select: { nom: true, nom_court: true } },
        _count: { select: { documents: true } },
      },
    });

    await this.audit.log({
      utilisateurId: acteurId,
      action: 'ETUDIANT_CREER',
      module: 'etudiants',
      tableConcernee: 'etudiants',
      enregistrementId: etudiant.id,
      ip,
    });

    return this.toDto(etudiant);
  }

  async modifier(id: string, dto: UpdateEtudiantAdminDto, acteurId: string, ip?: string): Promise<EtudiantAdminResponseDto> {
    const acteurUnivId = await this.getActeurUniversiteId(acteurId);

    const etudiant = await this.prisma.etudiants.findFirst({
      where: { id, deleted_at: null },
    });
    if (!etudiant) throw new NotFoundException(`Étudiant ${id} introuvable`);

    if (acteurUnivId !== null && etudiant.universite_id !== acteurUnivId) {
      throw new ForbiddenException('Accès refusé : étudiant d\'une autre université');
    }

    if (dto.numero_etudiant && dto.numero_etudiant !== etudiant.numero_etudiant) {
      const doublon = await this.prisma.etudiants.findFirst({
        where: { numero_etudiant: dto.numero_etudiant, deleted_at: null, id: { not: id } },
      });
      if (doublon) throw new ConflictException(`Le matricule "${dto.numero_etudiant}" est déjà utilisé`);
    }

    const updated = await this.prisma.etudiants.update({
      where: { id },
      data: {
        ...(dto.numero_etudiant !== undefined && { numero_etudiant: dto.numero_etudiant }),
        ...(dto.nom !== undefined && { nom: dto.nom }),
        ...(dto.prenom !== undefined && { prenom: dto.prenom }),
        ...(dto.date_naissance !== undefined && { date_naissance: dto.date_naissance ? new Date(dto.date_naissance) : null }),
        ...(dto.lieu_naissance !== undefined && { lieu_naissance: dto.lieu_naissance }),
        ...(dto.nationalite !== undefined && { nationalite: dto.nationalite }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.telephone !== undefined && { telephone: dto.telephone }),
        ...(dto.photo_url !== undefined && { photo_url: dto.photo_url }),
        ...(dto.annee_entree !== undefined && { annee_entree: dto.annee_entree }),
      },
      include: {
        universites: { select: { nom: true, nom_court: true } },
        _count: { select: { documents: true } },
      },
    });

    await this.audit.log({
      utilisateurId: acteurId,
      action: 'ETUDIANT_MODIFIER',
      module: 'etudiants',
      tableConcernee: 'etudiants',
      enregistrementId: id,
      ip,
    });

    return this.toDto(updated);
  }

  async supprimer(id: string, acteurId: string, ip?: string): Promise<void> {
    const acteurUnivId = await this.getActeurUniversiteId(acteurId);

    const etudiant = await this.prisma.etudiants.findFirst({
      where: { id, deleted_at: null },
      include: { _count: { select: { documents: true } } },
    });
    if (!etudiant) throw new NotFoundException(`Étudiant ${id} introuvable`);

    if (acteurUnivId !== null && etudiant.universite_id !== acteurUnivId) {
      throw new ForbiddenException('Accès refusé : étudiant d\'une autre université');
    }

    if (etudiant._count.documents > 0) {
      throw new ConflictException(
        `Impossible de supprimer : cet étudiant possède ${etudiant._count.documents} document(s) émis`,
      );
    }

    await this.prisma.etudiants.update({
      where: { id },
      data: { deleted_at: new Date() },
    });

    await this.audit.log({
      utilisateurId: acteurId,
      action: 'ETUDIANT_SUPPRIMER',
      module: 'etudiants',
      tableConcernee: 'etudiants',
      enregistrementId: id,
      ip,
    });
  }
}
