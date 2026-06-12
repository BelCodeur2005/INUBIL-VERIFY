import { Test, TestingModule } from '@nestjs/testing';
import { PublicVerifyService } from './public-verify.service';
import { PrismaService } from '../prisma/prisma.service';
import { HashService } from '../documents/hash.service';

const HASH_REEL  = 'a'.repeat(64);
const HASH_FAUX  = 'b'.repeat(64);
const VERIF_ID   = 'vid-0000-0000-0000-000000000001';
const DOC_ID     = 'doc-0000-0000-0000-000000000002';

const makeDoc = (statut = 'actif') => ({
  id: DOC_ID,
  numero_unique: 'INUB-2026-0001',
  url_verification: 'https://verify.inubil.com/d/INUB-2026-0001',
  filiere: 'Licence en Informatique',
  date_emission: new Date('2026-06-12'),
  statut,
  hash_sha256: HASH_REEL,
  deleted_at: null,
  etudiants:     { prenom: 'Bertrand', nom: 'KAMGA' },
  universites:   { nom: 'ISTAMA INUBIL' },
  types_document: { nom: 'Licence', categorie: 'diplome' },
});

const makePrisma = () => ({
  documents:     { findFirst: jest.fn() },
  verifications: { create: jest.fn().mockResolvedValue({ id: VERIF_ID }) },
});

const makeHash = () => ({
  calculateHash: jest.fn().mockReturnValue(HASH_REEL),
});

describe('PublicVerifyService', () => {
  let service: PublicVerifyService;
  let prisma: ReturnType<typeof makePrisma>;
  let hash: ReturnType<typeof makeHash>;

  beforeEach(async () => {
    prisma = makePrisma();
    hash   = makeHash();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublicVerifyService,
        { provide: PrismaService, useValue: prisma },
        { provide: HashService,   useValue: hash  },
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
  });

  // ── réponse enrichie ───────────────────────────────────────────────────

  describe('structure de la réponse', () => {
    it('inclut verification_id, verifie_le et message', async () => {
      prisma.documents.findFirst.mockResolvedValue(makeDoc());

      const res = await service.verifierParIdentifiant('INUB-2026-0001');

      expect(res.verification_id).toBe(VERIF_ID);
      expect(res.verifie_le).toBeInstanceOf(Date);
      expect(res.message).toBeTruthy();
    });

    it('le document public ne contient pas de données sensibles internes', async () => {
      prisma.documents.findFirst.mockResolvedValue(makeDoc());

      const res = await service.verifierParIdentifiant('INUB-2026-0001');

      expect(res.document).not.toHaveProperty('hash_sha256');
      expect(res.document).not.toHaveProperty('etudiant_id');
      expect(res.document).not.toHaveProperty('saisi_par');
    });
  });
});
