import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as zlib from 'zlib';
import * as fs from 'fs';
import * as fsp from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { Client } from 'basic-ftp';

const execAsync = promisify(exec);

export interface BackupResult {
  fichier: string;
  tailleMo: string;
}

const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);

  constructor(private readonly config: ConfigService) {}

  // Tous les jours à 02:00 UTC
  @Cron('0 2 * * *')
  async backupCron(): Promise<void> {
    this.logger.log('Backup automatique planifié — démarrage...');
    try {
      const result = await this.effectuerBackup();
      this.logger.log(`Backup terminé avec succès : ${result.fichier} (${result.tailleMo} Mo)`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Backup automatique échoué : ${msg}`);
    }
  }

  async effectuerBackup(): Promise<BackupResult> {
    // Répertoire temporaire unique et imprévisible (protection race-condition)
    const tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'inubil-backup-'));
    // Permissions propriétaire uniquement — les dumps contiennent des données sensibles
    await fsp.chmod(tmpDir, 0o700);

    const horodatage = new Date()
      .toISOString()
      .replace(/[:.]/g, '-')
      .replace('T', '_')
      .slice(0, 19); // ex: 2026-06-27_02-00-00

    const nomFichier = `backup_${horodatage}.sql.gz`;
    const cheminGz   = path.join(tmpDir, nomFichier);
    const cheminSql  = path.join(tmpDir, `backup_${horodatage}.sql`);

    try {
      await this.dumpPostgres(cheminSql, cheminGz);
      const stats    = await fsp.stat(cheminGz);
      const tailleMo = (stats.size / 1_048_576).toFixed(2);
      await this.uploadFtp(cheminGz, nomFichier);
      await this.supprimerAnciensBackups();
      return { fichier: nomFichier, tailleMo };
    } finally {
      // Nettoyage des fichiers temporaires, même en cas d'erreur
      await fsp.unlink(cheminSql).catch(() => void 0);
      await fsp.unlink(cheminGz).catch(() => void 0);
      await fsp.rmdir(tmpDir).catch(() => void 0);
    }
  }

  // ── pg_dump + gzip ──────────────────────────────────────────────────────────

  private async dumpPostgres(cheminSql: string, cheminGz: string): Promise<void> {
    const databaseUrl = this.config.getOrThrow<string>('DATABASE_URL');
    const { host, port, user, password, database } = this.parseDbUrl(databaseUrl);

    // Pré-créer le fichier SQL en mode exclusif avec permissions strictes
    // (évite qu'un autre processus exploite la fenêtre entre mkdir et pg_dump)
    const fd = fs.openSync(cheminSql, 'wx', 0o600);
    fs.closeSync(fd);

    const cmd = `pg_dump -h ${host} -p ${port} -U ${user} -d ${database} -F p -f "${cheminSql}"`;
    await execAsync(cmd, {
      env: { ...process.env, PGPASSWORD: password },
      timeout: 5 * 60 * 1000, // 5 minutes max
    });

    // Compression gzip (niveau 9 = taille minimale), fichier sortie mode 0o600
    await new Promise<void>((resolve, reject) => {
      const input  = fs.createReadStream(cheminSql);
      const gzip   = zlib.createGzip({ level: 9 });
      const output = fs.createWriteStream(cheminGz, { mode: 0o600 });
      input.pipe(gzip).pipe(output);
      output.on('finish', resolve);
      output.on('error', reject);
      input.on('error', reject);
    });
  }

  // ── Upload FTP → N0C Storage ────────────────────────────────────────────────

  private ftpConfig(): { host: string; user: string; pass: string; dir: string; secure: boolean } | null {
    const host = this.config.get<string>('BACKUP_FTP_HOST');
    const user = this.config.get<string>('BACKUP_FTP_USER');
    const pass = this.config.get<string>('BACKUP_FTP_PASS');
    const dir  = this.config.get<string>('BACKUP_FTP_DIR') ?? '/';
    // Défaut true (FTPS) — seul 'false' explicite désactive
    const secure = this.config.get<string>('BACKUP_FTP_SECURE') !== 'false';

    if (!host || !user || !pass) return null;

    // Interdit le FTP en clair vers un hôte distant (credentials exposés en transit)
    if (!secure && !LOOPBACK_HOSTS.has(host)) {
      throw new Error(
        `FTP en clair interdit pour l'hôte distant "${host}". ` +
        'Activez BACKUP_FTP_SECURE=true pour utiliser FTPS.',
      );
    }

    return { host, user, pass, dir, secure };
  }

  private async uploadFtp(cheminLocal: string, nomFichier: string): Promise<void> {
    const cfg = this.ftpConfig();
    if (!cfg) {
      this.logger.warn(
        'FTP backup non configuré (BACKUP_FTP_HOST / BACKUP_FTP_USER / BACKUP_FTP_PASS absents). ' +
        'Le backup reste uniquement en local (supprimé en fin de tâche).',
      );
      return;
    }

    const client = new Client();
    client.ftp.verbose = false;
    try {
      await client.access({ host: cfg.host, user: cfg.user, password: cfg.pass, secure: cfg.secure });
      await client.ensureDir(cfg.dir);
      await client.uploadFrom(cheminLocal, nomFichier);
      this.logger.log(`Backup uploadé sur N0C Storage : ${cfg.dir}/${nomFichier}`);
    } finally {
      client.close();
    }
  }

  // ── Nettoyage des anciens backups FTP ───────────────────────────────────────

  private async supprimerAnciensBackups(): Promise<void> {
    const cfg       = this.ftpConfig();
    if (!cfg) return;
    const retention = Number(this.config.get<string>('BACKUP_RETENTION_DAYS') ?? '30');
    const limite    = new Date(Date.now() - retention * 24 * 3600 * 1000);
    const client    = new Client();

    try {
      await client.access({ host: cfg.host, user: cfg.user, password: cfg.pass, secure: cfg.secure });
      await client.cd(cfg.dir);
      const liste = await client.list();

      for (const fichier of liste) {
        const isBackup = fichier.name.startsWith('backup_') && fichier.name.endsWith('.sql.gz');
        if (!isBackup) continue;
        const dateModif = fichier.modifiedAt ?? new Date(0);
        if (dateModif < limite) {
          await client.remove(fichier.name);
          this.logger.log(`Ancien backup supprimé (>${retention}j) : ${fichier.name}`);
        }
      }
    } finally {
      client.close();
    }
  }

  // ── Utilitaire ──────────────────────────────────────────────────────────────

  private parseDbUrl(url: string): {
    host: string; port: string; user: string; password: string; database: string;
  } {
    // postgresql://user:password@host:port/database
    const match = url.match(/^postgresql:\/\/([^:]+):([^@]+)@([^:/]+):?(\d*)\/(.+)$/);
    if (!match) throw new Error(`DATABASE_URL mal formée : ${url}`);
    return {
      user:     match[1],
      password: match[2],
      host:     match[3],
      port:     match[4] || '5432',
      database: match[5],
    };
  }
}
