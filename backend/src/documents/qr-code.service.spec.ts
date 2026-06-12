import { Test, TestingModule } from '@nestjs/testing';
import { QrCodeService } from './qr-code.service';

// Signature PNG : 8 octets magiques définis par la spec PNG
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe('QrCodeService', () => {
  let service: QrCodeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [QrCodeService],
    }).compile();
    service = module.get(QrCodeService);
  });

  it('retourne un Buffer non vide', async () => {
    const buf = await service.generateQr('https://verify.inubil.com/d/INUB-2026-001');
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(0);
  });

  it('retourne un fichier PNG valide (magic bytes)', async () => {
    const buf = await service.generateQr('https://verify.inubil.com/d/INUB-2026-001');
    expect(buf.subarray(0, 8)).toEqual(PNG_MAGIC);
  });

  it('accepte des URLs longues sans erreur', async () => {
    const longUrl = 'https://verify.inubil.com/d/' + 'A'.repeat(100);
    const buf = await service.generateQr(longUrl);
    expect(buf.subarray(0, 8)).toEqual(PNG_MAGIC);
  });

  it('deux URLs différentes → buffers différents', async () => {
    const buf1 = await service.generateQr('https://verify.inubil.com/d/AAA');
    const buf2 = await service.generateQr('https://verify.inubil.com/d/BBB');
    expect(buf1.equals(buf2)).toBe(false);
  });

  it('même URL → même buffer (déterminisme)', async () => {
    const url = 'https://verify.inubil.com/d/INUB-2026-123';
    const buf1 = await service.generateQr(url);
    const buf2 = await service.generateQr(url);
    expect(buf1.equals(buf2)).toBe(true);
  });
});
