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
import { toCsv } from '../common/csv.util';

@Injectable()
export class EtudiantsAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Universite de l'acteur, ou null UNIQUEMENT si son role est explicitement
   * "super_admin" (verifie par nom de role, jamais devine depuis l'absence
   * d'universite). Tout autre utilisateur sans universite est refuse — ne pas
   * inferer un statut privilegie a partir d'un champ nullable.
   */
  private async getActeurUniversiteId(
    acteurId: string,
  ): Promise<string | null> {
    const u = await this.prisma.utilisateurs.findFirst({
      where: { id: acteurId },
      select: {
        universite_id: true,
        roles_utilisateurs_role_idToroles: { select: { nom: true } },
      },
    });
    if (u?.roles_utilisateurs_role_idToroles?.nom === 'super_admin')
      return null;
    if (!u?.universite_id) {
      throw new ForbiddenException("Vous n'êtes pas associé à une université");
    }
    return u.universite_id;
  }

  /**
   * Departements de l'acteur (many-to-many). Liste VIDE = aucune restriction
   * (compte "scolarite", ou directeur qui valide pour toute l'universite).
   * Une ou plusieurs entrees = compte restreint a ces departements pour la
   * lecture ET l'ecriture (cf. lister/creer/modifier ci-dessous).
   */
  private async getActeurDepartementIds(acteurId: string): Promise<string[]> {
    const u = await this.prisma.utilisateurs.findFirst({
      where: { id: acteurId },
      select: { departements: { select: { id: true } } },
    });
    return u?.departements.map((d) => d.id) ?? [];
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
      departement_id: e.departement_id ?? null,
      departement_nom: e.departements?.nom ?? null,
      nb_documents: e._count?.documents ?? 0,
      a_compte: Boolean(e.utilisateur_id),
      created_at: e.created_at,
      updated_at: e.updated_at,
    };
  }

  async lister(
    query: EtudiantAdminQueryDto,
    acteurId: string,
  ): Promise<EtudiantAdminListeDto> {
    const acteurUnivId = await this.getActeurUniversiteId(acteurId);
    const acteurDeptIds = await this.getActeurDepartementIds(acteurId);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = { deleted_at: null };

    if (acteurUnivId !== null) {
      where.universite_id = acteurUnivId;
    } else if (query.universite_id) {
      where.universite_id = query.universite_id;
    }

    // Chef de departement (un ou plusieurs) : restreint a ceux-ci, meme si un
    // autre filtre est demande. Scolarite / aucun departement associe : pas de restriction.
    if (acteurDeptIds.length > 0) {
      where.departement_id = query.departement_id
        ? // Le departement demande doit faire partie de ceux de l'acteur,
          // sinon aucun resultat (jamais elargir sa portee via le filtre).
          acteurDeptIds.includes(query.departement_id)
          ? query.departement_id
          : '__aucun__'
        : { in: acteurDeptIds };
    } else if (query.departement_id) {
      where.departement_id = query.departement_id;
    }

    if (query.annee_entree !== undefined) {
      where.annee_entree = query.annee_entree;
    }

    if (query.a_compte !== undefined) {
      where.utilisateur_id = query.a_compte ? { not: null } : null;
    }

    if (query.a_documents !== undefined) {
      where.documents = query.a_documents ? { some: {} } : { none: {} };
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
          departements: { select: { nom: true } },
          _count: { select: { documents: true } },
        },
      }),
    ]);

    return { data: items.map((e) => this.toDto(e)), total, page, limit };
  }

  /** Export CSV des étudiants visibles par l'acteur — mêmes filtres que lister(), plafonné à 10 000 lignes. */
  async exporterCsv(
    query: EtudiantAdminQueryDto,
    acteurId: string,
  ): Promise<string> {
    const { data } = await this.lister(
      { ...query, page: 1, limit: 10_000 },
      acteurId,
    );

    return toCsv(data, [
      { header: 'N° étudiant', value: (e) => e.numero_etudiant },
      { header: 'Nom', value: (e) => e.nom },
      { header: 'Prénom', value: (e) => e.prenom },
      { header: 'Email', value: (e) => e.email },
      { header: 'Université', value: (e) => e.universite_nom },
      { header: 'Département', value: (e) => e.departement_nom },
      { header: "Année d'entrée", value: (e) => e.annee_entree },
      { header: 'Compte activé', value: (e) => (e.a_compte ? 'Oui' : 'Non') },
      { header: 'Nb. documents', value: (e) => e.nb_documents },
      {
        header: 'Date de naissance',
        value: (e) => e.date_naissance?.toISOString().slice(0, 10),
      },
    ]);
  }

  async findOne(
    id: string,
    acteurId: string,
  ): Promise<EtudiantAdminResponseDto> {
    const acteurUnivId = await this.getActeurUniversiteId(acteurId);
    const acteurDeptIds = await this.getActeurDepartementIds(acteurId);

    const etudiant = await this.prisma.etudiants.findFirst({
      where: { id, deleted_at: null },
      include: {
        universites: { select: { nom: true, nom_court: true } },
        departements: { select: { nom: true } },
        _count: { select: { documents: true } },
      },
    });
    if (!etudiant) throw new NotFoundException(`Étudiant ${id} introuvable`);

    if (acteurUnivId !== null && etudiant.universite_id !== acteurUnivId) {
      throw new ForbiddenException(
        "Accès refusé : étudiant d'une autre université",
      );
    }
    if (
      acteurDeptIds.length > 0 &&
      !acteurDeptIds.includes(etudiant.departement_id ?? '')
    ) {
      throw new ForbiddenException(
        "Accès refusé : étudiant d'un autre département",
      );
    }

    return this.toDto(etudiant);
  }

  async creer(
    dto: CreerEtudiantAdminDto,
    acteurId: string,
    ip?: string,
  ): Promise<EtudiantAdminResponseDto> {
    const acteurUnivId = await this.getActeurUniversiteId(acteurId);
    const acteurDeptIds = await this.getActeurDepartementIds(acteurId);

    if (acteurUnivId !== null && dto.universite_id !== acteurUnivId) {
      throw new ForbiddenException(
        'Vous ne pouvez créer des étudiants que pour votre propre université',
      );
    }

    // Un chef de departement (un ou plusieurs) doit choisir l'un de SES departements —
    // la scolarite (aucun departement associe) peut choisir n'importe lequel de l'universite.
    if (
      acteurDeptIds.length > 0 &&
      (!dto.departement_id || !acteurDeptIds.includes(dto.departement_id))
    ) {
      throw new ForbiddenException(
        "Vous devez choisir l'un de vos départements autorisés",
      );
    }
    const departementId = dto.departement_id ?? null;

    const universite = await this.prisma.universites.findFirst({
      where: { id: dto.universite_id, statut: 'active', deleted_at: null },
    });
    if (!universite)
      throw new NotFoundException('Université introuvable ou non active');

    if (departementId) {
      const departement = await this.prisma.departements.findFirst({
        where: {
          id: departementId,
          universite_id: dto.universite_id,
          est_actif: true,
        },
      });
      if (!departement)
        throw new NotFoundException(
          'Département introuvable ou inactif pour cette université',
        );
    }

    const existant = await this.prisma.etudiants.findFirst({
      where: { numero_etudiant: dto.numero_etudiant, deleted_at: null },
    });
    if (existant)
      throw new ConflictException(
        `Le matricule "${dto.numero_etudiant}" est déjà utilisé`,
      );

    const etudiant = await this.prisma.etudiants.create({
      data: {
        numero_etudiant: dto.numero_etudiant,
        nom: dto.nom,
        prenom: dto.prenom,
        universite_id: dto.universite_id,
        departement_id: departementId,
        date_naissance: dto.date_naissance
          ? new Date(dto.date_naissance)
          : null,
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
        departements: { select: { nom: true } },
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

  async modifier(
    id: string,
    dto: UpdateEtudiantAdminDto,
    acteurId: string,
    ip?: string,
  ): Promise<EtudiantAdminResponseDto> {
    const acteurUnivId = await this.getActeurUniversiteId(acteurId);
    const acteurDeptIds = await this.getActeurDepartementIds(acteurId);

    const etudiant = await this.prisma.etudiants.findFirst({
      where: { id, deleted_at: null },
    });
    if (!etudiant) throw new NotFoundException(`Étudiant ${id} introuvable`);

    if (acteurUnivId !== null && etudiant.universite_id !== acteurUnivId) {
      throw new ForbiddenException(
        "Accès refusé : étudiant d'une autre université",
      );
    }
    if (
      acteurDeptIds.length > 0 &&
      !acteurDeptIds.includes(etudiant.departement_id ?? '')
    ) {
      throw new ForbiddenException(
        "Accès refusé : étudiant d'un autre département",
      );
    }

    if (
      dto.numero_etudiant &&
      dto.numero_etudiant !== etudiant.numero_etudiant
    ) {
      const doublon = await this.prisma.etudiants.findFirst({
        where: {
          numero_etudiant: dto.numero_etudiant,
          deleted_at: null,
          id: { not: id },
        },
      });
      if (doublon)
        throw new ConflictException(
          `Le matricule "${dto.numero_etudiant}" est déjà utilisé`,
        );
    }

    if (dto.departement_id) {
      const departement = await this.prisma.departements.findFirst({
        where: {
          id: dto.departement_id,
          universite_id: etudiant.universite_id,
          est_actif: true,
        },
      });
      if (!departement)
        throw new NotFoundException(
          'Département introuvable ou inactif pour cette université',
        );
      if (
        acteurDeptIds.length > 0 &&
        !acteurDeptIds.includes(dto.departement_id)
      ) {
        throw new ForbiddenException(
          "Vous devez choisir l'un de vos départements autorisés",
        );
      }
    }

    // Un chef de departement (scope limite) ne peut deplacer un etudiant que vers
    // l'un de SES departements (deja verifie ci-dessus) — la scolarite (aucun
    // departement associe) peut reassigner vers n'importe quel departement.
    const departementModifiable =
      acteurDeptIds.length === 0 || Boolean(dto.departement_id);

    const updated = await this.prisma.etudiants.update({
      where: { id },
      data: {
        ...(dto.numero_etudiant !== undefined && {
          numero_etudiant: dto.numero_etudiant,
        }),
        ...(dto.nom !== undefined && { nom: dto.nom }),
        ...(dto.prenom !== undefined && { prenom: dto.prenom }),
        ...(departementModifiable &&
          dto.departement_id !== undefined && {
            departement_id: dto.departement_id,
          }),
        ...(dto.date_naissance !== undefined && {
          date_naissance: dto.date_naissance
            ? new Date(dto.date_naissance)
            : null,
        }),
        ...(dto.lieu_naissance !== undefined && {
          lieu_naissance: dto.lieu_naissance,
        }),
        ...(dto.nationalite !== undefined && { nationalite: dto.nationalite }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.telephone !== undefined && { telephone: dto.telephone }),
        ...(dto.photo_url !== undefined && { photo_url: dto.photo_url }),
        ...(dto.annee_entree !== undefined && {
          annee_entree: dto.annee_entree,
        }),
      },
      include: {
        universites: { select: { nom: true, nom_court: true } },
        departements: { select: { nom: true } },
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
    const acteurDeptIds = await this.getActeurDepartementIds(acteurId);

    const etudiant = await this.prisma.etudiants.findFirst({
      where: { id, deleted_at: null },
      include: { _count: { select: { documents: true } } },
    });
    if (!etudiant) throw new NotFoundException(`Étudiant ${id} introuvable`);

    if (acteurUnivId !== null && etudiant.universite_id !== acteurUnivId) {
      throw new ForbiddenException(
        "Accès refusé : étudiant d'une autre université",
      );
    }
    if (
      acteurDeptIds.length > 0 &&
      !acteurDeptIds.includes(etudiant.departement_id ?? '')
    ) {
      throw new ForbiddenException(
        "Accès refusé : étudiant d'un autre département",
      );
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
