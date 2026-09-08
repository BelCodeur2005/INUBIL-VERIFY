import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class NotificationEmissionService {
  private readonly logger = new Logger(NotificationEmissionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly notificationsInApp: NotificationsService,
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
        universites: { select: { nom: true } },
        types_document: { select: { nom: true } },
      },
    });

    if (!doc) {
      this.logger.warn(
        `notifierRevocation : document ${documentId} introuvable`,
      );
      return;
    }

    const destinataire =
      doc.etudiants.utilisateurs_etudiants_utilisateur_idToutilisateurs
        ?.email ?? doc.etudiants.email;

    if (!destinataire) {
      this.logger.warn(
        `notifierRevocation : aucun email pour l'étudiant ${doc.etudiants.id} - notification ignorée`,
      );
      return;
    }

    const prenomNom = `${doc.etudiants.prenom} ${doc.etudiants.nom}`;
    const parametres = {
      prenomNom,
      numeroUnique: doc.numero_unique,
      typeDocument: doc.types_document.nom,
      nomUniversite: doc.universites.nom,
      raison: (doc as any).raison_revocation ?? 'Motif non précisé',
    };

    const logEntry = await this.prisma.emails_log.create({
      data: {
        destinataire,
        sujet: `Votre document a été révoqué - ${doc.numero_unique}`,
        template: 'document_revoque',
        parametres,
        statut: 'en_attente',
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
          statut: 'echoue',
          tentatives: 1,
          erreur: err.message ?? 'Erreur inconnue',
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
      doc.etudiants.utilisateurs_etudiants_utilisateur_idToutilisateurs
        ?.email ?? doc.etudiants.email;

    if (!destinataire) {
      this.logger.warn(
        `notifierEtudiant : aucun email pour l'étudiant ${doc.etudiants.id} - notification ignorée`,
      );
      return;
    }

    const prenomNom = `${doc.etudiants.prenom} ${doc.etudiants.nom}`;
    const urlVerification =
      doc.url_verification ??
      `https://verify.inubil.com/d/${doc.numero_unique}`;
    const nomUniversite = doc.universites.nom;
    const filiere = doc.filiere ?? doc.types_document.nom;

    const parametres = {
      prenomNom,
      filiere,
      numeroUnique: doc.numero_unique,
      urlVerification,
      nomUniversite,
    };

    // Crée l'entrée de log en base avec statut en_attente
    const logEntry = await this.prisma.emails_log.create({
      data: {
        utilisateur_id: doc.etudiants
          .utilisateurs_etudiants_utilisateur_idToutilisateurs
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

  /**
   * Notifie les validateurs (directeur_pedagogique / responsable_universite) qu'un
   * dossier est pret a etre signe. Doit etre appele en fire & forget depuis
   * DocumentsService.uploadPdf() quand le document passe en "en_validation" :
   *   this.notif.notifierValidateurs(docId).catch(err => this.logger.error(...))
   * Un echec d'envoi ne doit jamais faire echouer l'upload.
   *
   * Destinataires : comptes de l'universite du document ayant le role
   * directeur_pedagogique ou responsable_universite, et soit sans departement
   * assigne (non restreints), soit assignes au departement de l'etudiant —
   * meme regle de scope que DocumentsService.lister().
   */
  async notifierValidateurs(documentId: string): Promise<void> {
    const doc = await this.prisma.documents.findFirst({
      where: { id: documentId },
      include: {
        etudiants: {
          select: { id: true, nom: true, prenom: true, departement_id: true },
        },
        universites: { select: { nom: true } },
        types_document: { select: { nom: true } },
      },
    });

    if (!doc) {
      this.logger.warn(
        `notifierValidateurs : document ${documentId} introuvable`,
      );
      return;
    }

    const validateurs = await this.prisma.utilisateurs.findMany({
      where: {
        universite_id: doc.universite_id,
        deleted_at: null,
        roles_utilisateurs_role_idToroles: {
          nom: { in: ['directeur_pedagogique', 'responsable_universite'] },
        },
        OR: [
          { departements: { none: {} } },
          ...(doc.etudiants.departement_id
            ? [{ departements: { some: { id: doc.etudiants.departement_id } } }]
            : []),
        ],
      },
      select: { id: true, email: true, prenom: true, nom: true },
    });

    if (validateurs.length === 0) {
      this.logger.warn(
        `notifierValidateurs : aucun validateur trouvé pour le document ${documentId} (université ${doc.universite_id})`,
      );
      return;
    }

    const prenomNomEtudiant = `${doc.etudiants.prenom} ${doc.etudiants.nom}`;
    const parametres = {
      prenomNomEtudiant,
      typeDocument: doc.types_document.nom,
      nomUniversite: doc.universites.nom,
      numeroUnique: doc.numero_unique,
      documentId: doc.id,
    };

    await Promise.all(
      validateurs.map(async (v) => {
        // Notification in-app — n'echoue jamais silencieusement le reste de la boucle
        await this.notificationsInApp
          .creer({
            utilisateurId: v.id,
            type: 'document_a_valider',
            titre: 'Dossier en attente de validation',
            message: `${prenomNomEtudiant} — ${doc.types_document.nom} (${doc.numero_unique}) est prêt à être signé.`,
            lien: `/universite/documents/${doc.id}`,
          })
          .catch((err) =>
            this.logger.error(
              `Notification in-app validateur ${v.id} échouée pour doc ${documentId} : ${err.message}`,
            ),
          );

        const logEntry = await this.prisma.emails_log.create({
          data: {
            utilisateur_id: v.id,
            destinataire: v.email,
            sujet: `Dossier à valider — ${doc.numero_unique}`,
            template: 'document_a_valider',
            parametres,
            statut: 'en_attente',
            max_tentatives: 3,
          },
        });

        try {
          await this.mail.sendDocumentAValider(v.email, parametres);
          await this.prisma.emails_log.update({
            where: { id: logEntry.id },
            data: { statut: 'envoye', tentatives: 1, envoye_le: new Date() },
          });
        } catch (err: any) {
          this.logger.error(
            `Échec envoi email validation doc ${documentId} vers ${v.email} : ${err.message}`,
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
      }),
    );
  }
}
