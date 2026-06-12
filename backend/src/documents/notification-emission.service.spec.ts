import { Test, TestingModule } from '@nestjs/testing';
import { NotificationEmissionService } from './notification-emission.service';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

const DOC_ID     = 'doc-0000-0000-0000-000000000001';
const ETU_ID     = 'etu-0000-0000-0000-000000000002';
const LOG_ID     = 'log-0000-0000-0000-000000000003';
const EMAIL      = 'bertrand.kamga@example.com';
const NUM_UNIQUE = 'INUB-2026-0001';

const makeDoc = (overrides: any = {}) => ({
  id: DOC_ID,
  numero_unique: NUM_UNIQUE,
  url_verification: `https://verify.inubil.com/d/${NUM_UNIQUE}`,
  filiere: 'Licence en Informatique',
  etudiants: {
    id: ETU_ID,
    nom: 'KAMGA',
    prenom: 'Bertrand',
    email: EMAIL,
    utilisateurs_etudiants_utilisateur_idToutilisateurs: null,
  },
  universites: { nom: 'ISTAMA INUBIL' },
  types_document: { nom: 'Licence' },
  ...overrides,
});

const makePrisma = () => ({
  documents:  { findFirst: jest.fn() },
  emails_log: { create: jest.fn(), update: jest.fn() },
});

const makeMail = () => ({
  sendDocumentEmis:     jest.fn(),
  sendDocumentRévoqué:  jest.fn(),
});

describe('NotificationEmissionService', () => {
  let service: NotificationEmissionService;
  let prisma: ReturnType<typeof makePrisma>;
  let mail: ReturnType<typeof makeMail>;

  beforeEach(async () => {
    prisma = makePrisma();
    mail   = makeMail();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationEmissionService,
        { provide: PrismaService, useValue: prisma },
        { provide: MailService,   useValue: mail  },
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
      expect.objectContaining({ data: expect.objectContaining({ statut: 'envoye' }) }),
    );
  });

  it('utilise l\'email du compte utilisateur lié s\'il existe', async () => {
    const emailCompte = 'compte@univ.cm';
    const doc = makeDoc({
      etudiants: {
        ...makeDoc().etudiants,
        email: null,
        utilisateurs_etudiants_utilisateur_idToutilisateurs: { email: emailCompte },
      },
    });
    prisma.documents.findFirst.mockResolvedValue(doc);
    prisma.emails_log.create.mockResolvedValue({ id: LOG_ID });
    mail.sendDocumentEmis.mockResolvedValue(undefined);
    prisma.emails_log.update.mockResolvedValue({});

    await service.notifierEtudiant(DOC_ID);

    expect(mail.sendDocumentEmis).toHaveBeenCalledWith(emailCompte, expect.anything());
  });

  it('logue statut "echoue" si MailService lève une erreur', async () => {
    prisma.documents.findFirst.mockResolvedValue(makeDoc());
    prisma.emails_log.create.mockResolvedValue({ id: LOG_ID });
    mail.sendDocumentEmis.mockRejectedValue(new Error('SMTP timeout'));
    prisma.emails_log.update.mockResolvedValue({});

    await service.notifierEtudiant(DOC_ID);

    expect(prisma.emails_log.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ statut: 'echoue', erreur: 'SMTP timeout' }),
      }),
    );
  });

  it('ne lève pas d\'erreur si le document est introuvable', async () => {
    prisma.documents.findFirst.mockResolvedValue(null);

    await expect(service.notifierEtudiant(DOC_ID)).resolves.toBeUndefined();
    expect(mail.sendDocumentEmis).not.toHaveBeenCalled();
  });

  it('ne lève pas d\'erreur si l\'étudiant n\'a pas d\'email', async () => {
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
      raison_revocation: 'Diplôme émis par erreur — dossier étudiant incorrect',
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
        expect.objectContaining({ data: expect.objectContaining({ statut: 'envoye' }) }),
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
            template:    'document_revoque',
            statut:      'en_attente',
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
          data: expect.objectContaining({ statut: 'echoue', erreur: 'SMTP down' }),
        }),
      );
    });

    it('ne lève pas d\'erreur si le document est introuvable', async () => {
      prisma.documents.findFirst.mockResolvedValue(null);
      await expect(service.notifierRevocation(DOC_ID)).resolves.toBeUndefined();
      expect(mail.sendDocumentRévoqué).not.toHaveBeenCalled();
    });

    it('ne lève pas d\'erreur si l\'étudiant n\'a pas d\'email', async () => {
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
});
