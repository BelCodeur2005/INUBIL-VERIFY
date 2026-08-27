import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { EtudiantsService } from './etudiants.service';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { ConfigurationsService } from '../configurations/configurations.service';
import { StorageService } from '../storage/storage.service';

const USER_ID   = 'usr-0000-0000-0000-000000000001';
const ETU_ID    = 'etu-0000-0000-0000-000000000002';
const DOC_ID    = 'doc-0000-0000-0000-000000000003';
const PARTAGE_ID = 'par-0000-0000-0000-000000000004';

const makeEtudiant = (overrides = {}) => ({
  id:              ETU_ID,
  utilisateur_id:  USER_ID,
  numero_etudiant: 'ETU-001',
  nom:             'KAMGA',
  prenom:          'Bertrand',
  email:           'bertrand@istama.cm',
  telephone:       null,
  photo_url:       null,
  date_naissance:  null,
  lieu_naissance:  null,
  nationalite:     null,
  annee_entree:    2022,
  universite_id:   'univ-0000-0000-0000-000000000001',
  deleted_at:      null,
  created_at:      new Date('2026-01-01'),
  universites:     { nom: 'ISTAMA INUBIL' },
  ...overrides,
});

const makeDoc = (overrides = {}) => ({
  id:               DOC_ID,
  numero_unique:    'INUB-2026-0001',
  filiere:          'Licence en Informatique',
  annee_academique: '2025-2026',
  date_emission:    new Date('2026-06-01'),
  statut:           'actif',
  moyenne_generale: 13.5,
  url_verification: null,
  pdf_url:          'documents/INUB-2026-0001.pdf',
  types_document:   { nom: 'Licence', categorie: 'diplome' },
  mentions_document: { nom: 'Assez Bien' },
  universites:      { nom: 'ISTAMA INUBIL' },
  matieres_document: [],
  ...overrides,
});

const makeVerif = (overrides = {}) => ({
  id:                'ver-0000-0000-0000-000000000005',
  document_id:       DOC_ID,
  type_verification: 'lien_unique',
  resultat:          'authentique',
  created_at:        new Date('2026-08-20T10:00:00.000Z'),
  documents:         { numero_unique: 'INUB-2026-0001', types_document: { nom: 'Licence' } },
  partages_document: null,
  ...overrides,
});

const makePartage = (overrides = {}) => ({
  id:                          PARTAGE_ID,
  document_id:                 DOC_ID,
  etudiant_id:                 ETU_ID,
  token_acces:                 'a'.repeat(64),
  email_destinataire_externe:  'dest@example.com',
  universite_destinataire_id:  null,
  date_expiration:             null,
  statut:                      'actif',
  nb_consultations:            3,
  derniere_consultation:       null,
  revoque_le:                  null,
  revoque_par:                 null,
  created_at:                  new Date('2026-06-01'),
  universites:                 null,
  documents:                   { types_document: { nom: 'Licence' } },
  ...overrides,
});

const makeMail = () => ({
  sendPartageCreé: jest.fn().mockResolvedValue(undefined),
});

const makeConfigurations = () => ({
  get: jest.fn().mockResolvedValue('30'),
});

const makeStorage = () => ({
  getPresignedUrl: jest.fn().mockResolvedValue('https://s3.example.com/signed-url'),
});

const makePrisma = () => ({
  etudiants: {
    findFirst: jest.fn(),
  },
  documents: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    count: jest.fn(),
  },
  partages_document: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
  },
  verifications: {
    count: jest.fn(),
    findMany: jest.fn(),
  },
});

describe('EtudiantsService', () => {
  let service: EtudiantsService;
  let prisma: ReturnType<typeof makePrisma>;
  let mail: ReturnType<typeof makeMail>;
  let configurations: ReturnType<typeof makeConfigurations>;
  let storage: ReturnType<typeof makeStorage>;

  beforeEach(async () => {
    prisma = makePrisma();
    mail   = makeMail();
    configurations = makeConfigurations();
    storage = makeStorage();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EtudiantsService,
        { provide: PrismaService, useValue: prisma },
        { provide: MailService,   useValue: mail   },
        { provide: ConfigurationsService, useValue: configurations },
        { provide: StorageService, useValue: storage },
      ],
    }).compile();

    service = module.get(EtudiantsService);
  });

  // ── trouverEtudiantDuCompte ───────────────────────────────────────────────

  describe('accès sans dossier étudiant', () => {
    it('lève ForbiddenException si aucun étudiant lié au compte', async () => {
      prisma.etudiants.findFirst.mockResolvedValue(null);
      await expect(service.profil(USER_ID)).rejects.toThrow(ForbiddenException);
    });
  });

  // ── profil ────────────────────────────────────────────────────────────────

  describe('profil', () => {
    it('retourne le profil complet de l\'étudiant', async () => {
      prisma.etudiants.findFirst.mockResolvedValue(makeEtudiant());

      const result = await service.profil(USER_ID);

      expect(result.id).toBe(ETU_ID);
      expect(result.nom).toBe('KAMGA');
      expect(result.prenom).toBe('Bertrand');
      expect(result.universite).toBe('ISTAMA INUBIL');
      expect(result.numero_etudiant).toBe('ETU-001');
    });
  });

  // ── listerDocuments ───────────────────────────────────────────────────────

  describe('listerDocuments', () => {
    it('retourne la liste paginée des documents', async () => {
      prisma.etudiants.findFirst.mockResolvedValue(makeEtudiant());
      prisma.documents.findMany.mockResolvedValue([makeDoc()]);
      prisma.documents.count.mockResolvedValue(1);

      const result = await service.listerDocuments(USER_ID, {});

      expect(result.total).toBe(1);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].numero_unique).toBe('INUB-2026-0001');
      expect(result.data[0].mention).toBe('Assez Bien');
      expect(result.data[0].a_un_pdf).toBe(true);
      expect(result.data[0].hash_sha256).toBeNull();
    });

    it('expose le hash et la transaction blockchain quand le document est ancré', async () => {
      prisma.etudiants.findFirst.mockResolvedValue(makeEtudiant());
      prisma.documents.findMany.mockResolvedValue([
        makeDoc({
          hash_sha256:      'a'.repeat(64),
          transaction_hash: '0x' + 'b'.repeat(64),
          reseau:           'polygon_amoy',
          bloc_numero:      BigInt(123456),
          emis_le:          new Date('2026-06-02'),
        }),
      ]);
      prisma.documents.count.mockResolvedValue(1);

      const result = await service.listerDocuments(USER_ID, {});

      expect(result.data[0].hash_sha256).toBe('a'.repeat(64));
      expect(result.data[0].transaction_hash).toBe('0x' + 'b'.repeat(64));
      expect(result.data[0].reseau).toBe('polygon_amoy');
      expect(result.data[0].bloc_numero).toBe('123456');
      expect(result.data[0].date_enregistrement).toEqual(new Date('2026-06-02'));
    });

    it('filtre par statut si fourni', async () => {
      prisma.etudiants.findFirst.mockResolvedValue(makeEtudiant());
      prisma.documents.findMany.mockResolvedValue([]);
      prisma.documents.count.mockResolvedValue(0);

      await service.listerDocuments(USER_ID, { statut: 'revoque' });

      expect(prisma.documents.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ statut: 'revoque' }),
        }),
      );
    });

    it('paginé : page 2, limit 5', async () => {
      prisma.etudiants.findFirst.mockResolvedValue(makeEtudiant());
      prisma.documents.findMany.mockResolvedValue([]);
      prisma.documents.count.mockResolvedValue(10);

      const result = await service.listerDocuments(USER_ID, { page: 2, limit: 5 });

      expect(result.page).toBe(2);
      expect(result.limit).toBe(5);
      expect(prisma.documents.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 5, take: 5 }),
      );
    });
  });

  // ── listerVerifications ────────────────────────────────────────────────────

  describe('listerVerifications', () => {
    it('retourne l\'historique des verifications, evenement anonyme par defaut', async () => {
      prisma.etudiants.findFirst.mockResolvedValue(makeEtudiant());
      prisma.verifications.findMany.mockResolvedValue([makeVerif()]);
      prisma.verifications.count.mockResolvedValue(1);

      const result = await service.listerVerifications(USER_ID, {});

      expect(result.total).toBe(1);
      expect(result.data[0].numero_unique).toBe('INUB-2026-0001');
      expect(result.data[0].type_verification).toBe('lien_unique');
      expect(result.data[0].destinataire_partage).toBeNull();
      expect(prisma.verifications.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { documents: { etudiant_id: ETU_ID } } }),
      );
    });

    it('expose le destinataire quand la verification est passee par un partage de l\'etudiant', async () => {
      prisma.etudiants.findFirst.mockResolvedValue(makeEtudiant());
      prisma.verifications.findMany.mockResolvedValue([
        makeVerif({ partages_document: { email_destinataire_externe: 'rh@orange.cm' } }),
      ]);
      prisma.verifications.count.mockResolvedValue(1);

      const result = await service.listerVerifications(USER_ID, {});

      expect(result.data[0].destinataire_partage).toBe('rh@orange.cm');
    });

    it('paginé : page 2, limit 5', async () => {
      prisma.etudiants.findFirst.mockResolvedValue(makeEtudiant());
      prisma.verifications.findMany.mockResolvedValue([]);
      prisma.verifications.count.mockResolvedValue(10);

      const result = await service.listerVerifications(USER_ID, { page: 2, limit: 5 });

      expect(result.page).toBe(2);
      expect(result.limit).toBe(5);
      expect(prisma.verifications.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 5, take: 5 }),
      );
    });
  });

  // ── obtenirUrlPdf ─────────────────────────────────────────────────────────

  describe('obtenirUrlPdf', () => {
    it('retourne un lien presigné pour un document actif appartenant à l\'étudiant', async () => {
      prisma.etudiants.findFirst.mockResolvedValue(makeEtudiant());
      prisma.documents.findFirst.mockResolvedValue(makeDoc());

      const result = await service.obtenirUrlPdf(USER_ID, DOC_ID);

      expect(result.url).toBe('https://s3.example.com/signed-url');
      expect(result.expires_in_seconds).toBe(30 * 60);
      expect(storage.getPresignedUrl).toHaveBeenCalledWith('documents/INUB-2026-0001.pdf', 30 * 60);
    });

    it('lève NotFoundException si le document n\'appartient pas à l\'étudiant', async () => {
      prisma.etudiants.findFirst.mockResolvedValue(makeEtudiant());
      prisma.documents.findFirst.mockResolvedValue(null);

      await expect(service.obtenirUrlPdf(USER_ID, DOC_ID))
        .rejects.toThrow(NotFoundException);
    });

    it('lève ForbiddenException si le document est révoqué', async () => {
      prisma.etudiants.findFirst.mockResolvedValue(makeEtudiant());
      prisma.documents.findFirst.mockResolvedValue(makeDoc({ statut: 'revoque' }));

      await expect(service.obtenirUrlPdf(USER_ID, DOC_ID))
        .rejects.toThrow(ForbiddenException);
    });

    it('lève BadRequestException si aucun PDF n\'est associé', async () => {
      prisma.etudiants.findFirst.mockResolvedValue(makeEtudiant());
      prisma.documents.findFirst.mockResolvedValue(makeDoc({ pdf_url: null }));

      await expect(service.obtenirUrlPdf(USER_ID, DOC_ID))
        .rejects.toThrow(BadRequestException);
    });

    it('lève BadRequestException si le stockage S3 n\'est pas configuré', async () => {
      prisma.etudiants.findFirst.mockResolvedValue(makeEtudiant());
      prisma.documents.findFirst.mockResolvedValue(makeDoc());
      storage.getPresignedUrl.mockResolvedValue(null);

      await expect(service.obtenirUrlPdf(USER_ID, DOC_ID))
        .rejects.toThrow(BadRequestException);
    });
  });

  // ── creerPartage ──────────────────────────────────────────────────────────

  describe('creerPartage', () => {
    it('crée un partage pour un document actif', async () => {
      prisma.etudiants.findFirst.mockResolvedValue(makeEtudiant());
      prisma.documents.findFirst.mockResolvedValue(makeDoc());
      prisma.partages_document.create.mockResolvedValue(makePartage());

      const result = await service.creerPartage(USER_ID, {
        document_id: DOC_ID,
        email_destinataire: 'dest@example.com',
      });

      expect(result.id).toBe(PARTAGE_ID);
      expect(result.statut).toBe('actif');
      expect(result.email_destinataire).toBe('dest@example.com');
    });

    it('génère un token_acces de 64 caractères hex', async () => {
      prisma.etudiants.findFirst.mockResolvedValue(makeEtudiant());
      prisma.documents.findFirst.mockResolvedValue(makeDoc());

      let capturedData: any;
      prisma.partages_document.create.mockImplementation(async ({ data }: any) => {
        capturedData = data;
        return makePartage({ token_acces: data.token_acces });
      });

      await service.creerPartage(USER_ID, { document_id: DOC_ID });

      expect(capturedData.token_acces).toMatch(/^[0-9a-f]{64}$/);
    });

    it('lève NotFoundException si le document n\'appartient pas à l\'étudiant', async () => {
      prisma.etudiants.findFirst.mockResolvedValue(makeEtudiant());
      prisma.documents.findFirst.mockResolvedValue(null);

      await expect(service.creerPartage(USER_ID, { document_id: DOC_ID }))
        .rejects.toThrow(NotFoundException);
    });

    it('lève BadRequestException si le document n\'est pas actif', async () => {
      prisma.etudiants.findFirst.mockResolvedValue(makeEtudiant());
      prisma.documents.findFirst.mockResolvedValue(makeDoc({ statut: 'brouillon' }));

      await expect(service.creerPartage(USER_ID, { document_id: DOC_ID }))
        .rejects.toThrow(BadRequestException);
    });

    it('envoie l\'email au destinataire si email_destinataire est fourni', async () => {
      prisma.etudiants.findFirst.mockResolvedValue(makeEtudiant());
      prisma.documents.findFirst.mockResolvedValue(makeDoc());
      prisma.partages_document.create.mockResolvedValue(makePartage());

      await service.creerPartage(USER_ID, {
        document_id:        DOC_ID,
        email_destinataire: 'recruteur@entreprise.cm',
      });

      // fire & forget - on vérifie juste que sendPartageCreé a été appelé
      expect(mail.sendPartageCreé).toHaveBeenCalledWith(
        'recruteur@entreprise.cm',
        expect.objectContaining({ prenomNomEtudiant: 'Bertrand KAMGA' }),
      );
    });

    it('n\'envoie pas d\'email si aucun destinataire n\'est fourni', async () => {
      prisma.etudiants.findFirst.mockResolvedValue(makeEtudiant());
      prisma.documents.findFirst.mockResolvedValue(makeDoc());
      prisma.partages_document.create.mockResolvedValue(makePartage());

      await service.creerPartage(USER_ID, { document_id: DOC_ID });

      expect(mail.sendPartageCreé).not.toHaveBeenCalled();
    });

    it('calcule l\'expiration par défaut depuis le paramètre systeme partage_duree_jours', async () => {
      prisma.etudiants.findFirst.mockResolvedValue(makeEtudiant());
      prisma.documents.findFirst.mockResolvedValue(makeDoc());
      configurations.get.mockResolvedValue('7');

      let capturedData: any;
      prisma.partages_document.create.mockImplementation(async ({ data }: any) => {
        capturedData = data;
        return makePartage({ date_expiration: data.date_expiration });
      });

      const avant = Date.now();
      await service.creerPartage(USER_ID, { document_id: DOC_ID });

      expect(configurations.get).toHaveBeenCalledWith('partage_duree_jours', '30');
      const ecartJours = (capturedData.date_expiration.getTime() - avant) / (24 * 3600 * 1000);
      expect(ecartJours).toBeGreaterThan(6.9);
      expect(ecartJours).toBeLessThan(7.1);
    });

    it('retombe sur 30 jours si partage_duree_jours n\'est pas configuré ou invalide', async () => {
      prisma.etudiants.findFirst.mockResolvedValue(makeEtudiant());
      prisma.documents.findFirst.mockResolvedValue(makeDoc());
      configurations.get.mockResolvedValue(undefined);

      let capturedData: any;
      prisma.partages_document.create.mockImplementation(async ({ data }: any) => {
        capturedData = data;
        return makePartage({ date_expiration: data.date_expiration });
      });

      const avant = Date.now();
      await service.creerPartage(USER_ID, { document_id: DOC_ID });

      const ecartJours = (capturedData.date_expiration.getTime() - avant) / (24 * 3600 * 1000);
      expect(ecartJours).toBeGreaterThan(29.9);
      expect(ecartJours).toBeLessThan(30.1);
    });

    it('ne fixe aucune expiration si permanent=true', async () => {
      prisma.etudiants.findFirst.mockResolvedValue(makeEtudiant());
      prisma.documents.findFirst.mockResolvedValue(makeDoc());

      let capturedData: any;
      prisma.partages_document.create.mockImplementation(async ({ data }: any) => {
        capturedData = data;
        return makePartage({ date_expiration: null });
      });

      await service.creerPartage(USER_ID, { document_id: DOC_ID, permanent: true });

      expect(capturedData.date_expiration).toBeNull();
      expect(configurations.get).not.toHaveBeenCalled();
    });

    it('priorise date_expiration explicite sur le calcul par defaut', async () => {
      prisma.etudiants.findFirst.mockResolvedValue(makeEtudiant());
      prisma.documents.findFirst.mockResolvedValue(makeDoc());

      let capturedData: any;
      prisma.partages_document.create.mockImplementation(async ({ data }: any) => {
        capturedData = data;
        return makePartage({ date_expiration: data.date_expiration });
      });

      await service.creerPartage(USER_ID, {
        document_id: DOC_ID,
        date_expiration: '2026-12-31T23:59:59Z',
      });

      expect(capturedData.date_expiration).toEqual(new Date('2026-12-31T23:59:59Z'));
      expect(configurations.get).not.toHaveBeenCalled();
    });
  });

  // ── listerPartages ────────────────────────────────────────────────────────

  describe('listerPartages', () => {
    it('retourne les partages actifs', async () => {
      prisma.etudiants.findFirst.mockResolvedValue(makeEtudiant());
      prisma.partages_document.findMany.mockResolvedValue([makePartage()]);

      const result = await service.listerPartages(USER_ID);

      expect(result).toHaveLength(1);
      expect(result[0].nb_consultations).toBe(3);
    });

    it('filtre uniquement statut actif', async () => {
      prisma.etudiants.findFirst.mockResolvedValue(makeEtudiant());
      prisma.partages_document.findMany.mockResolvedValue([]);

      await service.listerPartages(USER_ID);

      expect(prisma.partages_document.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ statut: 'actif' }),
        }),
      );
    });
  });

  // ── revoquerPartage ───────────────────────────────────────────────────────

  describe('revoquerPartage', () => {
    it('révoque un partage actif', async () => {
      prisma.etudiants.findFirst.mockResolvedValue(makeEtudiant());
      prisma.partages_document.findFirst.mockResolvedValue(makePartage());
      prisma.partages_document.update.mockResolvedValue({});

      await service.revoquerPartage(PARTAGE_ID, USER_ID);

      expect(prisma.partages_document.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: PARTAGE_ID },
          data: expect.objectContaining({
            statut:      'revoque',
            revoque_par: USER_ID,
          }),
        }),
      );
    });

    it('lève NotFoundException si le partage n\'appartient pas à l\'étudiant', async () => {
      prisma.etudiants.findFirst.mockResolvedValue(makeEtudiant());
      prisma.partages_document.findFirst.mockResolvedValue(null);

      await expect(service.revoquerPartage(PARTAGE_ID, USER_ID))
        .rejects.toThrow(NotFoundException);
    });

    it('lève BadRequestException si déjà révoqué', async () => {
      prisma.etudiants.findFirst.mockResolvedValue(makeEtudiant());
      prisma.partages_document.findFirst.mockResolvedValue(makePartage({ statut: 'revoque' }));

      await expect(service.revoquerPartage(PARTAGE_ID, USER_ID))
        .rejects.toThrow(BadRequestException);
    });
  });

  // ── statistiques ──────────────────────────────────────────────────────────

  describe('statistiques', () => {
    it('retourne les compteurs corrects', async () => {
      prisma.etudiants.findFirst.mockResolvedValue(makeEtudiant());
      prisma.documents.count
        .mockResolvedValueOnce(5)  // total
        .mockResolvedValueOnce(3)  // actifs
        .mockResolvedValueOnce(1)  // en_validation
        .mockResolvedValueOnce(1); // revoques
      prisma.verifications.count
        .mockResolvedValueOnce(42) // total
        .mockResolvedValueOnce(7); // ce_mois
      prisma.partages_document.count.mockResolvedValue(2);
      prisma.partages_document.aggregate.mockResolvedValue({ _sum: { nb_consultations: 15 } });

      const result = await service.statistiques(USER_ID);

      expect(result.documents.total).toBe(5);
      expect(result.documents.actifs).toBe(3);
      expect(result.verifications.total).toBe(42);
      expect(result.verifications.ce_mois).toBe(7);
      expect(result.partages.actifs).toBe(2);
      expect(result.partages.total_consultations).toBe(15);
    });

    it('retourne 0 si aucune consultation', async () => {
      prisma.etudiants.findFirst.mockResolvedValue(makeEtudiant());
      prisma.documents.count.mockResolvedValue(0);
      prisma.verifications.count.mockResolvedValue(0);
      prisma.partages_document.count.mockResolvedValue(0);
      prisma.partages_document.aggregate.mockResolvedValue({ _sum: { nb_consultations: null } });

      const result = await service.statistiques(USER_ID);

      expect(result.partages.total_consultations).toBe(0);
    });
  });
});
