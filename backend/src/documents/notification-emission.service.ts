import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class NotificationEmissionService {
  private readonly logger = new Logger(NotificationEmissionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  /**
   * Notifie l'étudiant que son document a été révoqué par l'établissement.
   * Doit être appelé en fire & forget depuis DocumentsService.revoquer() :
   *   this.notif.notifierRevocation(docId).catch(err => this.logger.error(...))
   * Un échec d'envoi ne doit jamais faire échouer la révocation.
   */
  async notifierRevocation(documentId: string): Promise<void> {
    const doc = await this.prisma.documents.findFirst({
      where: { id: documentId },
      include: {
        etudiants: {
          include: {
            utilisateurs_etudiants_utilisateur_idToutilisateurs: {
              select: { email: true },
            },
          },
        },
        universites:    { select: { nom: true } },
        types_document: { select: { nom: true } },
      },
    });

    if (!doc) {
      this.logger.warn(`notifierRevocation : document ${documentId} introuvable`);
      return;
    }

    const destinataire =
      doc.etudiants.utilisateurs_etudiants_utilisateur_idToutilisateurs?.email ??
      doc.etudiants.email;

    if (!destinataire) {
      this.logger.warn(
        `notifierRevocation : aucun email pour l'étudiant ${doc.etudiants.id} - notification ignorée`,
      );
      return;
    }

    const prenomNom   = `${doc.etudiants.prenom} ${doc.etudiants.nom}`;
    const parametres  = {
      prenomNom,
      numeroUnique:  doc.numero_unique,
      typeDocument:  doc.types_document.nom,
      nomUniversite: doc.universites.nom,
      raison:        (doc as any).raison_revocation ?? 'Motif non précisé',
    };

    const logEntry = await this.prisma.emails_log.create({
      data: {
        destinataire,
        sujet:         `Votre document a été révoqué - ${doc.numero_unique}`,
        template:      'document_revoque',
        parametres,
        statut:        'en_attente',
        max_tentatives: 3,
      },
    });

    try {
      await this.mail.sendDocumentRévoqué(destinataire, parametres);

      await this.prisma.emails_log.update({
        where: { id: logEntry.id },
        data: { statut: 'envoye', tentatives: 1, envoye_le: new Date() },
      });
    } catch (err: any) {
      this.logger.error(
        `Échec envoi email révocation doc ${documentId} vers ${destinataire} : ${err.message}`,
      );

      await this.prisma.emails_log.update({
        where: { id: logEntry.id },
        data: {
          statut:     'echoue',
          tentatives: 1,
          erreur:     err.message ?? 'Erreur inconnue',
        },
      });
    }
  }

  /**
   * Notifie l'étudiant que son document a été émis et certifié.
   * Doit être appelé en fire & forget depuis DocumentsService.valider() :
   *   this.notif.notifierEtudiant(docId).catch(err => this.logger.error(...))
   * Un échec d'envoi ne doit jamais faire échouer la validation.
   */
  async notifierEtudiant(documentId: string): Promise<void> {
    // Charge le document avec les données étudiant et université
    const doc = await this.prisma.documents.findFirst({
      where: { id: documentId },
      include: {
        etudiants: {
          include: {
            utilisateurs_etudiants_utilisateur_idToutilisateurs: {
              select: { email: true },
            },
          },
        },
        universites: { select: { nom: true } },
        types_document: { select: { nom: true } },
      },
    });

    if (!doc) {
      this.logger.warn(`notifierEtudiant : document ${documentId} introuvable`);
      return;
    }

    // Priorité : email du compte utilisateur lié, sinon email direct sur l'étudiant
    const destinataire =
      doc.etudiants.utilisateurs_etudiants_utilisateur_idToutilisateurs?.email ??
      doc.etudiants.email;

    if (!destinataire) {
      this.logger.warn(
        `notifierEtudiant : aucun email pour l'étudiant ${doc.etudiants.id} - notification ignorée`,
      );
      return;
    }

    const prenomNom = `${doc.etudiants.prenom} ${doc.etudiants.nom}`;
    const urlVerification = doc.url_verification ?? `https://verify.inubil.com/d/${doc.numero_unique}`;
    const nomUniversite = doc.universites.nom;
    const filiere = doc.filiere ?? doc.types_document.nom;

    const parametres = { prenomNom, filiere, numeroUnique: doc.numero_unique, urlVerification, nomUniversite };

    // Crée l'entrée de log en base avec statut en_attente
    const logEntry = await this.prisma.emails_log.create({
      data: {
        utilisateur_id: doc.etudiants.utilisateurs_etudiants_utilisateur_idToutilisateurs
          ? undefined // sera résolu via la relation si besoin
          : undefined,
        destinataire,
        sujet: `Votre document officiel a été émis - ${doc.numero_unique}`,
        template: 'document_emis',
        parametres,
        statut: 'en_attente',
        max_tentatives: 3,
      },
    });

    try {
      await this.mail.sendDocumentEmis(destinataire, parametres);

      await this.prisma.emails_log.update({
        where: { id: logEntry.id },
        data: { statut: 'envoye', tentatives: 1, envoye_le: new Date() },
      });
    } catch (err: any) {
      this.logger.error(
        `Échec envoi email émission doc ${documentId} vers ${destinataire} : ${err.message}`,
      );

      await this.prisma.emails_log.update({
        where: { id: logEntry.id },
        data: {
          statut: 'echoue',
          tentatives: 1,
          erreur: err.message ?? 'Erreur inconnue',
        },
      });
    }
  }
}
