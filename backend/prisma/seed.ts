/**
 * Script de seed — cree des donnees de test minimales.
 *
 * Lancer :  docker compose exec backend npx prisma db seed
 *
 * Idempotent : peut etre relance sans creer de doublons.
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Identifiants du compte admin de test.
const ADMIN_EMAIL = 'admin@inubil.com';
const ADMIN_PASSWORD = 'Admin123!';

async function main(): Promise<void> {
  const rounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? 12);
  const motDePasseHache = await bcrypt.hash(ADMIN_PASSWORD, rounds);

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

  // 2. Compte admin de test (cree ou mis a jour).
  const existant = await prisma.utilisateurs.findUnique({
    where: { email: ADMIN_EMAIL },
  });
  if (existant) {
    await prisma.utilisateurs.update({
      where: { email: ADMIN_EMAIL },
      data: {
        mot_de_passe: motDePasseHache,
        statut: 'actif',
        email_verifie: true,
        role_id: role.id,
        tentatives_connexion: 0,
        bloque_jusqu: null,
      },
    });
    console.log(`Compte admin mis a jour : ${ADMIN_EMAIL}`);
  } else {
    await prisma.utilisateurs.create({
      data: {
        nom: 'Admin',
        prenom: 'INUBIL',
        email: ADMIN_EMAIL,
        mot_de_passe: motDePasseHache,
        statut: 'actif',
        email_verifie: true,
        role_id: role.id,
      },
    });
    console.log(`Compte admin cree : ${ADMIN_EMAIL}`);
  }

  console.log('\n─────────────────────────────────────────');
  console.log('  Identifiants de test :');
  console.log(`  email        : ${ADMIN_EMAIL}`);
  console.log(`  mot de passe : ${ADMIN_PASSWORD}`);
  console.log('─────────────────────────────────────────\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
