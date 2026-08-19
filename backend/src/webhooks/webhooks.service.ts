import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { randomBytes, createHmac } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreerWebhookDto } from './dto/creer-webhook.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';
import {
  WebhookResponseDto,
  WebhookLivraisonResponseDto,
} from './dto/webhook-response.dto';
import { assertSafeWebhookUrl, safeWebhookFetch } from './webhook-url-guard';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private toDto(w: any): WebhookResponseDto {
    return {
      id: w.id,
      universite_id: w.universite_id,
      nom: w.nom,
      url: w.url,
      evenements: Array.isArray(w.evenements) ? w.evenements : [],
      statut: w.statut,
      nb_succes: w.nb_succes,
      nb_echecs: w.nb_echecs,
      derniere_livraison: w.derniere_livraison ?? null,
      created_at: w.created_at,
    };
  }

  private livraisonToDto(l: any): WebhookLivraisonResponseDto {
    return {
      id: l.id,
      evenement: l.evenement,
      statut_http: l.statut_http ?? null,
      succes: l.succes,
      tentative: l.tentative,
      duree_ms: l.duree_ms ?? null,
      created_at: l.created_at,
    };
  }

  /**
   * Universite de l'acteur, ou null UNIQUEMENT si son role est explicitement
   * "super_admin" (verifie par nom de role, jamais devine depuis l'absence
   * d'universite). Tout autre utilisateur sans universite est refuse — ne pas
   * inferer un statut privilegie a partir d'un champ nullable.
   */
  private async getActeurUniversiteId(acteurId: string): Promise<string | null> {
    const u = await this.prisma.utilisateurs.findFirst({
      where: { id: acteurId },
      select: {
        universite_id: true,
        roles_utilisateurs_role_idToroles: { select: { nom: true } },
      },
    });
    if (u?.roles_utilisateurs_role_idToroles?.nom === 'super_admin') return null;
    if (!u?.universite_id) {
      throw new ForbiddenException("Vous n'êtes pas associé à une université");
    }
    return u.universite_id;
  }

  /** Universite obligatoire pour creer une ressource rattachee a une universite precise. */
  private async getUniversiteActeurObligatoire(acteurId: string): Promise<string> {
    const universiteId = await this.getActeurUniversiteId(acteurId);
    if (!universiteId)
      throw new ForbiddenException(
        "Super-admin non rattaché à une université — impossible de déterminer où créer cette ressource",
      );
    return universiteId;
  }

  private assertMemeUniversite(
    ressourceUniversiteId: string,
    acteurUniversiteId: string | null,
  ): void {
    if (acteurUniversiteId !== null && ressourceUniversiteId !== acteurUniversiteId) {
      throw new ForbiddenException('Accès refusé');
    }
  }

  async lister(acteurId: string): Promise<WebhookResponseDto[]> {
    const universiteId = await this.getActeurUniversiteId(acteurId);
    const webhooks = await this.prisma.webhooks.findMany({
      where: universiteId ? { universite_id: universiteId } : undefined,
      orderBy: { created_at: 'desc' },
    });
    return webhooks.map((w) => this.toDto(w));
  }

  async findOne(id: string, acteurId: string): Promise<WebhookResponseDto> {
    const universiteId = await this.getActeurUniversiteId(acteurId);
    const webhook = await this.prisma.webhooks.findFirst({ where: { id } });
    if (!webhook) throw new NotFoundException(`Webhook ${id} introuvable`);
    this.assertMemeUniversite(webhook.universite_id, universiteId);
    return this.toDto(webhook);
  }

  async creer(
    dto: CreerWebhookDto,
    acteurId: string,
    ip?: string,
  ): Promise<WebhookResponseDto> {
    const universiteId = await this.getUniversiteActeurObligatoire(acteurId);
    await assertSafeWebhookUrl(dto.url);
    const secret = randomBytes(32).toString('hex');

    const webhook = await this.prisma.webhooks.create({
      data: {
        universite_id: universiteId,
        nom: dto.nom,
        url: dto.url,
        secret,
        evenements: dto.evenements,
        created_by: acteurId,
      },
    });

    await this.audit.log({
      utilisateurId: acteurId,
      action: 'WEBHOOK_CREER',
      module: 'webhooks',
      tableConcernee: 'webhooks',
      enregistrementId: webhook.id,
      ip,
    });

    return this.toDto(webhook);
  }

  async modifier(
    id: string,
    dto: UpdateWebhookDto,
    acteurId: string,
    ip?: string,
  ): Promise<WebhookResponseDto> {
    const universiteId = await this.getActeurUniversiteId(acteurId);
    const webhook = await this.prisma.webhooks.findFirst({ where: { id } });
    if (!webhook) throw new NotFoundException(`Webhook ${id} introuvable`);
    this.assertMemeUniversite(webhook.universite_id, universiteId);
    if (dto.url !== undefined) await assertSafeWebhookUrl(dto.url);

    const updated = await this.prisma.webhooks.update({
      where: { id },
      data: {
        ...(dto.nom !== undefined && { nom: dto.nom }),
        ...(dto.url !== undefined && { url: dto.url }),
        ...(dto.evenements !== undefined && { evenements: dto.evenements }),
        ...(dto.statut !== undefined && { statut: dto.statut }),
        updated_at: new Date(),
      },
    });

    await this.audit.log({
      utilisateurId: acteurId,
      action: 'WEBHOOK_MODIFIER',
      module: 'webhooks',
      tableConcernee: 'webhooks',
      enregistrementId: id,
      ip,
    });

    return this.toDto(updated);
  }

  async supprimer(id: string, acteurId: string, ip?: string): Promise<void> {
    const universiteId = await this.getActeurUniversiteId(acteurId);
    const webhook = await this.prisma.webhooks.findFirst({ where: { id } });
    if (!webhook) throw new NotFoundException(`Webhook ${id} introuvable`);
    this.assertMemeUniversite(webhook.universite_id, universiteId);

    await this.prisma.webhooks.delete({ where: { id } });

    await this.audit.log({
      utilisateurId: acteurId,
      action: 'WEBHOOK_SUPPRIMER',
      module: 'webhooks',
      tableConcernee: 'webhooks',
      enregistrementId: id,
      ip,
    });
  }

  async listerLivraisons(
    id: string,
    acteurId: string,
  ): Promise<WebhookLivraisonResponseDto[]> {
    const universiteId = await this.getActeurUniversiteId(acteurId);
    const webhook = await this.prisma.webhooks.findFirst({ where: { id } });
    if (!webhook) throw new NotFoundException(`Webhook ${id} introuvable`);
    this.assertMemeUniversite(webhook.universite_id, universiteId);

    const livraisons = await this.prisma.webhook_livraisons.findMany({
      where: { webhook_id: id },
      orderBy: { created_at: 'desc' },
      take: 100,
    });

    return livraisons.map((l) => this.livraisonToDto(l));
  }

  async tester(
    id: string,
    acteurId: string,
  ): Promise<{ succes: boolean; statut_http?: number; message: string }> {
    const universiteId = await this.getActeurUniversiteId(acteurId);
    const webhook = await this.prisma.webhooks.findFirst({ where: { id } });
    if (!webhook) throw new NotFoundException(`Webhook ${id} introuvable`);
    this.assertMemeUniversite(webhook.universite_id, universiteId);

    const payload = JSON.stringify({
      evenement: 'ping',
      timestamp: new Date().toISOString(),
    });
    const signature = createHmac('sha256', webhook.secret)
      .update(payload)
      .digest('hex');

    const debut = Date.now();
    try {
      const response = await safeWebhookFetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-INUBIL-Signature': `sha256=${signature}`,
          'X-INUBIL-Event': 'ping',
        },
        body: payload,
        signal: AbortSignal.timeout(10_000),
      });

      const dureeMs = Date.now() - debut;
      const statutHttp = response.status;
      const succes = response.ok;

      await this.prisma.webhook_livraisons.create({
        data: {
          webhook_id: id,
          evenement: 'ping',
          payload: JSON.parse(payload),
          statut_http: statutHttp,
          succes,
          duree_ms: dureeMs,
        },
      });

      await this.prisma.webhooks.update({
        where: { id },
        data: {
          nb_succes: succes ? { increment: 1 } : undefined,
          nb_echecs: succes ? undefined : { increment: 1 },
          derniere_livraison: new Date(),
          statut: succes ? 'actif' : 'en_erreur',
        },
      });

      return {
        succes,
        statut_http: statutHttp,
        message: succes
          ? 'Ping envoyé avec succès'
          : `Serveur a répondu ${statutHttp}`,
      };
    } catch (err) {
      const dureeMs = Date.now() - debut;
      await this.prisma.webhook_livraisons.create({
        data: {
          webhook_id: id,
          evenement: 'ping',
          payload: JSON.parse(payload),
          succes: false,
          duree_ms: dureeMs,
          reponse: String(err),
        },
      });

      await this.prisma.webhooks.update({
        where: { id },
        data: { nb_echecs: { increment: 1 }, statut: 'en_erreur' },
      });

      this.logger.warn(`Webhook test échoué ${webhook.url}: ${err}`);
      return { succes: false, message: 'Livraison échouée' };
    }
  }

  /** Déclencher un événement sur tous les webhooks actifs d'une université (usage interne). */
  async declencher(
    universiteId: string,
    evenement: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    const webhooks = await this.prisma.webhooks.findMany({
      where: { universite_id: universiteId, statut: 'actif' },
    });

    for (const webhook of webhooks) {
      const evenements = Array.isArray(webhook.evenements)
        ? (webhook.evenements as string[])
        : [];
      if (!evenements.includes(evenement)) continue;

      const payload = JSON.stringify({
        evenement,
        timestamp: new Date().toISOString(),
        data,
      });
      const signature = createHmac('sha256', webhook.secret)
        .update(payload)
        .digest('hex');
      const debut = Date.now();

      try {
        const response = await safeWebhookFetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-INUBIL-Signature': `sha256=${signature}`,
            'X-INUBIL-Event': evenement,
          },
          body: payload,
          signal: AbortSignal.timeout(10_000),
        });

        const succes = response.ok;
        await this.prisma.webhook_livraisons.create({
          data: {
            webhook_id: webhook.id,
            evenement,
            payload: JSON.parse(payload),
            statut_http: response.status,
            succes,
            duree_ms: Date.now() - debut,
          },
        });
        await this.prisma.webhooks.update({
          where: { id: webhook.id },
          data: {
            nb_succes: succes ? { increment: 1 } : undefined,
            nb_echecs: succes ? undefined : { increment: 1 },
            derniere_livraison: new Date(),
            statut: succes ? 'actif' : 'en_erreur',
          },
        });
      } catch {
        await this.prisma.webhook_livraisons.create({
          data: {
            webhook_id: webhook.id,
            evenement,
            payload: JSON.parse(payload),
            succes: false,
            duree_ms: Date.now() - debut,
          },
        });
        await this.prisma.webhooks.update({
          where: { id: webhook.id },
          data: { nb_echecs: { increment: 1 }, statut: 'en_erreur' },
        });
      }
    }
  }
}
