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

const DEFAULT_ADMIN_EMAIL = 'admin@inubil.com';
const DEFAULT_ADMIN_PASSWORD = 'Admin123!';

/**
 * Permissions granulaires (namespace:action).
 * Chaque permission est upsertee ; les anciennes permissions domaine
 * (valider_diplome, gerer_universites, etc.) sont supprimees si presentes.
 */
const PERMISSIONS: Array<{ nom: string; module: string; description: string }> = [
  // ── Universités ──────────────────────────────────────────────────────────
  { nom: 'univ:read',     module: 'universites', description: 'Consulter la liste et le detail des universites' },
  { nom: 'univ:create',   module: 'universites', description: 'Creer une universite' },
  { nom: 'univ:edit',     module: 'universites', description: "Modifier les informations d'une universite" },
  { nom: 'univ:delete',   module: 'universites', description: 'Supprimer (soft delete) une universite' },
  { nom: 'univ:approve',  module: 'universites', description: 'Approuver une universite (en_attente → approuvee)' },
  { nom: 'univ:activate', module: 'universites', description: 'Activer une universite (approuvee → active)' },
  { nom: 'univ:suspend',  module: 'universites', description: 'Suspendre une universite (active → suspendue)' },
  { nom: 'univ:reject',   module: 'universites', description: 'Rejeter une universite (en_attente → rejetee)' },

  // ── Rôles & Permissions ──────────────────────────────────────────────────
  { nom: 'role:read',   module: 'roles', description: 'Consulter les roles et leurs permissions' },
  { nom: 'role:create', module: 'roles', description: 'Creer un role' },
  { nom: 'role:edit',   module: 'roles', description: 'Modifier un role' },
  { nom: 'role:delete', module: 'roles', description: 'Supprimer un role' },
  { nom: 'role:assign', module: 'roles', description: 'Assigner des permissions a un role' },

  // ── Utilisateurs ─────────────────────────────────────────────────────────
  { nom: 'user:read',        module: 'utilisateurs', description: 'Consulter les profils utilisateurs' },
  { nom: 'user:edit',        module: 'utilisateurs', description: 'Modifier un profil utilisateur' },
  { nom: 'user:assign_role', module: 'utilisateurs', description: 'Assigner un role a un utilisateur' },

  // ── Documents / Diplômes ─────────────────────────────────────────────────
  { nom: 'doc:read',     module: 'documents', description: 'Consulter les documents et diplomes' },
  { nom: 'doc:create',   module: 'documents', description: 'Saisir un document ou diplome' },
  { nom: 'doc:validate', module: 'documents', description: 'Valider et ancrer un diplome sur la blockchain' },
  { nom: 'doc:revoke',   module: 'documents', description: 'Revoquer un diplome' },
  { nom: 'doc:delete',   module: 'documents', description: 'Supprimer un document' },
  { nom: 'doc:share',    module: 'documents', description: 'Partager un document avec un tiers' },

  // ── Étudiants ────────────────────────────────────────────────────────────
  { nom: 'student:read', module: 'etudiants', description: "Consulter le dossier academique d'un etudiant" },

  // ── Statistiques & Audit ─────────────────────────────────────────────────
  { nom: 'stats:read', module: 'statistiques', description: 'Consulter les statistiques de la plateforme' },
  { nom: 'audit:read', module: 'audit',        description: "Consulter le journal d'audit" },
];

/** Anciennes permissions domaine a supprimer (migration). */
const ANCIENNES_PERMISSIONS = [
  'valider_diplome',
  'revoquer_diplome',
  'gerer_universites',
  'gerer_utilisateurs',
  'voir_statistiques',
  'voir_audit',
  'saisir_document',
  'voir_dossier_etudiant',
  'partager_document',
];

async function main(): Promise<void> {
  const env = process.env.NODE_ENV;
  if (env === 'production' || env === 'staging') {
    throw new Error(`Seed interdit en environnement "${env}".`);
  }

  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? DEFAULT_ADMIN_EMAIL).toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? DEFAULT_ADMIN_PASSWORD;
  const motDePasseFourniParEnv = Boolean(process.env.SEED_ADMIN_PASSWORD);

  // 1. Role super_admin.
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

  // 2. Supprimer les anciennes permissions domaine (migration idempotente).
  const anciennesExistantes = await prisma.permissions.findMany({
    where: { nom: { in: ANCIENNES_PERMISSIONS } },
    select: { id: true },
  });
  if (anciennesExistantes.length > 0) {
    const ids = anciennesExistantes.map((p) => p.id);
    await prisma.role_permissions.deleteMany({ where: { permission_id: { in: ids } } });
    await prisma.permissions.deleteMany({ where: { id: { in: ids } } });
    console.log(`${anciennesExistantes.length} ancienne(s) permission(s) domaine supprimee(s).`);
  }

  // 3. Upsert des 25 permissions granulaires + attribution au super_admin.
  for (const p of PERMISSIONS) {
    const perm = await prisma.permissions.upsert({
      where: { nom: p.nom },
      update: { module: p.module, description: p.description },
      create: { nom: p.nom, module: p.module, description: p.description },
    });
    await prisma.role_permissions.upsert({
      where: {
        role_id_permission_id: { role_id: role.id, permission_id: perm.id },
      },
      update: {},
      create: { role_id: role.id, permission_id: perm.id },
    });
  }
  console.log(`${PERMISSIONS.length} permissions granulaires accordees a "super_admin".`);

  // 4. Compte admin de test.
  const existant = await prisma.utilisateurs.findUnique({ where: { email: adminEmail } });

  if (existant) {
    await prisma.utilisateurs.update({
      where: { email: adminEmail },
      data: { tentatives_connexion: 0, bloque_jusqu: null },
    });
    console.log(`Compte admin deja present : ${adminEmail} (deverrouille, mot de passe inchange).`);
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
