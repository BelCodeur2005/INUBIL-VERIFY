/**
 * Script de seed — cree des donnees de test minimales (DEVELOPPEMENT UNIQUEMENT).
 *
 * Lancer :  docker compose exec backend npx prisma db seed
 *
 * Identifiants configurables via SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD.
 * Idempotent : peut etre relance sans creer de doublons.
 *
 * Donnees crees :
 *   1. Role super_admin + 39 permissions granulaires
 *   2. Compte admin  (admin@inubil.com / Admin123!)
 *   3. Universite    ISTAMA INUBIL (statut active)
 *   4. Type document Licence en Informatique (categorie diplome)
 *   5. Mention       Assez Bien (12-14/20)
 *   6. Etudiant      KAMGA Bertrand (ISTAMA-2023-0001)
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEFAULT_ADMIN_EMAIL = 'admin@inubil.com';
const DEFAULT_ADMIN_PASSWORD = 'Admin123!';

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

  // ── Notifications ─────────────────────────────────────────────────────────
  { nom: 'notif:read', module: 'notifications', description: 'Consulter ses propres notifications' },

  // ── Configurations ────────────────────────────────────────────────────────
  { nom: 'config:read', module: 'configurations', description: 'Consulter les configurations de la plateforme' },
  { nom: 'config:edit', module: 'configurations', description: 'Modifier les configurations de la plateforme' },

  // ── Clés API ──────────────────────────────────────────────────────────────
  { nom: 'api:read',   module: 'cles_api', description: "Consulter les clés API de l'université" },
  { nom: 'api:create', module: 'cles_api', description: "Créer une clé API pour l'université" },
  { nom: 'api:delete', module: 'cles_api', description: "Révoquer une clé API de l'université" },

  // ── Webhooks ──────────────────────────────────────────────────────────────
  { nom: 'webhook:read',   module: 'webhooks', description: 'Consulter les webhooks et leurs livraisons' },
  { nom: 'webhook:create', module: 'webhooks', description: 'Créer un webhook' },
  { nom: 'webhook:edit',   module: 'webhooks', description: 'Modifier un webhook' },
  { nom: 'webhook:delete', module: 'webhooks', description: 'Supprimer un webhook' },

  // ── Partenariats ──────────────────────────────────────────────────────────
  { nom: 'partner:read',   module: 'partenariats', description: "Consulter les partenariats de l'université" },
  { nom: 'partner:create', module: 'partenariats', description: "Créer un partenariat inter-universités" },
  { nom: 'partner:edit',   module: 'partenariats', description: "Modifier un partenariat" },
  { nom: 'partner:delete', module: 'partenariats', description: "Supprimer un partenariat" },
];

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

  // ── 1. Role super_admin ────────────────────────────────────────────────────
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

  // ── 2. Supprimer les anciennes permissions domaine (migration idempotente) ─
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

  // ── 3. Upsert des 25 permissions granulaires + attribution au super_admin ──
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

  // ── 4. Compte admin de test ─────────────────────────────────────────────────
  let admin = await prisma.utilisateurs.findUnique({ where: { email: adminEmail } });

  if (admin) {
    await prisma.utilisateurs.update({
      where: { email: adminEmail },
      data: { tentatives_connexion: 0, bloque_jusqu: null },
    });
    console.log(`Compte admin deja present : ${adminEmail} (deverrouille, mot de passe inchange).`);
  } else {
    const rounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? 12);
    const motDePasseHache = await bcrypt.hash(adminPassword, rounds);
    admin = await prisma.utilisateurs.create({
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

  // ── 5. Université ISTAMA INUBIL ─────────────────────────────────────────────
  let universite = await prisma.universites.findFirst({
    where: { nom: 'Institut Supérieur de Technologie et de Management INUBIL', deleted_at: null },
  });
  if (!universite) {
    universite = await prisma.universites.create({
      data: {
        nom: 'Institut Supérieur de Technologie et de Management INUBIL',
        nom_court: 'ISTAMA INUBIL',
        pays: 'Cameroun',
        ville: 'Douala',
        adresse: 'Bonanjo, Douala, Cameroun',
        type: 'privee',
        email_contact: 'contact@istama-inubil.cm',
        telephone: '+237 6 77 00 00 00',
        statut: 'active',
        approuvee_par: admin.id,
        approuvee_le: new Date(),
        created_by: admin.id,
      },
    });
    console.log(`Universite cree : ${universite.nom_court} (${universite.id})`);
  } else {
    console.log(`Universite deja presente : ${universite.nom_court} (${universite.id})`);
  }

  // ── 6. Types de document ────────────────────────────────────────────────────
  const typesDocs = [
    {
      code: 'LIC-INFO',
      nom: 'Licence en Informatique',
      nom_court: 'Licence',
      categorie: 'diplome' as const,
      niveau_bac_plus: 3,
      a_matieres: true,
    },
    {
      code: 'RELEVE-L3',
      nom: 'Relevé de notes Licence 3',
      nom_court: 'Relevé L3',
      categorie: 'releve' as const,
      niveau_bac_plus: 3,
      a_matieres: true,
    },
    {
      code: 'ATTEST-SCOL',
      nom: 'Attestation de scolarité',
      nom_court: 'Attestation',
      categorie: 'attestation' as const,
      niveau_bac_plus: null,
      a_matieres: false,
    },
  ];

  for (const td of typesDocs) {
    await prisma.types_document.upsert({
      where: { code_universite_id: { code: td.code, universite_id: universite.id } },
      update: { nom: td.nom, est_actif: true },
      create: {
        code: td.code,
        nom: td.nom,
        nom_court: td.nom_court,
        categorie: td.categorie,
        niveau_bac_plus: td.niveau_bac_plus,
        pays: 'Cameroun',
        universite_id: universite.id,
        a_matieres: td.a_matieres,
        est_actif: true,
      },
    });
  }
  console.log(`${typesDocs.length} types de document upserted pour ${universite.nom_court}.`);

  // ── 7. Mentions ─────────────────────────────────────────────────────────────
  const mentions = [
    { code: 'TB', nom: 'Très Bien',   note_min: 16, note_max: 20, ordre: 1 },
    { code: 'B',  nom: 'Bien',        note_min: 14, note_max: 16, ordre: 2 },
    { code: 'AB', nom: 'Assez Bien',  note_min: 12, note_max: 14, ordre: 3 },
    { code: 'P',  nom: 'Passable',    note_min: 10, note_max: 12, ordre: 4 },
  ];

  for (const m of mentions) {
    await prisma.mentions_document.upsert({
      where: { code_universite_id: { code: m.code, universite_id: universite.id } },
      update: { nom: m.nom },
      create: {
        code: m.code,
        nom: m.nom,
        note_min: m.note_min,
        note_max: m.note_max,
        universite_id: universite.id,
        est_actif: true,
        ordre: m.ordre,
      },
    });
  }
  console.log(`${mentions.length} mentions upserted pour ${universite.nom_court}.`);

  // ── 8. Configurations système ───────────────────────────────────────────────
  await prisma.configurations.upsert({
    where: { cle: 'partage_duree_jours' },
    update: {},
    create: {
      cle: 'partage_duree_jours',
      valeur: '30',
      type: 'number',
      description:
        "Duree par defaut (en jours) d'un lien de partage de document quand l'etudiant " +
        'ne choisit ni date precise ni option "permanent".',
      modifiable_par: 'super_admin',
    },
  });
  console.log('Configuration "partage_duree_jours" upserted (30 jours par defaut).');

  // ── 9. Étudiant de test ─────────────────────────────────────────────────────
  const numeroEtudiant = 'ISTAMA-2023-0001';
  const etudiantExistant = await prisma.etudiants.findFirst({
    where: { numero_etudiant: numeroEtudiant, deleted_at: null },
  });
  if (!etudiantExistant) {
    const etudiant = await prisma.etudiants.create({
      data: {
        numero_etudiant: numeroEtudiant,
        nom: 'KAMGA',
        prenom: 'Bertrand',
        email: 'bertrand.kamga@istama.cm',
        date_naissance: new Date('2001-03-15'),
        lieu_naissance: 'Douala',
        nationalite: 'Camerounaise',
        universite_id: universite.id,
        annee_entree: 2023,
        created_by: admin.id,
      },
    });
    console.log(`Etudiant cree : ${etudiant.nom} ${etudiant.prenom} (${etudiant.id})`);
  } else {
    console.log(`Etudiant deja present : ${etudiantExistant.nom} ${etudiantExistant.prenom} (${etudiantExistant.id})`);
  }

  // ── Résumé ──────────────────────────────────────────────────────────────────
  console.log('\n=== SEED TERMINE ===');
  console.log(`Admin     : ${adminEmail} / ${motDePasseFourniParEnv ? '(env)' : adminPassword}`);
  console.log(`Universite: ${universite.nom_court}  id=${universite.id}`);

  const typeDoc = await prisma.types_document.findFirst({
    where: { code: 'LIC-INFO', universite_id: universite.id },
  });
  const etudiant = await prisma.etudiants.findFirst({
    where: { numero_etudiant: numeroEtudiant },
  });
  console.log(`Type doc  : ${typeDoc?.nom}  id=${typeDoc?.id}`);
  console.log(`Etudiant  : ${etudiant?.nom} ${etudiant?.prenom}  id=${etudiant?.id}`);
  console.log('====================\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
