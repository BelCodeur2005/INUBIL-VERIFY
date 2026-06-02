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
}
