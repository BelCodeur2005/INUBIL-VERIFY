import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Donnees d'une entree du journal d'audit. */
export interface AuditEntry {
  utilisateurId?: string | null;
  nomUtilisateur?: string | null;
  action: string;
  module: string;
  tableConcernee?: string;
  enregistrementId?: string;
  ip?: string;
  userAgent?: string;
}

/**
 * Service d'ecriture dans le journal d'audit (`journal_audit`).
 * Reutilisable par tous les modules. La journalisation ne doit JAMAIS
 * faire echouer l'operation metier appelante.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(entry: AuditEntry): Promise<void> {
    try {
      await this.prisma.journal_audit.create({
        data: {
          utilisateur_id: entry.utilisateurId ?? undefined,
          nom_utilisateur: entry.nomUtilisateur ?? undefined,
          action: entry.action,
          module: entry.module,
          table_concernee: entry.tableConcernee,
          enregistrement_id: entry.enregistrementId,
          ip_address: entry.ip,
          user_agent: entry.userAgent,
        },
      });
    } catch (err) {
      this.logger.warn(`Echec d'ecriture dans le journal d'audit: ${String(err)}`);
    }
  }
}
