import { RapportVerificationPdfService, RapportVerificationData } from './rapport-verification-pdf.service';

const PDF_MAGIC = Buffer.from('%PDF-');

const makeData = (overrides: Partial<RapportVerificationData> = {}): RapportVerificationData => ({
  resultat:          'authentique',
  verification_id:   'vid-0000-0000-0000-000000000001',
  verifie_le:        new Date('2026-06-12T10:34:22Z'),
  type_verification: 'lien_unique',
  numero_unique:     'INUB-2026-0001',
  etudiant_nom:      'Bertrand KAMGA',
  filiere:           'Licence en Informatique',
  mention:           'Assez Bien',
  universite:        'ISTAMA INUBIL',
  date_emission:     new Date('2026-06-12'),
  hash_sha256:       'a'.repeat(64),
  ip_verifieur:      '1.2.3.4',
  ...overrides,
});

describe('RapportVerificationPdfService', () => {
  let service: RapportVerificationPdfService;

  beforeEach(() => {
    service = new RapportVerificationPdfService();
  });

  it('retourne un Buffer non vide', async () => {
    const buf = await service.generateRapport(makeData());
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(0);
  });

  it('génère un PDF valide (magic bytes %PDF-)', async () => {
    const buf = await service.generateRapport(makeData());
    expect(buf.subarray(0, 5)).toEqual(PDF_MAGIC);
  });

  it('génère un PDF de taille raisonnable (> 1 ko)', async () => {
    const buf = await service.generateRapport(makeData());
    expect(buf.length).toBeGreaterThan(1024);
  });

  it('fonctionne avec résultat "revoque"', async () => {
    const buf = await service.generateRapport(makeData({ resultat: 'revoque' }));
    expect(buf.subarray(0, 5)).toEqual(PDF_MAGIC);
  });

  it('fonctionne avec résultat "non_trouve" (sans infos document)', async () => {
    const buf = await service.generateRapport(makeData({
      resultat:      'non_trouve',
      numero_unique: undefined,
      etudiant_nom:  undefined,
      filiere:       undefined,
      hash_sha256:   undefined,
    }));
    expect(buf.subarray(0, 5)).toEqual(PDF_MAGIC);
  });

  it('fonctionne sans transaction_hash (blockchain stub)', async () => {
    const buf = await service.generateRapport(makeData({ transaction_hash: undefined }));
    expect(buf.subarray(0, 5)).toEqual(PDF_MAGIC);
  });

  it('deux rapports différents (dates différentes) → PDFs différents', async () => {
    const buf1 = await service.generateRapport(makeData({ verifie_le: new Date('2026-06-01') }));
    const buf2 = await service.generateRapport(makeData({ verifie_le: new Date('2026-06-12') }));
    expect(buf1.equals(buf2)).toBe(false);
  });
});
