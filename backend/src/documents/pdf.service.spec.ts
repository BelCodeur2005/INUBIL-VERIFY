import { Test, TestingModule } from '@nestjs/testing';
import { DiplomaPdfData, PdfService } from './pdf.service';
import { QrCodeService } from './qr-code.service';

// Header PDF : toujours "%PDF-"
const PDF_MAGIC = Buffer.from('%PDF-');

const makeData = (overrides: Partial<DiplomaPdfData> = {}): DiplomaPdfData => ({
  nom: 'KAMGA',
  prenom: 'Bertrand',
  filiere: 'Licence en Informatique',
  mention: 'Bien',
  date_emission: new Date('2026-06-12'),
  annee_academique: '2025-2026',
  numero_unique: 'INUB-2026-0042',
  universite_nom: 'ISTAMA INUBIL',
  ...overrides,
});

describe('PdfService', () => {
  let service: PdfService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PdfService],
    }).compile();
    service = module.get(PdfService);
  });

  it('retourne un Buffer non vide', async () => {
    const buf = await service.generateDiplomaPdf(makeData());
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(0);
  });

  it('retourne un fichier PDF valide (magic bytes %PDF-)', async () => {
    const buf = await service.generateDiplomaPdf(makeData());
    expect(buf.subarray(0, 5)).toEqual(PDF_MAGIC);
  });

  it('génère un PDF de taille raisonnable (> 1 ko)', async () => {
    const buf = await service.generateDiplomaPdf(makeData());
    expect(buf.length).toBeGreaterThan(1024);
  });

  it('fonctionne sans mention (champ optionnel)', async () => {
    const buf = await service.generateDiplomaPdf(makeData({ mention: undefined }));
    expect(buf.subarray(0, 5)).toEqual(PDF_MAGIC);
  });

  it('fonctionne sans annee_academique (champ optionnel)', async () => {
    const buf = await service.generateDiplomaPdf(makeData({ annee_academique: undefined }));
    expect(buf.subarray(0, 5)).toEqual(PDF_MAGIC);
  });

  it('embarque le QR code quand fourni', async () => {
    // Génère un vrai QR PNG via QrCodeService pour éviter tout buffer corrompu
    const qrService = new QrCodeService();
    const qrBuffer = await qrService.generateQr('https://verify.inubil.com/d/TEST-001');
    const buf = await service.generateDiplomaPdf(makeData({ qr_code_buffer: qrBuffer }));
    expect(buf.subarray(0, 5)).toEqual(PDF_MAGIC);
  });

  it('deux diplômes différents → PDFs différents', async () => {
    const buf1 = await service.generateDiplomaPdf(makeData({ nom: 'ALPHA' }));
    const buf2 = await service.generateDiplomaPdf(makeData({ nom: 'BETA' }));
    expect(buf1.equals(buf2)).toBe(false);
  });
});
