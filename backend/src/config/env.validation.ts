import * as Joi from 'joi';

/**
 * Validation des variables d'environnement au demarrage de l'application.
 *
 * Les variables COEUR (base de donnees, JWT, chiffrement) sont requises :
 * l'app refuse de demarrer si elles manquent (echec rapide et explicite).
 *
 * Les cles d'INTEGRATIONS EXTERNES (Polygon, Mail, S3/R2) restent
 * optionnelles tant que les modules correspondants ne sont pas developpes
 * (respectivement taches #22/#39, #25, #21).
 */
export const envValidationSchema = Joi.object({
  // ─── Application ───────────────────────────────────────────────
  NODE_ENV: Joi.string()
    .valid('development', 'staging', 'production', 'test')
    .default('development'),
  APP_PORT: Joi.number().port().default(3000),
  FRONTEND_URL: Joi.string().uri().default('http://localhost:4200'),
  PUBLIC_VERIFY_URL: Joi.string().uri().default('http://localhost:4200'),

  // ─── Base de donnees (utilisee des #5 Prisma) ──────────────────
  DATABASE_URL: Joi.string().required(),

  // ─── JWT (cahier §9.1 : token + rotation) ──────────────────────
  // Access token court (15 min) : limite l'exposition en cas de vol.
  // La longevite de session vient du refresh token (revocable en base).
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  // ─── Securite (cahier §9.1 / §9.2) ─────────────────────────────
  BCRYPT_SALT_ROUNDS: Joi.number().min(12).default(12),
  // Fenetre d'inactivite (minutes) : une session sans refresh au-dela
  // de ce delai expire (deconnexion automatique apres inactivite).
  SESSION_IDLE_MINUTES: Joi.number().min(1).default(30),
  ENCRYPTION_MASTER_KEY: Joi.string().length(64).required(), // 32 octets en hex

  // ─── Email - optionnel jusqu'a #25 ─────────────────────────────
  MAIL_HOST: Joi.string().optional(),
  MAIL_PORT: Joi.number().optional(),
  MAIL_USER: Joi.string().optional().allow(''),
  MAIL_PASS: Joi.string().optional().allow(''),
  MAIL_FROM: Joi.string().optional().allow(''),

  // ─── Stockage fichiers - AWS S3 ou Cloudflare R2 (compatible S3) ─
  // Si CLOUDFLARE_ACCOUNT_ID est renseigné → Cloudflare R2
  // Sinon → AWS S3 (region eu-west-1 par défaut)
  AWS_ACCESS_KEY_ID:      Joi.string().optional().allow(''),
  AWS_SECRET_ACCESS_KEY:  Joi.string().optional().allow(''),
  AWS_REGION:             Joi.string().optional().default('auto'),
  AWS_S3_BUCKET:          Joi.string().optional().allow(''),
  CLOUDFLARE_ACCOUNT_ID:  Joi.string().optional().allow(''),

  // ─── Blockchain Polygon - optionnel jusqu'a #22/#39 ────────────
  POLYGON_RPC_URL:      Joi.string().uri().optional(),
  DEPLOYER_PRIVATE_KEY: Joi.string().optional().allow(''),
  CONTRACT_ADDRESS:     Joi.string().optional().allow(''),
  POLYGON_NETWORK:      Joi.string().valid('polygon_amoy', 'polygon_mainnet').default('polygon_amoy'),

  // ─── Backup automatique - N0C Storage via FTP ───────────────────
  BACKUP_FTP_HOST:        Joi.string().optional().allow(''),
  BACKUP_FTP_USER:        Joi.string().optional().allow(''),
  BACKUP_FTP_PASS:        Joi.string().optional().allow(''),
  BACKUP_FTP_DIR:         Joi.string().optional().default('/'),
  BACKUP_FTP_SECURE:      Joi.string().valid('true', 'false').optional().default('true'),
  BACKUP_RETENTION_DAYS:  Joi.number().min(1).optional().default(30),
});
