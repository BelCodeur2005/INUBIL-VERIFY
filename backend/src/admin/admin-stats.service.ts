import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StatistiquesGlobalesDto } from './dto/stats-response.dto';
import { StatsGrapheQueryDto, StatsGraphePointDto } from './dto/stats-graphe-query.dto';

@Injectable()
export class AdminStatsService {
  constructor(private readonly prisma: PrismaService) {}

  async statistiquesGlobales(): Promise<StatistiquesGlobalesDto> {
    const debutMois = new Date();
    debutMois.setDate(1);
    debutMois.setHours(0, 0, 0, 0);

    const [
      univActives,
      univTotal,
      docsTotal,
      docsActifs,
      docsEnValidation,
      docsRevoques,
      verifsTotal,
      verifsMois,
      etudiants,
      utilisateurs,
      partagesActifs,
    ] = await Promise.all([
      this.prisma.universites.count({
        where: { statut: { in: ['approuvee', 'active'] }, deleted_at: null },
      }),
      this.prisma.universites.count({ where: { deleted_at: null } }),
      this.prisma.documents.count({ where: { deleted_at: null } }),
      this.prisma.documents.count({ where: { statut: 'actif', deleted_at: null } }),
      this.prisma.documents.count({ where: { statut: 'en_validation', deleted_at: null } }),
      this.prisma.documents.count({ where: { statut: 'revoque', deleted_at: null } }),
      this.prisma.verifications.count(),
      this.prisma.verifications.count({ where: { created_at: { gte: debutMois } } }),
      this.prisma.etudiants.count({ where: { deleted_at: null } }),
      this.prisma.utilisateurs.count({ where: { deleted_at: null } }),
      this.prisma.partages_document.count({ where: { statut: 'actif' } }),
    ]);

    return {
      universites: { actives: univActives, total: univTotal },
      documents: {
        total:          docsTotal,
        actifs:         docsActifs,
        en_validation:  docsEnValidation,
        revoques:       docsRevoques,
      },
      verifications: { total: verifsTotal, ce_mois: verifsMois },
      etudiants,
      utilisateurs,
      partages: { actifs: partagesActifs },
    };
  }

  async graphe(query: StatsGrapheQueryDto): Promise<StatsGraphePointDto[]> {
    const granularite = query.granularite ?? 'jour';
    const pgUnit = granularite === 'mois' ? 'month' : 'day';

    const fin  = query.fin  ? new Date(query.fin)  : new Date();
    const debut = query.debut
      ? new Date(query.debut)
      : new Date(fin.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Les deux requêtes en parallèle - pgUnit est validé ('day' | 'month'), sans injection possible
    const [verifsRows, docsRows] = await Promise.all([
      this.prisma.$queryRawUnsafe<Array<{ date: Date; nb: bigint }>>(
        `SELECT DATE_TRUNC('${pgUnit}', created_at::timestamptz) AS date,
                COUNT(*) AS nb
         FROM verifications
         WHERE created_at >= $1 AND created_at <= $2
         GROUP BY 1 ORDER BY 1`,
        debut, fin,
      ),
      this.prisma.$queryRawUnsafe<Array<{ date: Date; nb: bigint }>>(
        `SELECT DATE_TRUNC('${pgUnit}', date_emission::timestamptz) AS date,
                COUNT(*) AS nb
         FROM documents
         WHERE date_emission IS NOT NULL
           AND deleted_at IS NULL
           AND date_emission >= $1 AND date_emission <= $2
         GROUP BY 1 ORDER BY 1`,
        debut, fin,
      ),
    ]);

    // Fusionner sur la même timeline
    const map = new Map<string, StatsGraphePointDto>();

    for (const row of verifsRows) {
      const key = this.formaterDate(row.date, granularite);
      const point = map.get(key) ?? { date: key, verifications: 0, documents_emis: 0 };
      point.verifications = Number(row.nb);
      map.set(key, point);
    }

    for (const row of docsRows) {
      const key = this.formaterDate(row.date, granularite);
      const point = map.get(key) ?? { date: key, verifications: 0, documents_emis: 0 };
      point.documents_emis = Number(row.nb);
      map.set(key, point);
    }

    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }

  private formaterDate(date: Date, granularite: string): string {
    const d = new Date(date);
    if (granularite === 'mois') {
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    }
    return d.toISOString().slice(0, 10);
  }
}
