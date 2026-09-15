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
 *   2. Roles metier (admin_istama, responsable_universite, directeur_pedagogique,
 *      agent_saisie, etudiant, autre_universite, employeur) + leurs permissions
 *   3. Compte admin  (admin@inubil.com / Admin123!)
 *   4. Universite    ISTAMA INUBIL (statut active)
 *   4bis. Compte responsable_universite (responsable@inubil.com / Responsable123!)
 *   5. Type document Licence en Informatique (categorie diplome)
 *   6. Mention       Assez Bien (12-14/20)
 *   7. Etudiant      KAMGA Bertrand (ISTAMA-2023-0001)
 *   8. Compte agent de saisie (agent@inubil.com / Agent123!)
 *   9. Compte directeur pedagogique (directeur@inubil.com / Directeur123!)
 *  10. Document de test (INUB-2026-0001, statut brouillon, pour KAMGA Bertrand)
 *  11. Compte espace etudiant, lie a KAMGA Bertrand (test.etudiant@inubil.com / Test1234!)
 *  12. Departements Genie Informatique (GI) et Mecanique (MECA)
 *  13. Compte chef de departement Mecanique, scope (chef.meca@inubil.com / ChefMeca123!)
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

const DEFAULT_ADMIN_EMAIL = 'admin@inubil.com';
const DEFAULT_ADMIN_PASSWORD = 'Admin123!';
const DEFAULT_RESPONSABLE_EMAIL = 'responsable@inubil.com';
const DEFAULT_RESPONSABLE_PASSWORD = 'Responsable123!';
const DEFAULT_AGENT_EMAIL = 'agent@inubil.com';
const DEFAULT_AGENT_PASSWORD = 'Agent123!';
const DEFAULT_DIRECTEUR_EMAIL = 'directeur@inubil.com';
const DEFAULT_DIRECTEUR_PASSWORD = 'Directeur123!';
const DEFAULT_ETUDIANT_EMAIL = 'test.etudiant@inubil.com';
const DEFAULT_ETUDIANT_PASSWORD = 'Test1234!';
const DEFAULT_CHEF_MECA_EMAIL = 'chef.meca@inubil.com';
const DEFAULT_CHEF_MECA_PASSWORD = 'ChefMeca123!';

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
  { nom: 'student:read',   module: 'etudiants', description: "Consulter le dossier academique d'un etudiant" },
  { nom: 'student:delete', module: 'etudiants', description: 'Supprimer un dossier etudiant sans document emis — agent_saisie limite en plus aux fiches sans compte de connexion (cf. etudiants-admin.service.ts)' },

  // ── Départements ─────────────────────────────────────────────────────────
  { nom: 'dept:read',   module: 'departements', description: 'Consulter les departements de l\'universite' },
  { nom: 'dept:create', module: 'departements', description: 'Creer un departement' },
  { nom: 'dept:edit',   module: 'departements', description: 'Modifier un departement' },
  { nom: 'dept:delete', module: 'departements', description: 'Supprimer un departement' },

  // ── Filières ─────────────────────────────────────────────────────────────
  { nom: 'fil:read',   module: 'filieres', description: 'Consulter les filieres de l\'universite' },
  { nom: 'fil:create', module: 'filieres', description: 'Creer une filiere' },
  { nom: 'fil:edit',   module: 'filieres', description: 'Modifier une filiere' },
  { nom: 'fil:delete', module: 'filieres', description: 'Supprimer une filiere' },

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

/**
 * Roles metier proposes (au-dela de super_admin) — conception issue de l'analyse
 * RBAC / cahier des charges, a ajuster selon les besoins reels de l'equipe.
 * Tous crees comme roles globaux (universite_id: null) et systeme (non supprimables) :
 * ce sont des gabarits partages, pas des roles personnalises par universite.
 */
const ROLES_METIER: Array<{ nom: string; description: string; permissions: string[] }> = [
  {
    nom: 'admin_istama',
    description: 'Supervision globale de la plateforme (sans les droits techniques de super_admin : pas de suppression d\'universite ni de gestion des cles API/webhooks/partenariats)',
    permissions: [
      'univ:read', 'univ:create', 'univ:edit', 'univ:approve', 'univ:activate', 'univ:suspend', 'univ:reject',
      'user:read', 'user:edit', 'user:assign_role',
      'role:read', 'role:create',
      'stats:read', 'audit:read',
      'doc:read',
      'dept:read',
      'fil:read',
    ],
  },
  {
    nom: 'responsable_universite',
    description: 'Gestion complete de son etablissement : staff, emission/validation/revocation de diplomes, integrations (cles API, webhooks, partenariats)',
    permissions: [
      'univ:read', 'univ:edit',
      'user:read', 'user:edit', 'user:assign_role',
      'doc:create', 'doc:validate', 'doc:revoke', 'doc:read',
      'student:read', 'student:delete',
      'dept:read', 'dept:create', 'dept:edit', 'dept:delete',
      'fil:read', 'fil:create', 'fil:edit', 'fil:delete',
      'api:read', 'api:create', 'api:delete',
      'webhook:read', 'webhook:create', 'webhook:edit', 'webhook:delete',
      'partner:read', 'partner:create', 'partner:edit', 'partner:delete',
      'stats:read', 'audit:read',
    ],
  },
  {
    nom: 'directeur_pedagogique',
    description: 'Validation academique — cumule les droits de saisie de agent_saisie (peut aussi saisir), plus valider/rejeter/revoquer',
    permissions: ['doc:create', 'doc:validate', 'doc:revoke', 'doc:read', 'student:read', 'student:delete', 'dept:read', 'fil:read', 'stats:read'],
  },
  {
    nom: 'agent_saisie',
    description: 'Saisie des diplomes et fiches etudiant — pas de droit de validation ni de revocation. Peut ' +
      "supprimer une fiche qu'il a commencee (erreur de saisie) UNIQUEMENT si elle n'a ni document emis ni " +
      'compte de connexion actif ; au-dela, reserve a directeur_pedagogique/responsable_universite ' +
      '(cf. etudiants-admin.service.ts, supprimer()). ' +
      'Un compte sans departement associe (scolarite) saisit pour tous les departements ; avec un ou plusieurs ' +
      'departements (chef de departement), restreint a ceux-ci (cf. etudiants-admin.service.ts / documents.service.ts).',
    permissions: ['doc:create', 'doc:read', 'student:read', 'student:delete', 'dept:read', 'fil:read'],
  },
  {
    nom: 'etudiant',
    description: 'Espace personnel de l\'etudiant — agit via /etudiants/moi (JWT seul, sans permission RBAC dediee) ; role cree pour l\'etiquetage et la redirection post-connexion',
    permissions: [],
  },
  {
    nom: 'autre_universite',
    description: 'Compte optionnel pour une universite tierce qui verifie des diplomes — agit via les endpoints publics /verify et son historique personnel, sans permission RBAC dediee',
    permissions: [],
  },
  {
    nom: 'employeur',
    description: 'Compte optionnel pour un employeur qui verifie des diplomes — agit via les endpoints publics /verify et son historique personnel, sans permission RBAC dediee',
    permissions: [],
  },
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

  // ── 3bis. Roles metier + leurs permissions ──────────────────────────────────
  for (const r of ROLES_METIER) {
    let roleMetier = await prisma.roles.findFirst({
      where: { nom: r.nom, universite_id: null },
    });
    if (!roleMetier) {
      roleMetier = await prisma.roles.create({
        data: { nom: r.nom, description: r.description, est_systeme: true },
      });
      console.log(`Role "${r.nom}" cree.`);
    }

    for (const nomPermission of r.permissions) {
      const perm = await prisma.permissions.findUnique({ where: { nom: nomPermission } });
      if (!perm) {
        console.warn(`  ATTENTION : permission "${nomPermission}" introuvable pour le role "${r.nom}" — ignoree.`);
        continue;
      }
      await prisma.role_permissions.upsert({
        where: { role_id_permission_id: { role_id: roleMetier.id, permission_id: perm.id } },
        update: {},
        create: { role_id: roleMetier.id, permission_id: perm.id },
      });
    }
    console.log(`  "${r.nom}" : ${r.permissions.length} permission(s) accordee(s).`);
  }

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

  // ── 5bis. Compte responsable_universite de test (gestion complete de son etablissement) ──
  const responsableEmail = DEFAULT_RESPONSABLE_EMAIL;
  const responsablePassword = DEFAULT_RESPONSABLE_PASSWORD;
  const roleResponsable = await prisma.roles.findFirst({
    where: { nom: 'responsable_universite', universite_id: null },
  });
  if (!roleResponsable) {
    throw new Error('Role "responsable_universite" introuvable — verifier ROLES_METIER.');
  }

  let responsable = await prisma.utilisateurs.findUnique({ where: { email: responsableEmail } });
  if (responsable) {
    await prisma.utilisateurs.update({
      where: { email: responsableEmail },
      data: { tentatives_connexion: 0, bloque_jusqu: null },
    });
    console.log(`Compte responsable universite deja present : ${responsableEmail} (deverrouille, mot de passe inchange).`);
  } else {
    const roundsResponsable = Number(process.env.BCRYPT_SALT_ROUNDS ?? 12);
    const motDePasseHacheResponsable = await bcrypt.hash(responsablePassword, roundsResponsable);
    responsable = await prisma.utilisateurs.create({
      data: {
        nom: 'Responsable',
        prenom: 'ISTAMA',
        email: responsableEmail,
        mot_de_passe: motDePasseHacheResponsable,
        statut: 'actif',
        email_verifie: true,
        role_id: roleResponsable.id,
        universite_id: universite.id,
      },
    });
    console.log(`Compte responsable universite cree : ${responsableEmail}`);
    console.log(`  mot de passe (defaut dev) : ${responsablePassword}`);
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

  // ── 7bis. Filières ──────────────────────────────────────────────────────────
  const filieresSeed = [
    { code: 'INFO', nom: 'Informatique', ordre: 1 },
    { code: 'GLSI', nom: "Génie Logiciel et Systèmes d'Information", ordre: 2 },
    { code: 'RT',   nom: 'Réseaux et Télécommunications', ordre: 3 },
  ];

  for (const f of filieresSeed) {
    await prisma.filieres.upsert({
      where: { code_universite_id: { code: f.code, universite_id: universite.id } },
      update: { nom: f.nom },
      create: {
        code: f.code,
        nom: f.nom,
        universite_id: universite.id,
        est_actif: true,
        ordre: f.ordre,
      },
    });
  }
  console.log(`${filieresSeed.length} filières upserted pour ${universite.nom_court}.`);

  // ── 8. Configurations système ───────────────────────────────────────────────
  const configurationsSysteme = [
    {
      cle: 'partage_duree_jours',
      valeur: '30',
      description:
        "Duree par defaut (en jours) d'un lien de partage de document quand l'etudiant " +
        'ne choisit ni date precise ni option "permanent".',
    },
    {
      cle: 'max_tentatives_connexion',
      valeur: '5',
      description: 'Nombre de tentatives de connexion echouees avant blocage temporaire du compte.',
    },
    {
      cle: 'duree_blocage_min',
      valeur: '15',
      description: 'Duree (en minutes) du blocage d\'un compte apres max_tentatives_connexion echecs.',
    },
    {
      cle: 'pdf_max_taille_mo',
      valeur: '20',
      description:
        'Taille maximale (en Mo) acceptee pour un upload de PDF (emission de document et verification par upload). ' +
        'Ne peut pas depasser le plafond serveur (20 Mo, non configurable).',
    },
    {
      cle: 'presigned_url_duree_min',
      valeur: '15',
      description: 'Duree de validite (en minutes) d\'un lien de telechargement presigne de PDF.',
    },
    {
      cle: 'mot_de_passe_longueur_min',
      valeur: '8',
      description:
        'Longueur minimale exigee pour un mot de passe. Ne peut pas descendre sous 8 caracteres (plancher non configurable).',
    },
    {
      cle: 'session_idle_min',
      valeur: '30',
      description:
        "Fenetre d'inactivite (en minutes) : une session sans refresh au-dela de ce delai expire.",
    },
  ];
  for (const c of configurationsSysteme) {
    await prisma.configurations.upsert({
      where: { cle: c.cle },
      update: {},
      create: { cle: c.cle, valeur: c.valeur, type: 'number', description: c.description, modifiable_par: 'super_admin' },
    });
  }
  console.log(`${configurationsSysteme.length} configurations systeme upserted.`);

  // Parametres email (lus par MailService a chaque envoi, repli sur les variables .env si absents).
  const configurationsEmail = [
    {
      cle: 'app_nom',
      valeur: 'INUBIL Verify',
      description: "Nom affiche dans l'en-tete et le pied de page des emails envoyes par la plateforme.",
    },
    {
      cle: 'smtp_host',
      valeur: process.env.MAIL_HOST ?? 'smtp.gmail.com',
      description: "Serveur SMTP sortant utilise pour l'envoi des emails.",
    },
    {
      cle: 'smtp_port',
      valeur: process.env.MAIL_PORT ?? '587',
      description: 'Port SMTP (STARTTLS).',
    },
    {
      cle: 'smtp_from_email',
      valeur: 'noreply@inubil.com',
      description: "Adresse email affichee comme expediteur (From) des emails sortants — combinee avec le nom de l'application.",
    },
    {
      cle: 'smtp_user',
      valeur: process.env.MAIL_USER ?? '',
      description: "Compte SMTP utilise pour l'authentification aupres du serveur sortant.",
    },
    {
      cle: 'smtp_pass',
      valeur: process.env.MAIL_PASS ?? '',
      description: "Mot de passe applicatif SMTP (ex. mot de passe d'application Gmail). Jamais renvoye en clair par l'API.",
    },
  ];
  for (const c of configurationsEmail) {
    await prisma.configurations.upsert({
      where: { cle: c.cle },
      update: {},
      create: { cle: c.cle, valeur: c.valeur, type: 'string', description: c.description, modifiable_par: 'super_admin' },
    });
  }
  console.log(`${configurationsEmail.length} configurations email upserted.`);

  // ── 8bis. Départements de test (Genie Informatique, Mecanique) ─────────────
  const departementsSeed = [
    { code: 'GI', nom: 'Génie Informatique', ordre: 1 },
    { code: 'MECA', nom: 'Mécanique', ordre: 2 },
  ];
  const departementsParCode: Record<string, { id: string }> = {};
  for (const d of departementsSeed) {
    const dep = await prisma.departements.upsert({
      where: { code_universite_id: { code: d.code, universite_id: universite.id } },
      update: { nom: d.nom },
      create: { code: d.code, nom: d.nom, universite_id: universite.id, ordre: d.ordre },
    });
    departementsParCode[d.code] = dep;
  }
  console.log(`${departementsSeed.length} departement(s) upserted pour ISTAMA INUBIL.`);

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
        departement_id: departementsParCode['GI'].id,
        annee_entree: 2023,
        created_by: admin.id,
      },
    });
    console.log(`Etudiant cree : ${etudiant.nom} ${etudiant.prenom} (${etudiant.id})`);
  } else {
    console.log(`Etudiant deja present : ${etudiantExistant.nom} ${etudiantExistant.prenom} (${etudiantExistant.id})`);
  }

  // ── 10. Compte agent de saisie de test ──────────────────────────────────────
  const agentEmail = DEFAULT_AGENT_EMAIL;
  const agentPassword = DEFAULT_AGENT_PASSWORD;
  const roleAgentSaisie = await prisma.roles.findFirst({
    where: { nom: 'agent_saisie', universite_id: null },
  });
  if (!roleAgentSaisie) {
    throw new Error('Role "agent_saisie" introuvable — verifier ROLES_METIER.');
  }

  let agent = await prisma.utilisateurs.findUnique({ where: { email: agentEmail } });
  if (agent) {
    await prisma.utilisateurs.update({
      where: { email: agentEmail },
      data: { tentatives_connexion: 0, bloque_jusqu: null },
    });
    console.log(`Compte agent de saisie deja present : ${agentEmail} (deverrouille, mot de passe inchange).`);
  } else {
    const rounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? 12);
    const motDePasseHacheAgent = await bcrypt.hash(agentPassword, rounds);
    agent = await prisma.utilisateurs.create({
      data: {
        nom: 'Saisie',
        prenom: 'Agent',
        email: agentEmail,
        mot_de_passe: motDePasseHacheAgent,
        statut: 'actif',
        email_verifie: true,
        role_id: roleAgentSaisie.id,
        universite_id: universite.id,
      },
    });
    console.log(`Compte agent de saisie cree : ${agentEmail}`);
    console.log(`  mot de passe (defaut dev) : ${agentPassword}`);
  }

  // ── 10bis. Compte chef de departement Mecanique de test (SCOPE, contrairement
  // au compte agent ci-dessus qui reste une "scolarite" sans departement associe) ─
  const chefMecaEmail = DEFAULT_CHEF_MECA_EMAIL;
  const chefMecaPassword = DEFAULT_CHEF_MECA_PASSWORD;
  let chefMeca = await prisma.utilisateurs.findUnique({ where: { email: chefMecaEmail } });
  if (chefMeca) {
    await prisma.utilisateurs.update({
      where: { email: chefMecaEmail },
      data: {
        tentatives_connexion: 0,
        bloque_jusqu: null,
        departements: { set: [{ id: departementsParCode['MECA'].id }] },
      },
    });
    console.log(`Compte chef de departement (Mecanique) deja present : ${chefMecaEmail} (deverrouille, mot de passe inchange).`);
  } else {
    const rounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? 12);
    const motDePasseHacheChefMeca = await bcrypt.hash(chefMecaPassword, rounds);
    chefMeca = await prisma.utilisateurs.create({
      data: {
        nom: 'Chef',
        prenom: 'Mecanique',
        email: chefMecaEmail,
        mot_de_passe: motDePasseHacheChefMeca,
        statut: 'actif',
        email_verifie: true,
        role_id: roleAgentSaisie.id,
        universite_id: universite.id,
        departements: { connect: [{ id: departementsParCode['MECA'].id }] },
      },
    });
    console.log(`Compte chef de departement (Mecanique) cree : ${chefMecaEmail}`);
    console.log(`  mot de passe (defaut dev) : ${chefMecaPassword}`);
  }

  // ── 11. Compte directeur pedagogique de test ────────────────────────────────
  const directeurEmail = DEFAULT_DIRECTEUR_EMAIL;
  const directeurPassword = DEFAULT_DIRECTEUR_PASSWORD;
  const roleDirecteur = await prisma.roles.findFirst({
    where: { nom: 'directeur_pedagogique', universite_id: null },
  });
  if (!roleDirecteur) {
    throw new Error('Role "directeur_pedagogique" introuvable — verifier ROLES_METIER.');
  }

  let directeur = await prisma.utilisateurs.findUnique({ where: { email: directeurEmail } });
  if (directeur) {
    await prisma.utilisateurs.update({
      where: { email: directeurEmail },
      data: { tentatives_connexion: 0, bloque_jusqu: null },
    });
    console.log(`Compte directeur pedagogique deja present : ${directeurEmail} (deverrouille, mot de passe inchange).`);
  } else {
    const rounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? 12);
    const motDePasseHacheDirecteur = await bcrypt.hash(directeurPassword, rounds);
    directeur = await prisma.utilisateurs.create({
      data: {
        nom: 'Pedagogique',
        prenom: 'Directeur',
        email: directeurEmail,
        mot_de_passe: motDePasseHacheDirecteur,
        statut: 'actif',
        email_verifie: true,
        role_id: roleDirecteur.id,
        universite_id: universite.id,
      },
    });
    console.log(`Compte directeur pedagogique cree : ${directeurEmail}`);
    console.log(`  mot de passe (defaut dev) : ${directeurPassword}`);
  }

  // ── 12. Compte espace etudiant, lie a KAMGA Bertrand ────────────────────────
  // NB : mot de passe TOUJOURS reinitialise a la valeur par defaut (contrairement
  // a l'admin/agent/directeur) — c'est un compte de test jetable, pas un compte
  // "reel" a preserver ; on privilegie un identifiant qui marche a coup sur.
  {
    const roleEtudiant = await prisma.roles.findFirst({
      where: { nom: 'etudiant', universite_id: null },
    });
    if (!roleEtudiant) {
      throw new Error('Role "etudiant" introuvable — verifier ROLES_METIER.');
    }
    const etudiantKamgaAuth = await prisma.etudiants.findFirst({
      where: { numero_etudiant: numeroEtudiant, deleted_at: null },
    });

    const rounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? 12);
    const motDePasseHacheEtudiant = await bcrypt.hash(DEFAULT_ETUDIANT_PASSWORD, rounds);

    const compteEtudiant = await prisma.utilisateurs.upsert({
      where: { email: DEFAULT_ETUDIANT_EMAIL },
      update: {
        mot_de_passe: motDePasseHacheEtudiant,
        statut: 'actif',
        tentatives_connexion: 0,
        bloque_jusqu: null,
      },
      create: {
        nom: 'Etudiant',
        prenom: 'Test',
        email: DEFAULT_ETUDIANT_EMAIL,
        mot_de_passe: motDePasseHacheEtudiant,
        statut: 'actif',
        email_verifie: true,
        role_id: roleEtudiant.id,
        universite_id: universite.id,
      },
    });
    console.log(`Compte espace etudiant : ${DEFAULT_ETUDIANT_EMAIL} / ${DEFAULT_ETUDIANT_PASSWORD} (mot de passe reinitialise)`);

    if (etudiantKamgaAuth && etudiantKamgaAuth.utilisateur_id !== compteEtudiant.id) {
      await prisma.etudiants.update({
        where: { id: etudiantKamgaAuth.id },
        data: { utilisateur_id: compteEtudiant.id },
      });
      console.log(`  lie a l'etudiant KAMGA Bertrand (${etudiantKamgaAuth.id})`);
    }
  }

  // ── 13. Document de test en attente de validation (releve pour KAMGA Bertrand) ──
  // NB : verifie l'ABSENCE d'un document brouillon/en_validation pour cet etudiant,
  // pas seulement un numero_unique fixe — un document saisi/valide manuellement
  // via l'appli (ex. INUB-2026-0001 deja "actif") ne doit pas bloquer la creation
  // d'un second document de demo destine a peupler la file de validation.
  let numeroUniqueTest: string;
  {
    const typeDocDiplome = await prisma.types_document.findFirst({
      where: { code: 'LIC-INFO', universite_id: universite.id },
    });
    const mentionAB = await prisma.mentions_document.findFirst({
      where: { code: 'AB', universite_id: universite.id },
    });
    const filiereInfo = await prisma.filieres.findFirst({
      where: { code: 'INFO', universite_id: universite.id },
    });
    const etudiantKamga = await prisma.etudiants.findFirst({
      where: { numero_etudiant: numeroEtudiant, deleted_at: null },
    });

    const enAttente = await prisma.documents.findFirst({
      where: { etudiant_id: etudiantKamga?.id, statut: { in: ['brouillon', 'en_validation'] }, deleted_at: null },
    });

    if (enAttente) {
      numeroUniqueTest = enAttente.numero_unique;
      if (!enAttente.pdf_url || !enAttente.hash_sha256) {
        const hashFictif = crypto.createHash('sha256').update(`seed-${numeroUniqueTest}`).digest('hex');
        const pdfKeyFictif = `universites/${universite.id}/diplomes/2026/07/${numeroUniqueTest}.pdf`;
        await prisma.documents.update({
          where: { id: enAttente.id },
          data: { hash_sha256: hashFictif, pdf_url: pdfKeyFictif, pdf_taille_ko: 128 },
        });
        console.log(`Document en attente de validation complete (PDF/hash factices) : ${numeroUniqueTest}`);
      } else {
        console.log(`Document en attente de validation deja present : ${numeroUniqueTest} (statut ${enAttente.statut})`);
      }
    } else if (!typeDocDiplome || !etudiantKamga) {
      numeroUniqueTest = '';
      console.warn('  ATTENTION : type de document ou etudiant introuvable — document de test non cree.');
    } else {
      const prefix = 'INUB-2026-';
      const dernier = await prisma.documents.findFirst({
        where: { numero_unique: { startsWith: prefix } },
        orderBy: { numero_unique: 'desc' },
        select: { numero_unique: true },
      });
      const seq = dernier ? parseInt(dernier.numero_unique.replace(prefix, ''), 10) + 1 : 1;
      numeroUniqueTest = `${prefix}${String(seq).padStart(4, '0')}`;

      // hash_sha256 + pdf_url factices : simulent l'etape POST /documents/:id/pdf (upload agent)
      // sans fichier reellement stocke sur S3/R2 — necessaire pour que le document apparaisse
      // dans la file de validation (FileValidation.jsx filtre sur pdf_url && hash_sha256, meme
      // regle cote backend dans documents.service.ts#valider). "Voir le PDF" echouera donc
      // (aucun objet reel dans le bucket), mais Valider/Rejeter fonctionnent normalement.
      const hashFictif = crypto.createHash('sha256').update(`seed-${numeroUniqueTest}`).digest('hex');
      const pdfKeyFictif = `universites/${universite.id}/diplomes/2026/07/${numeroUniqueTest}.pdf`;

      const document = await prisma.documents.create({
        data: {
          numero_unique: numeroUniqueTest,
          etudiant_id: etudiantKamga.id,
          universite_id: universite.id,
          type_document_id: typeDocDiplome.id,
          date_emission: new Date('2026-07-15'),
          annee_academique: '2025-2026',
          lieu_delivrance: 'Douala',
          filiere_id: filiereInfo?.id ?? null,
          mention_id: mentionAB?.id ?? null,
          moyenne_generale: 13.5,
          statut: 'brouillon',
          saisi_par: agent.id,
          hash_sha256: hashFictif,
          pdf_url: pdfKeyFictif,
          pdf_taille_ko: 128,
        },
      });
      console.log(`Document de test cree : ${document.numero_unique} (statut ${document.statut}, PDF/hash factices — "Voir le PDF" ne fonctionnera pas)`);
    }
  }

  // ── Résumé ──────────────────────────────────────────────────────────────────
  console.log('\n=== SEED TERMINE ===');
  console.log(`Admin     : ${adminEmail} / ${motDePasseFourniParEnv ? '(env)' : adminPassword}`);
  console.log(`Responsable : ${responsableEmail} / ${responsablePassword}`);
  console.log(`Agent     : ${agentEmail} / ${agentPassword} (scolarite, tous departements)`);
  console.log(`Chef Meca : ${chefMecaEmail} / ${chefMecaPassword} (scope departement Mecanique)`);
  console.log(`Directeur : ${directeurEmail} / ${directeurPassword}`);
  console.log(`Etudiant  : ${DEFAULT_ETUDIANT_EMAIL} / ${DEFAULT_ETUDIANT_PASSWORD}`);
  console.log(`Universite: ${universite.nom_court}  id=${universite.id}`);
  console.log(`Document  : ${numeroUniqueTest}`);

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
