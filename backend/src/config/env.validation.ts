import * as Joi from 'joi';

/**
 * Validation des variables d'environnement au demarrage de l'application.
 *
 * Les variables COEUR (base de donnees, JWT, chiffrement) sont requises :
 * l'app refuse de demarrer si elles manquent (echec rapide et explicite).
 *
 * Les cles d'INTEGRATIONS EXTERNES (Pinata, Polygon, Mail) restent
 * optionnelles tant que les modules correspondants ne sont pas developpes
 * (respectivement taches #21, #22/#39, #25).
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
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('24h'),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  // ─── Securite (cahier §9.1 / §9.2) ─────────────────────────────
  BCRYPT_SALT_ROUNDS: Joi.number().min(12).default(12),
  ENCRYPTION_MASTER_KEY: Joi.string().length(64).required(), // 32 octets en hex

  // ─── Email — optionnel jusqu'a #25 ─────────────────────────────
  MAIL_HOST: Joi.string().optional(),
  MAIL_PORT: Joi.number().optional(),
  MAIL_USER: Joi.string().optional().allow(''),
  MAIL_PASS: Joi.string().optional().allow(''),
  MAIL_FROM: Joi.string().optional().allow(''),

  // ─── IPFS Pinata — optionnel jusqu'a #21 ───────────────────────
  PINATA_API_KEY: Joi.string().optional().allow(''),
  PINATA_SECRET_KEY: Joi.string().optional().allow(''),
  PINATA_GATEWAY: Joi.string().uri().optional(),

  // ─── Blockchain Polygon — optionnel jusqu'a #22/#39 ────────────
  POLYGON_RPC_URL: Joi.string().uri().optional(),
  PRIVATE_KEY: Joi.string().optional().allow(''),
  CONTRACT_ADDRESS: Joi.string().optional().allow(''),
});
