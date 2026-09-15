import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import { promises as dns } from 'dns';
import { ConfigurationsService } from '../configurations/configurations.service';

const NOM_APPLICATION_DEFAUT = 'INUBIL Verify';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly userParDefaut?: string;
  private readonly passParDefaut?: string;
  private readonly hostParDefaut?: string;
  private readonly portParDefaut: number;
  private readonly fromEmailParDefaut: string;

  constructor(
    private readonly config: ConfigService,
    private readonly configurations: ConfigurationsService,
  ) {
    this.userParDefaut = config.get<string>('MAIL_USER');
    this.passParDefaut = config.get<string>('MAIL_PASS');
    this.hostParDefaut = config.get<string>('MAIL_HOST');
    this.portParDefaut = config.get<number>('MAIL_PORT') ?? 587;
    this.fromEmailParDefaut =
      config.get<string>('MAIL_FROM') ?? 'noreply@inubil.com';
  }

  /**
   * Résout host/port/user/pass en préférant les paramètres système ("smtp_host" etc.,
   * modifiables depuis Paramètres > Email sans redéploiement), repli sur les variables
   * d'environnement (.env / Render). C'est la même logique pour l'auth que pour host/port/from
   * — avant ce changement, user/pass ne venaient QUE de l'env, ce qui rendait un mot de passe
   * SMTP obsolète impossible à corriger depuis l'app (il fallait passer par Render + redéploiement).
   */
  private async resoudreSmtp(): Promise<{
    host?: string;
    port: number;
    user?: string;
    pass?: string;
  }> {
    const [host, portBrut, user, pass] = await Promise.all([
      this.configurations.get('smtp_host', this.hostParDefaut),
      this.configurations.get('smtp_port', String(this.portParDefaut)),
      this.configurations.get('smtp_user', this.userParDefaut),
      this.configurations.get('smtp_pass', this.passParDefaut),
    ]);
    const port = Number(portBrut);
    return {
      host: host || this.hostParDefaut,
      port: Number.isFinite(port) && port > 0 ? port : this.portParDefaut,
      user: user || this.userParDefaut,
      pass: pass || this.passParDefaut,
    };
  }

  /** Nom affiché dans l'en-tête/pied des emails — parametre systeme "app_nom", repli sur le nom par defaut. */
  private async nomApplication(): Promise<string> {
    return (
      (await this.configurations.get('app_nom', NOM_APPLICATION_DEFAUT)) ??
      NOM_APPLICATION_DEFAUT
    );
  }

  /** Adresse "From" complete — parametre systeme "smtp_from_email" combine au nom d'application. */
  private async adresseExpediteur(): Promise<string> {
    const [nom, email] = await Promise.all([
      this.nomApplication(),
      this.configurations.get('smtp_from_email', this.fromEmailParDefaut),
    ]);
    return `${nom} <${email ?? this.fromEmailParDefaut}>`;
  }

  /** Échappe les caractères HTML spéciaux pour éviter toute injection dans les templates. */
  private esc(s: string): string {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  /** Valide que l'URL commence par http(s):// avant de l'injecter dans un href. */
  private safeUrl(url: string): string {
    return /^https?:\/\//i.test(url) ? this.esc(url) : '#';
  }

  private async envoyer(
    to: string,
    subject: string,
    html: string,
  ): Promise<void> {
    const { host, port, user, pass } = await this.resoudreSmtp();
    if (!host || !user || !pass) {
      this.logger.warn(
        `[MAIL SIMULÉ] À: ${to} | Sujet: ${subject} — SMTP non configuré (Paramètres > Email)`,
      );
      return;
    }
    const from = await this.adresseExpediteur();
    try {
      if (host.includes('resend.com')) {
        // Render bloque (ou filtre silencieusement) les connexions SMTP
        // sortantes (port 587/465), aussi bien vers Gmail que vers le relais
        // SMTP de Resend — meme avec la resolution IPv4 forcee ci-dessous,
        // on obtient un "Connection timeout" identique. L'API HTTP de Resend
        // (HTTPS, port 443) contourne totalement ce blocage reseau.
        const messageId = await this.envoyerViaResendApi(
          pass,
          from,
          to,
          subject,
          html,
        );
        this.logger.log(`Email envoyé à ${to} — messageId: ${messageId}`);
        return;
      }

      if (host.includes('sendgrid')) {
        // Meme raison que Resend ci-dessus (contournement du blocage SMTP de
        // Render) — utilise en plus le fait que SendGrid supporte la "Single
        // Sender Verification" (un seul expediteur verifie par email, sans
        // domaine), utile tant qu'aucun domaine propre n'est disponible.
        const messageId = await this.envoyerViaSendgridApi(
          pass,
          from,
          to,
          subject,
          html,
        );
        this.logger.log(`Email envoyé à ${to} — messageId: ${messageId}`);
        return;
      }

      // Render (et d'autres PaaS) n'ont pas de route IPv6 sortante. La
      // resolution DNS interne de nodemailer (shared.resolveHostname) tire
      // une adresse AU HASARD parmi les IPv4 et IPv6 trouvees pour l'hote —
      // une simple option "family" n'existe pas cote nodemailer et n'a donc
      // aucun effet. On resout nous-memes l'IPv4 et on la passe directement
      // comme "host" (une IP litterale saute toute la resolution interne),
      // avec tls.servername pour que la validation du certificat continue
      // de porter sur le vrai nom d'hote plutot que sur l'IP.
      let hostConnexion = host;
      let servername: string | undefined;
      try {
        const [ipv4] = await dns.resolve4(host);
        if (ipv4) {
          hostConnexion = ipv4;
          servername = host;
        }
      } catch {
        // Resolution IPv4 impossible (rare) : repli sur le nom d'hote tel quel.
      }

      const transporter: Transporter = nodemailer.createTransport({
        host: hostConnexion,
        port,
        secure: false,
        auth: { user, pass },
        ...(servername ? { tls: { servername } } : {}),
      });
      const info = await transporter.sendMail({ from, to, subject, html });
      this.logger.log(`Email envoyé à ${to} — messageId: ${info.messageId}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Échec envoi email à ${to} : ${msg}`);
    }
  }

  /** Envoie via l'API HTTP de Resend (https://resend.com/docs/api-reference/emails/send-email). */
  private async envoyerViaResendApi(
    apiKey: string,
    from: string,
    to: string,
    subject: string,
    html: string,
  ): Promise<string> {
    const reponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to, subject, html }),
    });
    if (!reponse.ok) {
      const corps = await reponse.text().catch(() => '');
      throw new Error(`Resend API ${reponse.status} : ${corps}`);
    }
    const donnees = (await reponse.json()) as { id: string };
    return donnees.id;
  }

  /** Decoupe une adresse "Nom <email>" (ou "email" seul) en ses deux parties. */
  private decouperExpediteur(from: string): { name?: string; email: string } {
    const correspondance = from.match(/^(.*)<(.+)>$/);
    if (!correspondance) return { email: from.trim() };
    return { name: correspondance[1].trim(), email: correspondance[2].trim() };
  }

  /** Envoie via l'API HTTP de SendGrid (https://docs.sendgrid.com/api-reference/mail-send/mail-send). */
  private async envoyerViaSendgridApi(
    apiKey: string,
    from: string,
    to: string,
    subject: string,
    html: string,
  ): Promise<string> {
    const reponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: this.decouperExpediteur(from),
        subject,
        content: [{ type: 'text/html', value: html }],
      }),
    });
    if (!reponse.ok) {
      const corps = await reponse.text().catch(() => '');
      throw new Error(`SendGrid API ${reponse.status} : ${corps}`);
    }
    return reponse.headers.get('x-message-id') ?? 'ok';
  }

  async sendPasswordReset(
    destinataire: string,
    resetUrl: string,
  ): Promise<void> {
    const nom = await this.nomApplication();
    const url = this.safeUrl(resetUrl);
    const html = `
<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<style>
  body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; }
  .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.1); }
  .header { background: #1a56db; padding: 30px; text-align: center; }
  .header h1 { color: #fff; margin: 0; font-size: 22px; }
  .body { padding: 32px; color: #333; line-height: 1.6; }
  .btn { display: inline-block; margin: 24px 0; padding: 14px 32px; background: #1a56db; color: #fff !important; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; }
  .footer { padding: 20px 32px; background: #f9fafb; font-size: 12px; color: #888; border-top: 1px solid #e5e7eb; }
  .warning { background: #fff3cd; border: 1px solid #ffc107; border-radius: 6px; padding: 12px 16px; margin-top: 20px; font-size: 13px; color: #856404; }
</style></head><body>
<div class="container">
  <div class="header"><h1>🔐 ${nom}</h1></div>
  <div class="body">
    <h2>Réinitialisation de votre mot de passe</h2>
    <p>Vous avez demandé une réinitialisation de mot de passe pour votre compte INUBIL Verify.</p>
    <p>Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe :</p>
    <a href="${url}" class="btn">Réinitialiser mon mot de passe</a>
    <div class="warning">
      ⚠️ Ce lien est valable <strong>1 heure</strong>. Si vous n'avez pas fait cette demande, ignorez cet email — votre compte reste sécurisé.
    </div>
    <p style="margin-top:20px; font-size:13px; color:#666;">Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>
    <code style="word-break:break-all; font-size:12px;">${url}</code></p>
  </div>
  <div class="footer">${nom} — Plateforme de certification blockchain des diplômes · Douala, Cameroun</div>
</div>
</body></html>`;
    await this.envoyer(
      destinataire,
      'Réinitialisation de votre mot de passe — INUBIL Verify',
      html,
    );
  }

  async sendEmailVerification(
    destinataire: string,
    verifyUrl: string,
  ): Promise<void> {
    const nom = await this.nomApplication();
    const url = this.safeUrl(verifyUrl);
    const html = `
<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<style>
  body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; }
  .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.1); }
  .header { background: #1a56db; padding: 30px; text-align: center; }
  .header h1 { color: #fff; margin: 0; font-size: 22px; }
  .body { padding: 32px; color: #333; line-height: 1.6; }
  .btn { display: inline-block; margin: 24px 0; padding: 14px 32px; background: #059669; color: #fff !important; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; }
  .footer { padding: 20px 32px; background: #f9fafb; font-size: 12px; color: #888; border-top: 1px solid #e5e7eb; }
</style></head><body>
<div class="container">
  <div class="header"><h1>✅ ${nom}</h1></div>
  <div class="body">
    <h2>Confirmez votre adresse email</h2>
    <p>Bienvenue sur INUBIL Verify ! Pour activer votre compte, veuillez confirmer votre adresse email en cliquant sur le bouton ci-dessous :</p>
    <a href="${url}" class="btn">Vérifier mon email</a>
    <p style="font-size:13px; color:#666;">Ce lien est valable <strong>24 heures</strong>. Si vous n'avez pas créé de compte sur INUBIL Verify, ignorez cet email.</p>
    <p style="font-size:13px; color:#666;">Lien direct :<br>
    <code style="word-break:break-all; font-size:12px;">${url}</code></p>
  </div>
  <div class="footer">${nom} — Plateforme de certification blockchain des diplômes · Douala, Cameroun</div>
</div>
</body></html>`;
    await this.envoyer(
      destinataire,
      'Confirmez votre adresse email — INUBIL Verify',
      html,
    );
  }

  async sendInvitation(
    destinataire: string,
    activerUrl: string,
  ): Promise<void> {
    const nom = await this.nomApplication();
    const url = this.safeUrl(activerUrl);
    const html = `
<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<style>
  body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; }
  .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.1); }
  .header { background: #7c3aed; padding: 30px; text-align: center; }
  .header h1 { color: #fff; margin: 0; font-size: 22px; }
  .body { padding: 32px; color: #333; line-height: 1.6; }
  .btn { display: inline-block; margin: 24px 0; padding: 14px 32px; background: #7c3aed; color: #fff !important; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; }
  .info { background: #f3f4f6; border-radius: 6px; padding: 16px; margin: 16px 0; }
  .footer { padding: 20px 32px; background: #f9fafb; font-size: 12px; color: #888; border-top: 1px solid #e5e7eb; }
</style></head><body>
<div class="container">
  <div class="header"><h1>🎓 ${nom}</h1></div>
  <div class="body">
    <h2>Vous avez été invité à rejoindre INUBIL Verify</h2>
    <p>Un administrateur vous a invité à rejoindre la plateforme INUBIL Verify en tant que collaborateur.</p>
    <div class="info">
      <strong>INUBIL Verify</strong> est la plateforme officielle de certification et de vérification blockchain des diplômes au Cameroun.
    </div>
    <p>Cliquez ci-dessous pour créer votre compte et accéder à la plateforme :</p>
    <a href="${url}" class="btn">Activer mon compte</a>
    <p style="font-size:13px; color:#e53e3e;"><strong>⚠️ Ce lien est valable 72 heures.</strong> Passé ce délai, contactez votre administrateur pour une nouvelle invitation.</p>
    <p style="font-size:13px; color:#666;">Lien direct :<br>
    <code style="word-break:break-all; font-size:12px;">${url}</code></p>
  </div>
  <div class="footer">${nom} — Plateforme de certification blockchain des diplômes · Douala, Cameroun</div>
</div>
</body></html>`;
    await this.envoyer(
      destinataire,
      'Invitation à rejoindre INUBIL Verify',
      html,
    );
  }

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
    const nom = await this.nomApplication();
    const prenomNom = this.esc(data.prenomNom);
    const filiere = this.esc(data.filiere);
    const numeroUnique = this.esc(data.numeroUnique);
    const nomUniversite = this.esc(data.nomUniversite);
    const urlVerification = this.safeUrl(data.urlVerification);

    const html = `
<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<style>
  body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; }
  .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.1); }
  .header { background: #065f46; padding: 30px; text-align: center; }
  .header h1 { color: #fff; margin: 0; font-size: 22px; }
  .body { padding: 32px; color: #333; line-height: 1.6; }
  .diploma-card { background: linear-gradient(135deg, #065f46 0%, #059669 100%); color: #fff; border-radius: 8px; padding: 24px; margin: 20px 0; text-align: center; }
  .diploma-card .ref { font-size: 28px; font-weight: bold; letter-spacing: 2px; margin: 8px 0; }
  .diploma-card .filiere { font-size: 14px; opacity: .85; }
  .btn { display: inline-block; margin: 24px 0; padding: 14px 32px; background: #059669; color: #fff !important; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; }
  .blockchain-badge { background: #f0fdf4; border: 1px solid #86efac; border-radius: 6px; padding: 12px 16px; font-size: 13px; color: #166534; margin-top: 16px; }
  .footer { padding: 20px 32px; background: #f9fafb; font-size: 12px; color: #888; border-top: 1px solid #e5e7eb; }
</style></head><body>
<div class="container">
  <div class="header"><h1>🎓 ${nom}</h1></div>
  <div class="body">
    <h2>Votre diplôme a été certifié !</h2>
    <p>Félicitations <strong>${prenomNom}</strong> !</p>
    <p>Votre diplôme délivré par <strong>${nomUniversite}</strong> a été certifié et enregistré sur la blockchain Polygon.</p>
    <div class="diploma-card">
      <div class="filiere">${filiere}</div>
      <div class="ref">${numeroUnique}</div>
      <div class="filiere">${nomUniversite}</div>
    </div>
    <div class="blockchain-badge">
      🔗 <strong>Certifié sur blockchain Polygon</strong> — Ce diplôme est authentifié de manière permanente et infalsifiable.
    </div>
    <p style="margin-top: 20px;">N'importe quel recruteur ou institution peut vérifier l'authenticité de votre diplôme en un seul clic :</p>
    <a href="${urlVerification}" class="btn">Voir mon diplôme en ligne</a>
    <p style="font-size:13px; color:#666;">Lien de vérification permanent :<br>
    <code style="word-break:break-all; font-size:12px;">${urlVerification}</code></p>
  </div>
  <div class="footer">${nom} — Plateforme de certification blockchain des diplômes · Douala, Cameroun</div>
</div>
</body></html>`;
    await this.envoyer(
      destinataire,
      `Votre diplôme ${data.numeroUnique} a été certifié — INUBIL Verify`,
      html,
    );
  }

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
    const nom = await this.nomApplication();
    const prenomNom = this.esc(data.prenomNom);
    const numeroUnique = this.esc(data.numeroUnique);
    const typeDocument = this.esc(data.typeDocument);
    const nomUniversite = this.esc(data.nomUniversite);
    const raison = this.esc(data.raison);

    const html = `
<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<style>
  body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; }
  .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.1); }
  .header { background: #b91c1c; padding: 30px; text-align: center; }
  .header h1 { color: #fff; margin: 0; font-size: 22px; }
  .body { padding: 32px; color: #333; line-height: 1.6; }
  .alert { background: #fef2f2; border: 1px solid #fca5a5; border-radius: 6px; padding: 16px; margin: 16px 0; }
  .motif { background: #f3f4f6; border-left: 4px solid #b91c1c; padding: 12px 16px; margin: 16px 0; font-style: italic; }
  .footer { padding: 20px 32px; background: #f9fafb; font-size: 12px; color: #888; border-top: 1px solid #e5e7eb; }
</style></head><body>
<div class="container">
  <div class="header"><h1>⚠️ ${nom}</h1></div>
  <div class="body">
    <h2>Notification de révocation de diplôme</h2>
    <p>Bonjour <strong>${prenomNom}</strong>,</p>
    <div class="alert">
      Nous vous informons que votre <strong>${typeDocument}</strong> (référence <strong>${numeroUnique}</strong>)
      délivré par <strong>${nomUniversite}</strong> a été <strong>révoqué</strong>.
    </div>
    <p><strong>Motif de révocation :</strong></p>
    <div class="motif">${raison}</div>
    <p>Ce diplôme ne sera plus reconnu comme valide sur la plateforme INUBIL Verify. Si vous estimez que cette révocation est une erreur, veuillez contacter directement votre établissement.</p>
  </div>
  <div class="footer">${nom} — Plateforme de certification blockchain des diplômes · Douala, Cameroun</div>
</div>
</body></html>`;
    await this.envoyer(
      destinataire,
      `Information importante concernant votre diplôme ${data.numeroUnique}`,
      html,
    );
  }

  /** Notification interne (staff) — dossier pret a etre valide/signe. Format sobre, sans emoji ni couleurs vives. */
  async sendDocumentAValider(
    destinataire: string,
    data: {
      prenomNomEtudiant: string;
      typeDocument: string;
      nomUniversite: string;
      numeroUnique: string;
      documentId: string;
    },
  ): Promise<void> {
    const nom = await this.nomApplication();
    const prenomNomEtudiant = this.esc(data.prenomNomEtudiant);
    const typeDocument = this.esc(data.typeDocument);
    const nomUniversite = this.esc(data.nomUniversite);
    const numeroUnique = this.esc(data.numeroUnique);
    const frontendUrl =
      this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:5173';
    const url = this.safeUrl(
      `${frontendUrl}/universite/documents/${data.documentId}`,
    );

    const html = `
<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<style>
  body { font-family: Arial, Helvetica, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; }
  .container { max-width: 600px; margin: 0 auto; background: #fff; border: 1px solid #e2e8f0; }
  .header { border-top: 4px solid #2b56cb; padding: 24px 32px 16px 32px; }
  .header .app { font-size: 13px; font-weight: bold; color: #2b56cb; letter-spacing: .3px; margin: 0 0 4px 0; }
  .header h1 { color: #0b192c; margin: 0; font-size: 18px; font-weight: 600; }
  .body { padding: 8px 32px 32px 32px; color: #333; line-height: 1.6; font-size: 14px; }
  table.recap { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px; }
  table.recap td { padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
  table.recap td:first-child { color: #64748b; width: 40%; }
  table.recap td:last-child { color: #0b192c; font-weight: 600; }
  .btn { display: inline-block; margin: 8px 0 4px 0; padding: 11px 24px; background: #2b56cb; color: #fff !important; text-decoration: none; border-radius: 4px; font-weight: 600; font-size: 14px; }
  .footer { padding: 16px 32px; background: #f9fafb; font-size: 11px; color: #94a3b8; border-top: 1px solid #e5e7eb; }
</style></head><body>
<div class="container">
  <div class="header">
    <p class="app">${nom}</p>
    <h1>Dossier en attente de validation</h1>
  </div>
  <div class="body">
    <p>Un dossier a été soumis et est prêt à être vérifié.</p>
    <table class="recap">
      <tr><td>Étudiant</td><td>${prenomNomEtudiant}</td></tr>
      <tr><td>Document</td><td>${typeDocument}</td></tr>
      <tr><td>Référence</td><td>${numeroUnique}</td></tr>
      <tr><td>Établissement</td><td>${nomUniversite}</td></tr>
    </table>
    <a href="${url}" class="btn">Consulter le dossier</a>
    <p style="margin-top:24px; font-size:12px; color:#666;">Lien direct :<br>
    <code style="word-break:break-all; font-size:11px;">${url}</code></p>
  </div>
  <div class="footer">${nom} — Plateforme de certification blockchain des diplômes · Douala, Cameroun</div>
</div>
</body></html>`;
    await this.envoyer(
      destinataire,
      `Dossier à valider — ${data.numeroUnique}`,
      html,
    );
  }

  /** Notification interne (staff) — decision (validation/rejet) sur un dossier saisi. Format sobre. */
  async sendDocumentTraiteParStaff(
    destinataire: string,
    data: {
      prenomNomEtudiant: string;
      typeDocument: string;
      numeroUnique: string;
      decision: 'valide' | 'rejete';
      motifRejet?: string;
    },
  ): Promise<void> {
    const nom = await this.nomApplication();
    const prenomNomEtudiant = this.esc(data.prenomNomEtudiant);
    const typeDocument = this.esc(data.typeDocument);
    const numeroUnique = this.esc(data.numeroUnique);
    const estValide = data.decision === 'valide';
    const accent = estValide ? '#16a34a' : '#a5680f';
    const titre = estValide ? 'Document validé' : 'Document rejeté';
    const motifRejet = data.motifRejet ? this.esc(data.motifRejet) : null;

    const html = `
<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<style>
  body { font-family: Arial, Helvetica, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; }
  .container { max-width: 600px; margin: 0 auto; background: #fff; border: 1px solid #e2e8f0; }
  .header { border-top: 4px solid ${accent}; padding: 24px 32px 16px 32px; }
  .header .app { font-size: 13px; font-weight: bold; color: #2b56cb; letter-spacing: .3px; margin: 0 0 4px 0; }
  .header h1 { color: #0b192c; margin: 0; font-size: 18px; font-weight: 600; }
  .body { padding: 8px 32px 32px 32px; color: #333; line-height: 1.6; font-size: 14px; }
  table.recap { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px; }
  table.recap td { padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
  table.recap td:first-child { color: #64748b; width: 40%; }
  table.recap td:last-child { color: #0b192c; font-weight: 600; }
  .motif { background: #f9fafb; border-left: 3px solid ${accent}; padding: 10px 14px; margin: 16px 0; font-size: 13px; }
  .footer { padding: 16px 32px; background: #f9fafb; font-size: 11px; color: #94a3b8; border-top: 1px solid #e5e7eb; }
</style></head><body>
<div class="container">
  <div class="header">
    <p class="app">${nom}</p>
    <h1>${titre}</h1>
  </div>
  <div class="body">
    <p>Le dossier que vous avez saisi a été ${estValide ? 'validé et certifié' : 'rejeté'}.</p>
    <table class="recap">
      <tr><td>Étudiant</td><td>${prenomNomEtudiant}</td></tr>
      <tr><td>Document</td><td>${typeDocument}</td></tr>
      <tr><td>Référence</td><td>${numeroUnique}</td></tr>
    </table>
    ${motifRejet ? `<div class="motif"><strong>Motif du rejet :</strong> ${motifRejet}</div>` : ''}
  </div>
  <div class="footer">${nom} — Plateforme de certification blockchain des diplômes · Douala, Cameroun</div>
</div>
</body></html>`;
    await this.envoyer(destinataire, `${titre} — ${data.numeroUnique}`, html);
  }

  async sendPartageCreé(
    destinataire: string,
    data: {
      prenomNomEtudiant: string;
      typeDocument: string;
      nomUniversite: string;
      urlPartage: string;
      dateExpiration: Date | null;
    },
  ): Promise<void> {
    const nom = await this.nomApplication();
    const prenomNomEtudiant = this.esc(data.prenomNomEtudiant);
    const typeDocument = this.esc(data.typeDocument);
    const nomUniversite = this.esc(data.nomUniversite);
    const urlPartage = this.safeUrl(data.urlPartage);
    const expInfo = data.dateExpiration
      ? `Ce lien expire le <strong>${this.esc(data.dateExpiration.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }))}</strong>.`
      : "Ce lien n'a pas de date d'expiration.";

    const html = `
<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<style>
  body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; }
  .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.1); }
  .header { background: #1d4ed8; padding: 30px; text-align: center; }
  .header h1 { color: #fff; margin: 0; font-size: 22px; }
  .body { padding: 32px; color: #333; line-height: 1.6; }
  .info-card { background: #eff6ff; border: 1px solid #93c5fd; border-radius: 6px; padding: 16px; margin: 16px 0; }
  .btn { display: inline-block; margin: 24px 0; padding: 14px 32px; background: #1d4ed8; color: #fff !important; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; }
  .footer { padding: 20px 32px; background: #f9fafb; font-size: 12px; color: #888; border-top: 1px solid #e5e7eb; }
</style></head><body>
<div class="container">
  <div class="header"><h1>📎 ${nom}</h1></div>
  <div class="body">
    <h2>Un document a été partagé avec vous</h2>
    <p><strong>${prenomNomEtudiant}</strong> vous partage son document académique :</p>
    <div class="info-card">
      <strong>${typeDocument}</strong><br>
      Délivré par : ${nomUniversite}<br>
      Certifié et vérifié sur blockchain Polygon ✅
    </div>
    <p>${expInfo}</p>
    <a href="${urlPartage}" class="btn">Consulter le document</a>
    <p style="font-size:13px; color:#666;">Lien direct :<br>
    <code style="word-break:break-all; font-size:12px;">${urlPartage}</code></p>
  </div>
  <div class="footer">${nom} — Plateforme de certification blockchain des diplômes · Douala, Cameroun</div>
</div>
</body></html>`;
    await this.envoyer(
      destinataire,
      `${data.prenomNomEtudiant} vous partage son ${data.typeDocument} — INUBIL Verify`,
      html,
    );
  }

  async sendEmailChangeNotification(
    ancienEmail: string,
    nouvelEmail: string,
  ): Promise<void> {
    const nom = await this.nomApplication();
    const ancienEmailEsc = this.esc(ancienEmail);
    const nouvelEmailEsc = this.esc(nouvelEmail);

    const html = `
<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<style>
  body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; }
  .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.1); }
  .header { background: #d97706; padding: 30px; text-align: center; }
  .header h1 { color: #fff; margin: 0; font-size: 22px; }
  .body { padding: 32px; color: #333; line-height: 1.6; }
  .warning { background: #fffbeb; border: 1px solid #fcd34d; border-radius: 6px; padding: 16px; margin: 16px 0; }
  .footer { padding: 20px 32px; background: #f9fafb; font-size: 12px; color: #888; border-top: 1px solid #e5e7eb; }
</style></head><body>
<div class="container">
  <div class="header"><h1>🔔 ${nom}</h1></div>
  <div class="body">
    <h2>Demande de changement d'email</h2>
    <p>Une demande de changement d'adresse email a été effectuée sur votre compte INUBIL Verify.</p>
    <div class="warning">
      <strong>Ancienne adresse :</strong> ${ancienEmailEsc}<br>
      <strong>Nouvelle adresse :</strong> ${nouvelEmailEsc}<br><br>
      Un email de confirmation a été envoyé à la nouvelle adresse. Le changement sera effectif après confirmation.
    </div>
    <p>Si vous n'avez <strong>pas</strong> effectué cette demande, votre compte pourrait être compromis. Contactez immédiatement le support INUBIL.</p>
  </div>
  <div class="footer">${nom} — Plateforme de certification blockchain des diplômes · Douala, Cameroun</div>
</div>
</body></html>`;
    await this.envoyer(
      ancienEmail,
      "Demande de changement d'email sur votre compte INUBIL Verify",
      html,
    );
  }
}
