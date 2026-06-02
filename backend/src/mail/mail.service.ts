import { Injectable, Logger } from '@nestjs/common';

/**
 * Service d'envoi d'emails.
 *
 * Implementation provisoire (#9) : journalise le contenu au lieu d'envoyer un
 * vrai email, car le service SMTP n'est pas encore configure. Le branchement
 * SMTP reel (nodemailer) sera fait en #25 sans changer l'interface publique.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  /** Email de reinitialisation de mot de passe. */
  async sendPasswordReset(destinataire: string, resetUrl: string): Promise<void> {
    // TODO #25 : remplacer par un envoi SMTP reel.
    this.logger.log(
      `[DEV][MAIL] Reinitialisation de mot de passe pour ${destinataire} -> ${resetUrl}`,
    );
  }
}
