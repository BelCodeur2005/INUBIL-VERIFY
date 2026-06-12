import { Injectable, NotFoundException, GoneException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  PartagePublicResponseDto,
  DocumentPartageDto,
  MatierePartageDto,
} from './dto/partage-public-response.dto';

@Injectable()
export class PublicPartagesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Accès public à un document partagé via son token.
   * Vérifie le statut et l'expiration, incrémente nb_consultations.
   * Aucune authentification requise — le token 64-chars hex est la preuve d'accès.
   */
  async accederParToken(token: string): Promise<PartagePublicResponseDto> {
    const partage = await this.prisma.partages_document.findFirst({
      where: { token_acces: token },
      include: {
        documents: {
          include: {
            etudiants:         { select: { prenom: true, nom: true } },
            universites:       { select: { nom: true } },
            types_document:    { select: { nom: true, categorie: true } },
            mentions_document: { select: { nom: true } },
            matieres_document: {
              orderBy: [{ semestre: 'asc' }, { ordre: 'asc' }],
              select: { nom_matiere: true, note: true, note_max: true, resultat: true, semestre: true },
            },
          },
        },
      },
    });

    if (!partage) {
      throw new NotFoundException('Lien de partage introuvable ou invalide');
    }

    // Token révoqué → même message que introuvable (sécurité : pas de révélation d'état)
    if (partage.statut === 'revoque') {
      throw new NotFoundException('Lien de partage introuvable ou invalide');
    }

    // Expiration : si date dépassée → auto-expire + 410 Gone
    if (partage.date_expiration && partage.date_expiration < new Date()) {
      if (partage.statut === 'actif') {
        await this.prisma.partages_document.update({
          where: { id: partage.id },
          data: { statut: 'expire' as any },
        });
      }
      throw new GoneException('Ce lien de partage a expiré');
    }

    if (partage.statut === 'expire') {
      throw new GoneException('Ce lien de partage a expiré');
    }

    // Incrémenter le compteur de consultations
    const maintenant = new Date();
    await this.prisma.partages_document.update({
      where: { id: partage.id },
      data: {
        nb_consultations:     { increment: 1 },
        derniere_consultation: maintenant,
      },
    });

    const doc = partage.documents;

    const matieres: MatierePartageDto[] = (doc.matieres_document ?? []).map((m) => ({
      nom_matiere: m.nom_matiere,
      note:        m.note !== null ? Number(m.note) : null,
      note_max:    Number(m.note_max),
      resultat:    m.resultat,
      semestre:    m.semestre ?? null,
    }));

    const documentDto: DocumentPartageDto = {
      numero_unique:    doc.numero_unique,
      type_document:    (doc as any).types_document.nom,
      categorie:        (doc as any).types_document.categorie,
      filiere:          doc.filiere ?? null,
      annee_academique: doc.annee_academique ?? null,
      date_emission:    doc.date_emission,
      etudiant_nom:     `${(doc as any).etudiants.prenom} ${(doc as any).etudiants.nom}`,
      mention:          (doc as any).mentions_document?.nom ?? null,
      moyenne_generale: doc.moyenne_generale !== null ? Number(doc.moyenne_generale) : null,
      matieres,
      universite:       (doc as any).universites.nom,
      statut:           doc.statut,
      url_verification: doc.url_verification ?? null,
    };

    return {
      document: documentDto,
      partage: {
        date_expiration:  partage.date_expiration ?? null,
        nb_consultations: partage.nb_consultations + 1,
      },
    };
  }
}
