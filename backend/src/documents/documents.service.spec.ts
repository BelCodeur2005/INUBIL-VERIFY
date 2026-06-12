import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { HashService } from './hash.service';
import { QrCodeService } from './qr-code.service';
import { NotificationEmissionService } from './notification-emission.service';

// ─── Mocks ────────────────────────────────────────────────────────────────

const ACTEUR_ID   = 'aaa-acteur-0000-0000-000000000001';
const UNIV_ID     = 'bbb-univ-0000-0000-000000000002';
const DOC_ID      = 'ccc-doc-0000-0000-000000000003';
const ETUDIANT_ID = 'ddd-etu-0000-0000-000000000004';
const TYPE_ID     = 'eee-type-0000-0000-000000000005';

const makePrisma = () => ({
  utilisateurs:       { findFirst: jest.fn() },
  etudiants:          { findFirst: jest.fn() },
  types_document:     { findFirst: jest.fn() },
  documents:          { findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), findMany: jest.fn(), count: jest.fn() },
  matieres_document:  {},
});

const makeAudit = () => ({ log: jest.fn() });
const makeHash  = () => ({ calculateHash: jest.fn().mockReturnValue('a'.repeat(64)) });
const makeQr    = () => ({ generateQr: jest.fn().mockResolvedValue(Buffer.from('PNG')) });
const makeNotif = () => ({
  notifierEtudiant:   jest.fn().mockResolvedValue(undefined),
  notifierRevocation: jest.fn().mockResolvedValue(undefined),
});

const makeActeur = (univId: string | null = UNIV_ID) => ({
  universite_id: univId,
});

const makeDocument = (overrides: any = {}) => ({
  id: DOC_ID,
  numero_unique: 'INUB-2026-0001',
  universite_id: UNIV_ID,
  etudiant_id: ETUDIANT_ID,
  type_document_id: TYPE_ID,
  statut: 'brouillon',
  deleted_at: null,
  matieres_document: [],
  ...overrides,
});

// ─── Suite ────────────────────────────────────────────────────────────────

describe('DocumentsService', () => {
  let service: DocumentsService;
  let prisma: ReturnType<typeof makePrisma>;
  let audit: ReturnType<typeof makeAudit>;
  let hash: ReturnType<typeof makeHash>;
  let qr: ReturnType<typeof makeQr>;
  let notif: ReturnType<typeof makeNotif>;

  beforeEach(async () => {
    prisma = makePrisma();
    audit  = makeAudit();
    hash   = makeHash();
    qr     = makeQr();
    notif  = makeNotif();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        { provide: PrismaService,               useValue: prisma },
        { provide: AuditService,                useValue: audit  },
        { provide: HashService,                 useValue: hash   },
        { provide: QrCodeService,               useValue: qr     },
        { provide: NotificationEmissionService, useValue: notif  },
      ],
    }).compile();

    service = module.get(DocumentsService);
  });

  // ── creer ──────────────────────────────────────────────────────────────

  describe('creer', () => {
    const dto = {
      etudiant_id:      ETUDIANT_ID,
      type_document_id: TYPE_ID,
      date_emission:    '2026-06-12',
      filiere:          'Licence Informatique',
    };

    it('crée un brouillon et logue l\'audit', async () => {
      prisma.utilisateurs.findFirst.mockResolvedValue(makeActeur());
      prisma.etudiants.findFirst.mockResolvedValue({ universite_id: UNIV_ID });
      prisma.types_document.findFirst.mockResolvedValue({ id: TYPE_ID });
      prisma.documents.findFirst.mockResolvedValue(null); // no existing for numero_unique
      prisma.documents.create.mockResolvedValue(makeDocument());

      const result = await service.creer(dto, ACTEUR_ID);

      expect(prisma.documents.create).toHaveBeenCalled();
      expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'DOCUMENT_CREER' }));
      expect(result.statut).toBe('brouillon');
    });

    it('lève ForbiddenException si l\'acteur est d\'une autre université', async () => {
      prisma.utilisateurs.findFirst.mockResolvedValue(makeActeur('autre-univ-id'));
      prisma.etudiants.findFirst.mockResolvedValue({ universite_id: UNIV_ID });

      await expect(service.creer(dto, ACTEUR_ID)).rejects.toThrow(ForbiddenException);
    });

    it('lève NotFoundException si l\'étudiant n\'existe pas', async () => {
      prisma.utilisateurs.findFirst.mockResolvedValue(makeActeur());
      prisma.etudiants.findFirst.mockResolvedValue(null);

      await expect(service.creer(dto, ACTEUR_ID)).rejects.toThrow(NotFoundException);
    });

    it('lève NotFoundException si le type de document est inactif', async () => {
      prisma.utilisateurs.findFirst.mockResolvedValue(makeActeur());
      prisma.etudiants.findFirst.mockResolvedValue({ universite_id: UNIV_ID });
      prisma.types_document.findFirst.mockResolvedValue(null);

      await expect(service.creer(dto, ACTEUR_ID)).rejects.toThrow(NotFoundException);
    });

    it('le super-admin (universite_id=null) peut créer dans n\'importe quelle université', async () => {
      prisma.utilisateurs.findFirst.mockResolvedValue(makeActeur(null));
      prisma.etudiants.findFirst.mockResolvedValue({ universite_id: UNIV_ID });
      prisma.types_document.findFirst.mockResolvedValue({ id: TYPE_ID });
      prisma.documents.findFirst.mockResolvedValue(null);
      prisma.documents.create.mockResolvedValue(makeDocument());

      await expect(service.creer(dto, ACTEUR_ID)).resolves.toBeDefined();
    });
  });

  // ── lister ─────────────────────────────────────────────────────────────

  describe('lister', () => {
    it('scope l\'acteur à son université', async () => {
      prisma.utilisateurs.findFirst.mockResolvedValue(makeActeur());
      prisma.documents.count.mockResolvedValue(1);
      prisma.documents.findMany.mockResolvedValue([makeDocument()]);

      await service.lister({}, ACTEUR_ID);

      const whereArg = (prisma.documents.count as jest.Mock).mock.calls[0][0].where;
      expect(whereArg.universite_id).toBe(UNIV_ID);
    });

    it('le super-admin peut filtrer par universite_id', async () => {
      prisma.utilisateurs.findFirst.mockResolvedValue(makeActeur(null));
      prisma.documents.count.mockResolvedValue(0);
      prisma.documents.findMany.mockResolvedValue([]);

      await service.lister({ universite_id: UNIV_ID }, ACTEUR_ID);

      const whereArg = (prisma.documents.count as jest.Mock).mock.calls[0][0].where;
      expect(whereArg.universite_id).toBe(UNIV_ID);
    });
  });

  // ── modifier ───────────────────────────────────────────────────────────

  describe('modifier', () => {
    it('lève BadRequestException si le document n\'est pas un brouillon', async () => {
      prisma.utilisateurs.findFirst.mockResolvedValue(makeActeur());
      prisma.documents.findFirst.mockResolvedValue(makeDocument({ statut: 'actif' }));

      await expect(service.modifier(DOC_ID, {}, ACTEUR_ID)).rejects.toThrow(BadRequestException);
    });

    it('met à jour un brouillon', async () => {
      prisma.utilisateurs.findFirst.mockResolvedValue(makeActeur());
      prisma.documents.findFirst.mockResolvedValue(makeDocument());
      prisma.documents.update.mockResolvedValue(makeDocument({ filiere: 'Master Info' }));

      const result = await service.modifier(DOC_ID, { filiere: 'Master Info' }, ACTEUR_ID);

      expect(prisma.documents.update).toHaveBeenCalled();
      expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'DOCUMENT_MODIFIER' }));
    });
  });

  // ── valider ────────────────────────────────────────────────────────────

  describe('valider', () => {
    const fakePdf = Buffer.from('%PDF-1.4 fake content');

    it('calcule le hash, passe le document en actif', async () => {
      prisma.utilisateurs.findFirst.mockResolvedValue(makeActeur());
      prisma.documents.findFirst
        .mockResolvedValueOnce(makeDocument({ statut: 'brouillon' }))
        .mockResolvedValueOnce(null); // pas de doublon
      prisma.documents.update.mockResolvedValue(makeDocument({ statut: 'actif', hash_sha256: 'a'.repeat(64) }));

      const result = await service.valider(DOC_ID, fakePdf, fakePdf.length, ACTEUR_ID);

      expect(hash.calculateHash).toHaveBeenCalledWith(fakePdf);
      expect(qr.generateQr).toHaveBeenCalled();
      expect(prisma.documents.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ statut: 'actif' }) }),
      );
      expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'DOCUMENT_VALIDER' }));
    });

    it('lève ConflictException si le hash existe déjà', async () => {
      prisma.utilisateurs.findFirst.mockResolvedValue(makeActeur());
      prisma.documents.findFirst
        .mockResolvedValueOnce(makeDocument({ statut: 'brouillon' }))
        .mockResolvedValueOnce(makeDocument({ id: 'autre-id' })); // doublon trouvé

      await expect(service.valider(DOC_ID, fakePdf, fakePdf.length, ACTEUR_ID)).rejects.toThrow(ConflictException);
    });

    it('lève BadRequestException si le statut n\'est pas brouillon ou en_validation', async () => {
      prisma.utilisateurs.findFirst.mockResolvedValue(makeActeur());
      prisma.documents.findFirst.mockResolvedValue(makeDocument({ statut: 'revoque' }));

      await expect(service.valider(DOC_ID, fakePdf, fakePdf.length, ACTEUR_ID)).rejects.toThrow(BadRequestException);
    });

    it('accepte un document en_validation', async () => {
      prisma.utilisateurs.findFirst.mockResolvedValue(makeActeur());
      prisma.documents.findFirst
        .mockResolvedValueOnce(makeDocument({ statut: 'en_validation' }))
        .mockResolvedValueOnce(null);
      prisma.documents.update.mockResolvedValue(makeDocument({ statut: 'actif' }));

      await expect(service.valider(DOC_ID, fakePdf, fakePdf.length, ACTEUR_ID)).resolves.toBeDefined();
    });
  });

  // ── revoquer ───────────────────────────────────────────────────────────

  describe('revoquer', () => {
    it('révoque un document actif', async () => {
      prisma.utilisateurs.findFirst.mockResolvedValue(makeActeur());
      prisma.documents.findFirst.mockResolvedValue(makeDocument({ statut: 'actif' }));
      prisma.documents.update.mockResolvedValue(makeDocument({ statut: 'revoque' }));

      const result = await service.revoquer(DOC_ID, { raison: 'Erreur sur le nom de l\'étudiant' }, ACTEUR_ID);

      expect(prisma.documents.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ statut: 'revoque' }) }),
      );
      expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'DOCUMENT_REVOQUER' }));
    });

    it('lève BadRequestException si le document n\'est pas actif', async () => {
      prisma.utilisateurs.findFirst.mockResolvedValue(makeActeur());
      prisma.documents.findFirst.mockResolvedValue(makeDocument({ statut: 'brouillon' }));

      await expect(
        service.revoquer(DOC_ID, { raison: 'Erreur sur le nom' }, ACTEUR_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('déclenche notifierRevocation en fire & forget', async () => {
      prisma.utilisateurs.findFirst.mockResolvedValue(makeActeur());
      prisma.documents.findFirst.mockResolvedValue(makeDocument({ statut: 'actif' }));
      prisma.documents.update.mockResolvedValue(makeDocument({ statut: 'revoque' }));

      await service.revoquer(DOC_ID, { raison: 'Erreur sur le nom de l\'étudiant' }, ACTEUR_ID);

      expect(notif.notifierRevocation).toHaveBeenCalledWith(DOC_ID);
    });
  });

  // ── supprimer ──────────────────────────────────────────────────────────

  describe('supprimer', () => {
    it('soft-delete un brouillon', async () => {
      prisma.utilisateurs.findFirst.mockResolvedValue(makeActeur());
      prisma.documents.findFirst.mockResolvedValue(makeDocument());
      prisma.documents.update.mockResolvedValue(makeDocument({ deleted_at: new Date() }));

      await service.supprimer(DOC_ID, ACTEUR_ID);

      expect(prisma.documents.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ deleted_at: expect.any(Date) }) }),
      );
      expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'DOCUMENT_SUPPRIMER' }));
    });

    it('lève BadRequestException si le document n\'est pas un brouillon', async () => {
      prisma.utilisateurs.findFirst.mockResolvedValue(makeActeur());
      prisma.documents.findFirst.mockResolvedValue(makeDocument({ statut: 'actif' }));

      await expect(service.supprimer(DOC_ID, ACTEUR_ID)).rejects.toThrow(BadRequestException);
    });

    it('lève ForbiddenException si l\'acteur est d\'une autre université', async () => {
      prisma.utilisateurs.findFirst.mockResolvedValue(makeActeur('autre-univ'));
      prisma.documents.findFirst.mockResolvedValue(makeDocument());

      await expect(service.supprimer(DOC_ID, ACTEUR_ID)).rejects.toThrow(ForbiddenException);
    });
  });
});
