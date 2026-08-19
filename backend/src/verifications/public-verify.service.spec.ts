import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PublicVerifyService } from './public-verify.service';
import { PrismaService } from '../prisma/prisma.service';
import { HashService } from '../documents/hash.service';
import { RapportVerificationPdfService } from '../documents/rapport-verification-pdf.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { ConfigurationsService } from '../configurations/configurations.service';

const HASH_REEL  = 'a'.repeat(64);
const HASH_FAUX  = 'b'.repeat(64);
const VERIF_ID   = 'vid-0000-0000-0000-000000000001';
const DOC_ID     = 'doc-0000-0000-0000-000000000002';

const makeDoc = (statut = 'actif') => ({
  id: DOC_ID,
  numero_unique: 'INUB-2026-0001',
  url_verification: 'https://verify.inubil.com/d/INUB-2026-0001',
  filiere: 'Licence en Informatique',
  annee_academique: '2025-2026',
  date_emission: new Date('2026-06-12'),
  moyenne_generale: 13.5,
  statut,
  hash_sha256: HASH_REEL,
  deleted_at: null,
  etudiants:         { prenom: 'Bertrand', nom: 'KAMGA' },
  universites:       { nom: 'ISTAMA INUBIL' },
  types_document:    { nom: 'Licence', categorie: 'diplome', a_matieres: false },
  mentions_document: { nom: 'Assez Bien' },
  matieres_document: [
    { nom_matiere: 'Algorithmique', note: 14, note_max: 20, resultat: 'valide', semestre: 1 },
    { nom_matiere: 'Base de données', note: 13, note_max: 20, resultat: 'valide', semestre: 1 },
  ],
});

const makePrisma = () => ({
  documents:     { findFirst: jest.fn() },
  verifications: { create: jest.fn().mockResolvedValue({ id: VERIF_ID }) },
});

const makeHash = () => ({
  calculateHash: jest.fn().mockReturnValue(HASH_REEL),
});

const makeRapportPdf = () => ({
  generateRapport: jest.fn().mockResolvedValue(Buffer.from('%PDF-fake-rapport')),
});

const makeBlockchain = () => ({
  verifierDiplome: jest.fn().mockResolvedValue(null),
});

const makeConfig = () => ({
  get: jest.fn().mockImplementation((_key: string, defaut?: unknown) => defaut),
});

const makeConfigurations = () => ({
  get: jest.fn().mockImplementation((_cle: string, defaut?: string) => Promise.resolve(defaut)),
});

describe('PublicVerifyService', () => {
  let service: PublicVerifyService;
  let prisma: ReturnType<typeof makePrisma>;
  let hash: ReturnType<typeof makeHash>;
  let rapportPdf: ReturnType<typeof makeRapportPdf>;
  let blockchain: ReturnType<typeof makeBlockchain>;
  let configurations: ReturnType<typeof makeConfigurations>;

  beforeEach(async () => {
    prisma         = makePrisma();
    hash           = makeHash();
    rapportPdf     = makeRapportPdf();
    blockchain     = makeBlockchain();
    configurations = makeConfigurations();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublicVerifyService,
        { provide: PrismaService,                 useValue: prisma         },
        { provide: HashService,                   useValue: hash           },
        { provide: RapportVerificationPdfService, useValue: rapportPdf     },
        { provide: BlockchainService,             useValue: blockchain     },
        { provide: ConfigService,                 useValue: makeConfig()   },
        { provide: ConfigurationsService,         useValue: configurations },
      ],
    }).compile();

    service = module.get(PublicVerifyService);
  });

  // ── verifierParIdentifiant ─────────────────────────────────────────────

  describe('verifierParIdentifiant', () => {
    it('retourne "authentique" pour un document actif', async () => {
      prisma.documents.findFirst.mockResolvedValue(makeDoc('actif'));

      const res = await service.verifierParIdentifiant('INUB-2026-0001');

      expect(res.resultat).toBe('authentique');
      expect(res.document?.numero_unique).toBe('INUB-2026-0001');
      expect(res.document?.etudiant_nom).toBe('Bertrand KAMGA');
      expect(res.verification_id).toBe(VERIF_ID);
    });

    it('retourne "revoque" pour un document révoqué', async () => {
      prisma.documents.findFirst.mockResolvedValue(makeDoc('revoque'));

      const res = await service.verifierParIdentifiant('INUB-2026-0001');

      expect(res.resultat).toBe('revoque');
      expect(res.document).not.toBeNull();
    });

    it('retourne "non_trouve" si le document n\'existe pas', async () => {
      prisma.documents.findFirst.mockResolvedValue(null);

      const res = await service.verifierParIdentifiant('INUB-XXXX-9999');

      expect(res.resultat).toBe('non_trouve');
      expect(res.document).toBeNull();
    });

    it('retourne "non_trouve" pour un brouillon (non public)', async () => {
      prisma.documents.findFirst.mockResolvedValue(makeDoc('brouillon'));

      const res = await service.verifierParIdentifiant('INUB-2026-0001');

      expect(res.resultat).toBe('non_trouve');
    });

    it('logue dans la table verifications avec type "lien_unique"', async () => {
      prisma.documents.findFirst.mockResolvedValue(makeDoc());

      await service.verifierParIdentifiant('INUB-2026-0001', '1.2.3.4');

      expect(prisma.verifications.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type_verification: 'lien_unique',
            document_id: DOC_ID,
            ip_address: '1.2.3.4',
          }),
        }),
      );
    });
  });

  // ── verifierParHash ────────────────────────────────────────────────────

  describe('verifierParHash', () => {
    it('retourne "authentique" si le hash correspond à un doc actif', async () => {
      prisma.documents.findFirst.mockResolvedValue(makeDoc('actif'));

      const res = await service.verifierParHash(HASH_REEL);

      expect(res.resultat).toBe('authentique');
    });

    it('retourne "non_trouve" si le hash est inconnu', async () => {
      prisma.documents.findFirst.mockResolvedValue(null);

      const res = await service.verifierParHash(HASH_FAUX);

      expect(res.resultat).toBe('non_trouve');
      expect(res.document).toBeNull();
    });

    it('logue dans verifications avec type "hash" et hash_soumis', async () => {
      prisma.documents.findFirst.mockResolvedValue(makeDoc());

      await service.verifierParHash(HASH_REEL, '5.6.7.8');

      expect(prisma.verifications.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type_verification: 'hash',
            hash_soumis: HASH_REEL,
            ip_address: '5.6.7.8',
          }),
        }),
      );
    });
  });

  // ── verifierParUpload ──────────────────────────────────────────────────

  describe('verifierParUpload', () => {
    it('calcule le hash du PDF et retourne "authentique" si correspondance', async () => {
      prisma.documents.findFirst.mockResolvedValue(makeDoc('actif'));
      const fakePdf = Buffer.from('%PDF-1.4 fake');

      const res = await service.verifierParUpload(fakePdf);

      expect(hash.calculateHash).toHaveBeenCalledWith(fakePdf);
      expect(res.resultat).toBe('authentique');
    });

    it('retourne "non_trouve" si le PDF uploadé n\'est pas dans la base', async () => {
      hash.calculateHash.mockReturnValue(HASH_FAUX);
      prisma.documents.findFirst.mockResolvedValue(null);

      const res = await service.verifierParUpload(Buffer.from('fake pdf'));

      expect(res.resultat).toBe('non_trouve');
    });

    it('logue avec type "upload_pdf"', async () => {
      prisma.documents.findFirst.mockResolvedValue(makeDoc());

      await service.verifierParUpload(Buffer.from('%PDF'));

      expect(prisma.verifications.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type_verification: 'upload_pdf' }),
        }),
      );
    });

    it('rejette un fichier depassant pdf_max_taille_mo (configure)', async () => {
      configurations.get.mockResolvedValue('1'); // 1 Mo
      const gros = Buffer.alloc(2 * 1024 * 1024); // 2 Mo

      await expect(service.verifierParUpload(gros)).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.documents.findFirst).not.toHaveBeenCalled();
    });

    it('accepte un fichier sous la limite par defaut si le parametre n\'est pas configure', async () => {
      configurations.get.mockResolvedValue(undefined);
      prisma.documents.findFirst.mockResolvedValue(makeDoc());
      const petit = Buffer.from('%PDF-1.4 fake');

      await expect(service.verifierParUpload(petit)).resolves.toBeDefined();
    });
  });

  // ── réponse enrichie ───────────────────────────────────────────────────

  describe('structure de la réponse', () => {
    it('inclut verification_id, verifie_le, message et conseil_verification', async () => {
      prisma.documents.findFirst.mockResolvedValue(makeDoc());

      const res = await service.verifierParIdentifiant('INUB-2026-0001');

      expect(res.verification_id).toBe(VERIF_ID);
      expect(res.verifie_le).toBeInstanceOf(Date);
      expect(res.message).toBeTruthy();
      expect(res.conseil_verification).toContain('POST /verify/upload');
    });

    it('le document public ne contient pas de données sensibles internes', async () => {
      prisma.documents.findFirst.mockResolvedValue(makeDoc());

      const res = await service.verifierParIdentifiant('INUB-2026-0001');

      expect(res.document).not.toHaveProperty('hash_sha256');
      expect(res.document).not.toHaveProperty('etudiant_id');
      expect(res.document).not.toHaveProperty('saisi_par');
    });

    it('inclut mention et moyenne_generale pour la comparaison visuelle', async () => {
      prisma.documents.findFirst.mockResolvedValue(makeDoc());

      const res = await service.verifierParIdentifiant('INUB-2026-0001');

      expect(res.document?.mention).toBe('Assez Bien');
      expect(res.document?.moyenne_generale).toBe(13.5);
      expect(res.document?.annee_academique).toBe('2025-2026');
    });

    it('inclut la liste des matières pour comparer avec le relevé physique', async () => {
      prisma.documents.findFirst.mockResolvedValue(makeDoc());

      const res = await service.verifierParIdentifiant('INUB-2026-0001');

      expect(res.document?.matieres).toHaveLength(2);
      expect(res.document?.matieres[0].nom_matiere).toBe('Algorithmique');
      expect(res.document?.matieres[0].note).toBe(14);
    });

    it('indique verifiable_par_upload:true pour guider vers la preuve cryptographique', async () => {
      prisma.documents.findFirst.mockResolvedValue(makeDoc());

      const res = await service.verifierParIdentifiant('INUB-2026-0001');

      expect(res.document?.verifiable_par_upload).toBe(true);
    });

    it('conseil_verification est vide pour les résultats non-authentiques', async () => {
      prisma.documents.findFirst.mockResolvedValue(null);

      const res = await service.verifierParIdentifiant('INUB-XXXX-9999');

      expect(res.conseil_verification).toBe('');
    });
  });

  // ── genererRapport ─────────────────────────────────────────────────────

  describe('genererRapport', () => {
    it('retourne un buffer PDF et un nom de fichier', async () => {
      prisma.documents.findFirst.mockResolvedValue(makeDoc());

      const { buffer, filename } = await service.genererRapport('INUB-2026-0001', '1.2.3.4');

      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(filename).toMatch(/^rapport-verification-INUB-2026-0001-\d{4}-\d{2}-\d{2}\.pdf$/);
    });

    it('logue dans verifications avec rapport_genere:true', async () => {
      prisma.documents.findFirst.mockResolvedValue(makeDoc());

      await service.genererRapport('INUB-2026-0001');

      expect(prisma.verifications.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ rapport_genere: true }),
        }),
      );
    });

    it('fonctionne si le document est introuvable (non_trouve)', async () => {
      prisma.documents.findFirst.mockResolvedValue(null);

      const { buffer, filename } = await service.genererRapport('INUB-XXXX-9999');

      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(filename).toContain('INUB-XXXX-9999');
    });
  });
});
