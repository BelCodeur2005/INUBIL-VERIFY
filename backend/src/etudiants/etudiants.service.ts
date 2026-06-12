import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { ProfilEtudiantDto } from './dto/profil-etudiant.dto';
import {
  DocumentEtudiantDto,
  DocumentsEtudiantQueryDto,
  DocumentsEtudiantListeDto,
  MatiereEtudiantDto,
} from './dto/document-etudiant-response.dto';
import { CreerPartageDto } from './dto/creer-partage.dto';
import { PartageResponseDto } from './dto/partage-response.dto';
import { StatistiquesEtudiantDto } from './dto/statistiques-etudiant.dto';

@Injectable()
export class EtudiantsService {
  private readonly logger = new Logger(EtudiantsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  // ─── Profil ────────────────────────────────────────────────────────────────

  async profil(userId: string): Promise<ProfilEtudiantDto> {
    const etudiant = await this.trouverEtudiantDuCompte(userId);
    return {
      id:               etudiant.id,
      numero_etudiant:  etudiant.numero_etudiant,
      nom:              etudiant.nom,
      prenom:           etudiant.prenom,
      email:            etudiant.email ?? null,
      telephone:        etudiant.telephone ?? null,
      photo_url:        etudiant.photo_url ?? null,
      date_naissance:   etudiant.date_naissance ?? null,
      lieu_naissance:   etudiant.lieu_naissance ?? null,
      nationalite:      etudiant.nationalite ?? null,
      annee_entree:     etudiant.annee_entree ?? null,
      universite:       (etudiant as any).universites.nom,
      universite_id:    etudiant.universite_id,
      created_at:       etudiant.created_at,
    };
  }

  // ─── Documents ─────────────────────────────────────────────────────────────

  async listerDocuments(
    userId: string,
    query: DocumentsEtudiantQueryDto,
  ): Promise<DocumentsEtudiantListeDto> {
    const etudiant = await this.trouverEtudiantDuCompte(userId);
    const page  = query.page  ?? 1;
    const limit = query.limit ?? 20;
    const skip  = (page - 1) * limit;

    const where = {
      etudiant_id: etudiant.id,
      deleted_at:  null,
      ...(query.statut ? { statut: query.statut as any } : {}),
    };

    const [docs, total] = await Promise.all([
      this.prisma.documents.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          types_document:    { select: { nom: true, categorie: true } },
          mentions_document: { select: { nom: true } },
          universites:       { select: { nom: true } },
          matieres_document: {
            orderBy: [{ semestre: 'asc' }, { ordre: 'asc' }],
            select: { nom_matiere: true, note: true, note_max: true, resultat: true, semestre: true },
          },
        },
      }),
      this.prisma.documents.count({ where }),
    ]);

    return {
      data:  docs.map((d) => this.formaterDocument(d)),
      total,
      page,
      limit,
    };
  }

  // ─── Partages ──────────────────────────────────────────────────────────────

  async creerPartage(
    userId: string,
    dto: CreerPartageDto,
  ): Promise<PartageResponseDto> {
    const etudiant = await this.trouverEtudiantDuCompte(userId);

    const doc = await this.prisma.documents.findFirst({
      where: { id: dto.document_id, etudiant_id: etudiant.id, deleted_at: null },
      include: { types_document: { select: { nom: true } }, universites: { select: { nom: true } } },
    });

    if (!doc) throw new NotFoundException('Document introuvable dans votre dossier');
    if (doc.statut !== 'actif') {
      throw new BadRequestException('Seuls les documents actifs peuvent être partagés');
    }

    const tokenAcces = randomBytes(32).toString('hex');
    const expiration = dto.date_expiration ? new Date(dto.date_expiration) : null;

    const partage = await this.prisma.partages_document.create({
      data: {
        document_id:                dto.document_id,
        etudiant_id:                etudiant.id,
        token_acces:                tokenAcces,
        email_destinataire_externe: dto.email_destinataire ?? null,
        universite_destinataire_id: dto.universite_destinataire_id ?? null,
        date_expiration:            expiration,
        statut:                     'actif',
      },
      include: {
        universites: { select: { nom: true } },
      },
    });

    const partageFormate = this.formaterPartage(partage, (doc as any).types_document.nom);

    // Notification email au destinataire externe (fire & forget)
    if (dto.email_destinataire) {
      const etudiant = await this.trouverEtudiantDuCompte(userId);
      const urlPartage = `https://verify.inubil.com/partages/${tokenAcces}`;
      this.mail
        .sendPartageCreé(dto.email_destinataire, {
          prenomNomEtudiant: `${etudiant.prenom} ${etudiant.nom}`,
          typeDocument:      (doc as any).types_document.nom,
          nomUniversite:     (doc as any).universites.nom,
          urlPartage,
          dateExpiration:    expiration,
        })
        .catch((err) =>
          this.logger.error(`Notification partage échouée vers ${dto.email_destinataire} : ${String(err)}`),
        );
    }

    return partageFormate;
  }

  async listerPartages(userId: string): Promise<PartageResponseDto[]> {
    const etudiant = await this.trouverEtudiantDuCompte(userId);

    const partages = await this.prisma.partages_document.findMany({
      where: { etudiant_id: etudiant.id, statut: 'actif' },
      orderBy: { created_at: 'desc' },
      include: {
        documents:  { select: { types_document: { select: { nom: true } } } },
        universites: { select: { nom: true } },
      },
    });

    return partages.map((p) => {
      const titrDoc = (p as any).documents?.types_document?.nom ?? '—';
      return this.formaterPartage(p, titrDoc);
    });
  }

  async revoquerPartage(
    partageId: string,
    userId: string,
  ): Promise<void> {
    const etudiant = await this.trouverEtudiantDuCompte(userId);

    const partage = await this.prisma.partages_document.findFirst({
      where: { id: partageId, etudiant_id: etudiant.id },
    });

    if (!partage) {
      throw new NotFoundException('Partage introuvable dans votre compte');
    }
    if (partage.statut !== 'actif') {
      throw new BadRequestException('Ce partage est déjà révoqué');
    }

    await this.prisma.partages_document.update({
      where: { id: partageId },
      data: {
        statut:      'revoque' as any,
        revoque_le:  new Date(),
        revoque_par: userId,
      },
    });
  }

  // ─── Statistiques ──────────────────────────────────────────────────────────

  async statistiques(userId: string): Promise<StatistiquesEtudiantDto> {
    const etudiant = await this.trouverEtudiantDuCompte(userId);
    const etudiantId = etudiant.id;
    const debutMois = new Date();
    debutMois.setDate(1);
    debutMois.setHours(0, 0, 0, 0);

    const [
      totalDocs,
      actifsDocs,
      enValidationDocs,
      revoquesDocs,
      totalVerifs,
      verifsMois,
      partagesActifs,
      partagesConsultations,
    ] = await Promise.all([
      this.prisma.documents.count({ where: { etudiant_id: etudiantId, deleted_at: null } }),
      this.prisma.documents.count({ where: { etudiant_id: etudiantId, statut: 'actif', deleted_at: null } }),
      this.prisma.documents.count({ where: { etudiant_id: etudiantId, statut: 'en_validation', deleted_at: null } }),
      this.prisma.documents.count({ where: { etudiant_id: etudiantId, statut: 'revoque', deleted_at: null } }),
      this.prisma.verifications.count({ where: { documents: { etudiant_id: etudiantId } } }),
      this.prisma.verifications.count({
        where: {
          documents: { etudiant_id: etudiantId },
          created_at: { gte: debutMois },
        },
      }),
      this.prisma.partages_document.count({ where: { etudiant_id: etudiantId, statut: 'actif' } }),
      this.prisma.partages_document.aggregate({
        where: { etudiant_id: etudiantId },
        _sum: { nb_consultations: true },
      }),
    ]);

    return {
      documents: {
        total:          totalDocs,
        actifs:         actifsDocs,
        en_validation:  enValidationDocs,
        revoques:       revoquesDocs,
      },
      verifications: {
        total:    totalVerifs,
        ce_mois:  verifsMois,
      },
      partages: {
        actifs:             partagesActifs,
        total_consultations: partagesConsultations._sum.nb_consultations ?? 0,
      },
    };
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private async trouverEtudiantDuCompte(userId: string) {
    const etudiant = await this.prisma.etudiants.findFirst({
      where: { utilisateur_id: userId, deleted_at: null },
      include: { universites: { select: { nom: true } } },
    });
    if (!etudiant) {
      throw new ForbiddenException('Aucun dossier étudiant lié à ce compte');
    }
    return etudiant;
  }

  private formaterDocument(d: any): DocumentEtudiantDto {
    const matieres: MatiereEtudiantDto[] = (d.matieres_document ?? []).map((m: any) => ({
      nom_matiere: m.nom_matiere,
      note:        m.note !== null ? Number(m.note) : null,
      note_max:    Number(m.note_max),
      resultat:    m.resultat,
      semestre:    m.semestre ?? null,
    }));

    return {
      id:               d.id,
      numero_unique:    d.numero_unique,
      type_document:    d.types_document.nom,
      categorie:        d.types_document.categorie,
      filiere:          d.filiere ?? null,
      annee_academique: d.annee_academique ?? null,
      date_emission:    d.date_emission ?? null,
      statut:           d.statut,
      mention:          d.mentions_document?.nom ?? null,
      moyenne_generale: d.moyenne_generale !== null ? Number(d.moyenne_generale) : null,
      url_verification: d.url_verification ?? null,
      matieres,
      universite:       d.universites.nom,
    };
  }

  private formaterPartage(p: any, titrDoc: string): PartageResponseDto {
    return {
      id:                      p.id,
      document_id:             p.document_id,
      document_titre:          titrDoc,
      token_acces:             p.token_acces,
      email_destinataire:      p.email_destinataire_externe ?? null,
      universite_destinataire: p.universites?.nom ?? null,
      date_expiration:         p.date_expiration ?? null,
      statut:                  p.statut,
      nb_consultations:        p.nb_consultations,
      derniere_consultation:   p.derniere_consultation ?? null,
      created_at:              p.created_at,
    };
  }
}
