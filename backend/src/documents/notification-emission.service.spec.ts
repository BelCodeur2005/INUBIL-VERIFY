import { Test, TestingModule } from '@nestjs/testing';
import { NotificationEmissionService } from './notification-emission.service';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
import { InvitationsService } from '../invitations/invitations.service';

const DOC_ID = 'doc-0000-0000-0000-000000000001';
const ETU_ID = 'etu-0000-0000-0000-000000000002';
const LOG_ID = 'log-0000-0000-0000-000000000003';
const EMAIL = 'bertrand.kamga@example.com';
const NUM_UNIQUE = 'INUB-2026-0001';
const UNIV_ID = 'univ-0000-0000-0000-000000000004';
const DEPT_ID = 'dept-0000-0000-0000-000000000005';
const VALIDATEUR_ID = 'val-0000-0000-0000-000000000006';
const CREATEUR_ID = 'crt-0000-0000-0000-000000000007';

const makeDoc = (overrides: any = {}) => ({
  id: DOC_ID,
  numero_unique: NUM_UNIQUE,
  url_verification: `https://verify.inubil.com/d/${NUM_UNIQUE}`,
  filieres: { nom: 'Licence en Informatique' },
  universite_id: UNIV_ID,
  etudiants: {
    id: ETU_ID,
    nom: 'KAMGA',
    prenom: 'Bertrand',
    email: EMAIL,
    departement_id: null,
    utilisateur_id: null,
    utilisateurs_etudiants_utilisateur_idToutilisateurs: null,
  },
  universites: { nom: 'ISTAMA INUBIL' },
  types_document: { nom: 'Licence' },
  utilisateurs_documents_saisi_parToutilisateurs: {
    id: CREATEUR_ID,
    email: 'agent@istama-inubil.cm',
    preferences: {},
  },
  ...overrides,
});

const makeValidateur = (overrides: any = {}) => ({
  id: VALIDATEUR_ID,
  email: 'directeur@istama-inubil.cm',
  prenom: 'Ada',
  nom: 'NGONO',
  ...overrides,
});

const makePrisma = () => ({
  documents: { findFirst: jest.fn() },
  emails_log: { create: jest.fn(), update: jest.fn() },
  utilisateurs: { findMany: jest.fn() },
});

const makeMail = () => ({
  sendDocumentEmis: jest.fn(),
  sendDocumentRévoqué: jest.fn(),
  sendDocumentAValider: jest.fn(),
  sendDocumentTraiteParStaff: jest.fn(),
});

const makeNotificationsInApp = () => ({
  creer: jest.fn().mockResolvedValue(undefined),
});

const makeInvitations = () => ({
  creerOuRelancerPourEtudiant: jest.fn().mockResolvedValue({ id: 'inv-1' }),
});

describe('NotificationEmissionService', () => {
  let service: NotificationEmissionService;
  let prisma: ReturnType<typeof makePrisma>;
  let mail: ReturnType<typeof makeMail>;
  let notificationsInApp: ReturnType<typeof makeNotificationsInApp>;
  let invitations: ReturnType<typeof makeInvitations>;

  beforeEach(async () => {
    prisma = makePrisma();
    mail = makeMail();
    notificationsInApp = makeNotificationsInApp();
    invitations = makeInvitations();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationEmissionService,
        { provide: PrismaService, useValue: prisma },
        { provide: MailService, useValue: mail },
        { provide: NotificationsService, useValue: notificationsInApp },
        { provide: InvitationsService, useValue: invitations },
      ],
    }).compile();

    service = module.get(NotificationEmissionService);
  });

  it('envoie l\'email et logue statut "envoye"', async () => {
    prisma.documents.findFirst.mockResolvedValue(makeDoc());
    prisma.emails_log.create.mockResolvedValue({ id: LOG_ID });
    mail.sendDocumentEmis.mockResolvedValue(undefined);
    prisma.emails_log.update.mockResolvedValue({});

    await service.notifierEtudiant(DOC_ID);

    expect(mail.sendDocumentEmis).toHaveBeenCalledWith(
      EMAIL,
      expect.objectContaining({ numeroUnique: NUM_UNIQUE }),
    );
    expect(prisma.emails_log.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ statut: 'envoye' }),
      }),
    );
  });

  it("utilise l'email du compte utilisateur lié s'il existe", async () => {
    const emailCompte = 'compte@univ.cm';
    const doc = makeDoc({
      etudiants: {
        ...makeDoc().etudiants,
        email: null,
        utilisateur_id: 'user-0000-0000-0000-000000000009',
        utilisateurs_etudiants_utilisateur_idToutilisateurs: {
          email: emailCompte,
        },
      },
    });
    prisma.documents.findFirst.mockResolvedValue(doc);
    prisma.emails_log.create.mockResolvedValue({ id: LOG_ID });
    mail.sendDocumentEmis.mockResolvedValue(undefined);
    prisma.emails_log.update.mockResolvedValue({});

    await service.notifierEtudiant(DOC_ID);

    expect(mail.sendDocumentEmis).toHaveBeenCalledWith(
      emailCompte,
      expect.anything(),
    );
  });

  it("invite l'étudiant à créer son espace personnel s'il n'a pas de compte", async () => {
    prisma.documents.findFirst.mockResolvedValue(makeDoc());
    prisma.emails_log.create.mockResolvedValue({ id: LOG_ID });
    mail.sendDocumentEmis.mockResolvedValue(undefined);
    prisma.emails_log.update.mockResolvedValue({});

    await service.notifierEtudiant(DOC_ID);

    expect(invitations.creerOuRelancerPourEtudiant).toHaveBeenCalledWith(
      ETU_ID,
    );
  });

  it("n'invite pas l'étudiant s'il a déjà un compte de connexion actif", async () => {
    const doc = makeDoc({
      etudiants: {
        ...makeDoc().etudiants,
        utilisateur_id: 'user-0000-0000-0000-000000000009',
        utilisateurs_etudiants_utilisateur_idToutilisateurs: {
          email: 'compte@univ.cm',
        },
      },
    });
    prisma.documents.findFirst.mockResolvedValue(doc);
    prisma.emails_log.create.mockResolvedValue({ id: LOG_ID });
    mail.sendDocumentEmis.mockResolvedValue(undefined);
    prisma.emails_log.update.mockResolvedValue({});

    await service.notifierEtudiant(DOC_ID);

    expect(invitations.creerOuRelancerPourEtudiant).not.toHaveBeenCalled();
  });

  it('logue statut "echoue" si MailService lève une erreur', async () => {
    prisma.documents.findFirst.mockResolvedValue(makeDoc());
    prisma.emails_log.create.mockResolvedValue({ id: LOG_ID });
    mail.sendDocumentEmis.mockRejectedValue(new Error('SMTP timeout'));
    prisma.emails_log.update.mockResolvedValue({});

    await service.notifierEtudiant(DOC_ID);

    expect(prisma.emails_log.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          statut: 'echoue',
          erreur: 'SMTP timeout',
        }),
      }),
    );
  });

  it("ne lève pas d'erreur si le document est introuvable", async () => {
    prisma.documents.findFirst.mockResolvedValue(null);

    await expect(service.notifierEtudiant(DOC_ID)).resolves.toBeUndefined();
    expect(mail.sendDocumentEmis).not.toHaveBeenCalled();
  });

  it("ne lève pas d'erreur si l'étudiant n'a pas d'email", async () => {
    prisma.documents.findFirst.mockResolvedValue(
      makeDoc({
        etudiants: {
          ...makeDoc().etudiants,
          email: null,
          utilisateurs_etudiants_utilisateur_idToutilisateurs: null,
        },
      }),
    );

    await expect(service.notifierEtudiant(DOC_ID)).resolves.toBeUndefined();
    expect(mail.sendDocumentEmis).not.toHaveBeenCalled();
  });

  it('crée le log emails_log avec template "document_emis"', async () => {
    prisma.documents.findFirst.mockResolvedValue(makeDoc());
    prisma.emails_log.create.mockResolvedValue({ id: LOG_ID });
    mail.sendDocumentEmis.mockResolvedValue(undefined);
    prisma.emails_log.update.mockResolvedValue({});

    await service.notifierEtudiant(DOC_ID);

    expect(prisma.emails_log.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          template: 'document_emis',
          statut: 'en_attente',
          destinataire: EMAIL,
        }),
      }),
    );
  });

  // ── notifierRevocation ────────────────────────────────────────────────────

  describe('notifierRevocation', () => {
    const makeDocRévoqué = (overrides: any = {}) => ({
      ...makeDoc(),
      raison_revocation: 'Diplôme émis par erreur - dossier étudiant incorrect',
      ...overrides,
    });

    it('envoie l\'email de révocation et logue statut "envoye"', async () => {
      prisma.documents.findFirst.mockResolvedValue(makeDocRévoqué());
      prisma.emails_log.create.mockResolvedValue({ id: LOG_ID });
      mail.sendDocumentRévoqué.mockResolvedValue(undefined);
      prisma.emails_log.update.mockResolvedValue({});

      await service.notifierRevocation(DOC_ID);

      expect(mail.sendDocumentRévoqué).toHaveBeenCalledWith(
        EMAIL,
        expect.objectContaining({ numeroUnique: NUM_UNIQUE }),
      );
      expect(prisma.emails_log.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ statut: 'envoye' }),
        }),
      );
    });

    it('crée le log avec template "document_revoque"', async () => {
      prisma.documents.findFirst.mockResolvedValue(makeDocRévoqué());
      prisma.emails_log.create.mockResolvedValue({ id: LOG_ID });
      mail.sendDocumentRévoqué.mockResolvedValue(undefined);
      prisma.emails_log.update.mockResolvedValue({});

      await service.notifierRevocation(DOC_ID);

      expect(prisma.emails_log.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            template: 'document_revoque',
            statut: 'en_attente',
            destinataire: EMAIL,
          }),
        }),
      );
    });

    it('logue statut "echoue" si MailService lève une erreur', async () => {
      prisma.documents.findFirst.mockResolvedValue(makeDocRévoqué());
      prisma.emails_log.create.mockResolvedValue({ id: LOG_ID });
      mail.sendDocumentRévoqué.mockRejectedValue(new Error('SMTP down'));
      prisma.emails_log.update.mockResolvedValue({});

      await service.notifierRevocation(DOC_ID);

      expect(prisma.emails_log.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            statut: 'echoue',
            erreur: 'SMTP down',
          }),
        }),
      );
    });

    it("ne lève pas d'erreur si le document est introuvable", async () => {
      prisma.documents.findFirst.mockResolvedValue(null);
      await expect(service.notifierRevocation(DOC_ID)).resolves.toBeUndefined();
      expect(mail.sendDocumentRévoqué).not.toHaveBeenCalled();
    });

    it("ne lève pas d'erreur si l'étudiant n'a pas d'email", async () => {
      prisma.documents.findFirst.mockResolvedValue(
        makeDocRévoqué({
          etudiants: {
            ...makeDoc().etudiants,
            email: null,
            utilisateurs_etudiants_utilisateur_idToutilisateurs: null,
          },
        }),
      );
      await expect(service.notifierRevocation(DOC_ID)).resolves.toBeUndefined();
      expect(mail.sendDocumentRévoqué).not.toHaveBeenCalled();
    });
  });

  // ── notifierValidateurs ───────────────────────────────────────────────────

  describe('notifierValidateurs', () => {
    it('notifie (email + in-app) chaque validateur trouvé', async () => {
      prisma.documents.findFirst.mockResolvedValue(makeDoc());
      prisma.utilisateurs.findMany.mockResolvedValue([makeValidateur()]);
      prisma.emails_log.create.mockResolvedValue({ id: LOG_ID });
      mail.sendDocumentAValider.mockResolvedValue(undefined);
      prisma.emails_log.update.mockResolvedValue({});

      await service.notifierValidateurs(DOC_ID);

      expect(mail.sendDocumentAValider).toHaveBeenCalledWith(
        'directeur@istama-inubil.cm',
        expect.objectContaining({
          numeroUnique: NUM_UNIQUE,
          documentId: DOC_ID,
        }),
      );
      expect(notificationsInApp.creer).toHaveBeenCalledWith(
        expect.objectContaining({
          utilisateurId: VALIDATEUR_ID,
          type: 'document_a_valider',
        }),
      );
      expect(prisma.emails_log.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ statut: 'envoye' }),
        }),
      );
    });

    it("interroge les universite_id + roles directeur_pedagogique/responsable_universite, sans departement ou departement de l'etudiant", async () => {
      prisma.documents.findFirst.mockResolvedValue(
        makeDoc({
          etudiants: { ...makeDoc().etudiants, departement_id: DEPT_ID },
        }),
      );
      prisma.utilisateurs.findMany.mockResolvedValue([makeValidateur()]);
      prisma.emails_log.create.mockResolvedValue({ id: LOG_ID });
      prisma.emails_log.update.mockResolvedValue({});

      await service.notifierValidateurs(DOC_ID);

      expect(prisma.utilisateurs.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            universite_id: UNIV_ID,
            roles_utilisateurs_role_idToroles: {
              nom: { in: ['directeur_pedagogique', 'responsable_universite'] },
            },
            OR: [
              { departements: { none: {} } },
              { departements: { some: { id: DEPT_ID } } },
            ],
          }),
        }),
      );
    });

    it("ne fait rien si aucun validateur n'est trouvé", async () => {
      prisma.documents.findFirst.mockResolvedValue(makeDoc());
      prisma.utilisateurs.findMany.mockResolvedValue([]);

      await expect(
        service.notifierValidateurs(DOC_ID),
      ).resolves.toBeUndefined();
      expect(mail.sendDocumentAValider).not.toHaveBeenCalled();
      expect(notificationsInApp.creer).not.toHaveBeenCalled();
    });

    it("ne lève pas d'erreur si le document est introuvable", async () => {
      prisma.documents.findFirst.mockResolvedValue(null);

      await expect(
        service.notifierValidateurs(DOC_ID),
      ).resolves.toBeUndefined();
      expect(prisma.utilisateurs.findMany).not.toHaveBeenCalled();
    });

    it('logue statut "echoue" pour un validateur si MailService lève une erreur, sans bloquer les autres', async () => {
      const autreValidateur = makeValidateur({
        id: 'val-2',
        email: 'autre@istama-inubil.cm',
      });
      prisma.documents.findFirst.mockResolvedValue(makeDoc());
      prisma.utilisateurs.findMany.mockResolvedValue([
        makeValidateur(),
        autreValidateur,
      ]);
      prisma.emails_log.create.mockResolvedValue({ id: LOG_ID });
      prisma.emails_log.update.mockResolvedValue({});
      mail.sendDocumentAValider
        .mockRejectedValueOnce(new Error('SMTP down'))
        .mockResolvedValueOnce(undefined);

      await service.notifierValidateurs(DOC_ID);

      expect(mail.sendDocumentAValider).toHaveBeenCalledTimes(2);
      expect(prisma.emails_log.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            statut: 'echoue',
            erreur: 'SMTP down',
          }),
        }),
      );
      expect(prisma.emails_log.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ statut: 'envoye' }),
        }),
      );
    });
  });

  // ── notifierCreateur ──────────────────────────────────────────────────────

  describe('notifierCreateur', () => {
    it('notifie (email + in-app) le créateur quand validé', async () => {
      prisma.documents.findFirst.mockResolvedValue(makeDoc());
      prisma.emails_log.create.mockResolvedValue({ id: LOG_ID });
      mail.sendDocumentTraiteParStaff.mockResolvedValue(undefined);
      prisma.emails_log.update.mockResolvedValue({});

      await service.notifierCreateur(DOC_ID, 'valide');

      expect(notificationsInApp.creer).toHaveBeenCalledWith(
        expect.objectContaining({
          utilisateurId: CREATEUR_ID,
          type: 'document_valide',
        }),
      );
      expect(mail.sendDocumentTraiteParStaff).toHaveBeenCalledWith(
        'agent@istama-inubil.cm',
        expect.objectContaining({
          decision: 'valide',
          numeroUnique: NUM_UNIQUE,
        }),
      );
    });

    it('notifie avec le motif quand rejeté', async () => {
      prisma.documents.findFirst.mockResolvedValue(makeDoc());
      prisma.emails_log.create.mockResolvedValue({ id: LOG_ID });
      mail.sendDocumentTraiteParStaff.mockResolvedValue(undefined);
      prisma.emails_log.update.mockResolvedValue({});

      await service.notifierCreateur(DOC_ID, 'rejete', 'Nom incorrect');

      expect(notificationsInApp.creer).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'document_rejete' }),
      );
      expect(mail.sendDocumentTraiteParStaff).toHaveBeenCalledWith(
        'agent@istama-inubil.cm',
        expect.objectContaining({
          decision: 'rejete',
          motifRejet: 'Nom incorrect',
        }),
      );
    });

    it("n'envoie pas d'email si la préférence est désactivée, mais crée quand même l'in-app", async () => {
      prisma.documents.findFirst.mockResolvedValue(
        makeDoc({
          utilisateurs_documents_saisi_parToutilisateurs: {
            id: CREATEUR_ID,
            email: 'agent@istama-inubil.cm',
            preferences: { documents_valides: false },
          },
        }),
      );

      await service.notifierCreateur(DOC_ID, 'valide');

      expect(notificationsInApp.creer).toHaveBeenCalled();
      expect(mail.sendDocumentTraiteParStaff).not.toHaveBeenCalled();
      expect(prisma.emails_log.create).not.toHaveBeenCalled();
    });

    it("ne lève pas d'erreur si le document ou son créateur est introuvable", async () => {
      prisma.documents.findFirst.mockResolvedValue(
        makeDoc({ utilisateurs_documents_saisi_parToutilisateurs: null }),
      );

      await expect(
        service.notifierCreateur(DOC_ID, 'valide'),
      ).resolves.toBeUndefined();
      expect(mail.sendDocumentTraiteParStaff).not.toHaveBeenCalled();
    });
  });
});
