import { Injectable, Logger } from '@nestjs/common';

/**
 * Service d'envoi d'emails.
 *
 * Implementation provisoire (#9) : pas encore de SMTP (branche en #25).
 * L'interface publique ne changera pas quand le SMTP reel sera ajoute.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  /** Email de reinitialisation de mot de passe. */
  async sendPasswordReset(destinataire: string, resetUrl: string): Promise<void> {
    // SECURITE : le lien de reset contient un token sensible (permet de changer
    // le mot de passe). On ne l'ecrit JAMAIS dans les logs en prod/staging.
    // En developpement uniquement, on l'affiche pour tester le flux sans SMTP.
    const env = process.env.NODE_ENV;
    const estProdOuStaging = env === 'production' || env === 'staging';

    if (estProdOuStaging) {
      // TODO #25 : envoi SMTP reel. Ici, on ne logue que le destinataire.
      this.logger.log(
        `Email de reinitialisation a envoyer a ${destinataire} (SMTP non configure).`,
      );
      return;
    }

    this.logger.warn(
      `[DEV-ONLY] Email simule — lien de reset pour ${destinataire} : ${resetUrl}`,
    );
  }

  /** Email de verification d'adresse (creation ou changement d'email). */
  async sendEmailVerification(destinataire: string, verifyUrl: string): Promise<void> {
    const env = process.env.NODE_ENV;
    const estProdOuStaging = env === 'production' || env === 'staging';

    if (estProdOuStaging) {
      this.logger.log(
        `Email de verification a envoyer a ${destinataire} (SMTP non configure).`,
      );
      return;
    }

    this.logger.warn(
      `[DEV-ONLY] Email simule — lien de verification pour ${destinataire} : ${verifyUrl}`,
    );
  }

  /** Email d'invitation collaborateur contenant le lien d'activation. */
  async sendInvitation(destinataire: string, activerUrl: string): Promise<void> {
    const env = process.env.NODE_ENV;
    const estProdOuStaging = env === 'production' || env === 'staging';

    if (estProdOuStaging) {
      this.logger.log(
        `Email d'invitation a envoyer a ${destinataire} (SMTP non configure).`,
      );
      return;
    }

    this.logger.warn(
      `[DEV-ONLY] Email simule — lien d'activation invitation pour ${destinataire} : ${activerUrl}`,
    );
  }

  /**
   * Notifie l'étudiant que son document officiel a été émis et certifié.
   * Contient le lien de vérification unique et l'invitation à accéder à l'espace étudiant.
   */
  async sendDocumentEmis(
    destinataire: string,
    data: {
      prenomNom: string;
      filiere: string;
      numeroUnique: string;
      urlVerification: string;
      nomUniversite: string;
    },
  ): Promise<void> {
    const env = process.env.NODE_ENV;
    const estProdOuStaging = env === 'production' || env === 'staging';

    if (estProdOuStaging) {
      this.logger.log(
        `Email d'émission de document à envoyer à ${destinataire} — doc ${data.numeroUnique}`,
      );
      return;
    }

    this.logger.warn(
      `[DEV-ONLY] Email simule — document émis pour ${destinataire}\n` +
      `  Étudiant : ${data.prenomNom}\n` +
      `  Filière  : ${data.filiere}\n` +
      `  Numéro   : ${data.numeroUnique}\n` +
      `  Vérif.   : ${data.urlVerification}`,
    );
  }

  /**
   * Notifie l'étudiant que son document a été révoqué par l'établissement.
   * Inclut le motif de révocation pour transparence.
   */
  async sendDocumentRévoqué(
    destinataire: string,
    data: {
      prenomNom: string;
      numeroUnique: string;
      typeDocument: string;
      nomUniversite: string;
      raison: string;
    },
  ): Promise<void> {
    const env = process.env.NODE_ENV;
    const estProdOuStaging = env === 'production' || env === 'staging';

    if (estProdOuStaging) {
      this.logger.log(
        `Email de révocation à envoyer à ${destinataire} — doc ${data.numeroUnique}`,
      );
      return;
    }

    this.logger.warn(
      `[DEV-ONLY] Email simulé — document révoqué pour ${destinataire}\n` +
      `  Étudiant : ${data.prenomNom}\n` +
      `  Numéro   : ${data.numeroUnique}\n` +
      `  Type     : ${data.typeDocument}\n` +
      `  Motif    : ${data.raison}`,
    );
  }

  /**
   * Notifie l'ancienne adresse qu'un changement d'email a ete demande.
   * Permet a l'utilisateur legitime de reagir si c'est frauduleux.
   */
  async sendEmailChangeNotification(
    ancienEmail: string,
    nouvelEmail: string,
  ): Promise<void> {
    const env = process.env.NODE_ENV;
    const estProdOuStaging = env === 'production' || env === 'staging';

    if (estProdOuStaging) {
      this.logger.log(
        `Notification de changement d'email a envoyer a ${ancienEmail} (SMTP non configure).`,
      );
      return;
    }

    this.logger.warn(
      `[DEV-ONLY] Email simule — notification changement d'adresse pour ${ancienEmail} vers ${nouvelEmail}`,
    );
  }
}
