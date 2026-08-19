import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { NotificationResponseDto } from './dto/notification-response.dto';

export interface CreerNotificationParams {
  utilisateurId: string;
  type: string;
  titre: string;
  message: string;
  lien?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  private toDto(n: any): NotificationResponseDto {
    return {
      id: n.id,
      utilisateur_id: n.utilisateur_id,
      type: n.type,
      titre: n.titre,
      message: n.message,
      lien: n.lien ?? null,
      statut: n.statut,
      lue_le: n.lue_le ?? null,
      archivee_le: n.archivee_le ?? null,
      created_at: n.created_at,
    };
  }

  /** Creer une notification in-app (appelé en interne par d'autres services). */
  async creer(params: CreerNotificationParams): Promise<void> {
    await this.prisma.notifications.create({
      data: {
        utilisateur_id: params.utilisateurId,
        type: params.type,
        titre: params.titre,
        message: params.message,
        lien: params.lien ?? null,
        metadata: (params.metadata ?? {}) as any,
      },
    });
  }

  async lister(
    acteurId: string,
    query: NotificationQueryDto,
  ): Promise<{
    data: NotificationResponseDto[];
    total: number;
    non_lues: number;
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = { utilisateur_id: acteurId };
    if (query.statut) where.statut = query.statut;

    const [data, total, non_lues] = await Promise.all([
      this.prisma.notifications.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notifications.count({ where }),
      this.prisma.notifications.count({
        where: { utilisateur_id: acteurId, statut: 'non_lue' },
      }),
    ]);

    return { data: data.map((n) => this.toDto(n)), total, non_lues };
  }

  async compterNonLues(acteurId: string): Promise<{ count: number }> {
    const count = await this.prisma.notifications.count({
      where: { utilisateur_id: acteurId, statut: 'non_lue' },
    });
    return { count };
  }

  async marquerLue(
    id: string,
    acteurId: string,
  ): Promise<NotificationResponseDto> {
    const notif = await this.prisma.notifications.findFirst({ where: { id } });
    if (!notif) throw new NotFoundException(`Notification ${id} introuvable`);
    if (notif.utilisateur_id !== acteurId)
      throw new ForbiddenException('Accès refusé');

    const updated = await this.prisma.notifications.update({
      where: { id },
      data: { statut: 'lue', lue_le: new Date() },
    });
    return this.toDto(updated);
  }

  async marquerToutesLues(acteurId: string): Promise<{ modifiees: number }> {
    const result = await this.prisma.notifications.updateMany({
      where: { utilisateur_id: acteurId, statut: 'non_lue' },
      data: { statut: 'lue', lue_le: new Date() },
    });
    return { modifiees: result.count };
  }

  async archiver(id: string, acteurId: string): Promise<void> {
    const notif = await this.prisma.notifications.findFirst({ where: { id } });
    if (!notif) throw new NotFoundException(`Notification ${id} introuvable`);
    if (notif.utilisateur_id !== acteurId)
      throw new ForbiddenException('Accès refusé');

    await this.prisma.notifications.update({
      where: { id },
      data: { statut: 'archivee', archivee_le: new Date() },
    });
  }
}
