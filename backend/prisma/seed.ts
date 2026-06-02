/**
 * Script de seed — cree des donnees de test minimales (DEVELOPPEMENT UNIQUEMENT).
 *
 * Lancer :  docker compose exec backend npx prisma db seed
 *
 * Identifiants configurables via SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD.
 * Idempotent : peut etre relance sans creer de doublons.
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Valeurs par defaut reservees au developpement local.
const DEFAULT_ADMIN_EMAIL = 'admin@inubil.com';
const DEFAULT_ADMIN_PASSWORD = 'Admin123!';

async function main(): Promise<void> {
  // SECURITE : ce seed cree un compte admin actif. Interdit en prod/staging.
  const env = process.env.NODE_ENV;
  if (env === 'production' || env === 'staging') {
    throw new Error(`Seed interdit en environnement "${env}".`);
  }

  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? DEFAULT_ADMIN_EMAIL).toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? DEFAULT_ADMIN_PASSWORD;
  const motDePasseFourniParEnv = Boolean(process.env.SEED_ADMIN_PASSWORD);

  // 1. Role super_admin (cree une seule fois).
  let role = await prisma.roles.findFirst({
    where: { nom: 'super_admin', universite_id: null },
  });
  if (!role) {
    role = await prisma.roles.create({
      data: {
        nom: 'super_admin',
        description: 'Super administrateur de la plateforme',
        est_systeme: true,
      },
    });
    console.log('Role "super_admin" cree.');
  }

  // 2. Compte admin de test.
  const existant = await prisma.utilisateurs.findUnique({
    where: { email: adminEmail },
  });

  if (existant) {
    // On n'ecrase JAMAIS le mot de passe d'un compte existant.
    // On se contente de lever un eventuel blocage (utile en test).
    await prisma.utilisateurs.update({
      where: { email: adminEmail },
      data: { tentatives_connexion: 0, bloque_jusqu: null },
    });
    console.log(
      `Compte admin deja present : ${adminEmail} (deverrouille, mot de passe inchange).`,
    );
  } else {
    const rounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? 12);
    const motDePasseHache = await bcrypt.hash(adminPassword, rounds);
    await prisma.utilisateurs.create({
      data: {
        nom: 'Admin',
        prenom: 'INUBIL',
        email: adminEmail,
        mot_de_passe: motDePasseHache,
        statut: 'actif',
        email_verifie: true,
        role_id: role.id,
      },
    });
    console.log(`Compte admin cree : ${adminEmail}`);
    // On n'affiche le mot de passe que s'il s'agit du defaut dev (non secret).
    if (motDePasseFourniParEnv) {
      console.log('  mot de passe : (defini via SEED_ADMIN_PASSWORD)');
    } else {
      console.log(`  mot de passe (defaut dev) : ${adminPassword}`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
