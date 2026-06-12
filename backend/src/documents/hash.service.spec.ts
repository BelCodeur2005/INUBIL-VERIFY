import { Test, TestingModule } from '@nestjs/testing';
import { HashService } from './hash.service';

describe('HashService', () => {
  let service: HashService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HashService],
    }).compile();
    service = module.get(HashService);
  });

  it('retourne un hash SHA-256 de 64 caractères hexadécimaux', () => {
    const hash = service.calculateHash(Buffer.from('test'));
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('produit la même valeur que Node crypto natif (régression)', () => {
    const { createHash } = require('crypto');
    const buf = Buffer.from('inubil-verify-regression-test');
    const attendu = createHash('sha256').update(buf).digest('hex');
    expect(service.calculateHash(buf)).toBe(attendu);
  });

  it('même buffer → même hash (déterminisme)', () => {
    const buf = Buffer.from('inubil-verify-diploma');
    expect(service.calculateHash(buf)).toBe(service.calculateHash(buf));
  });

  it('moindre modification du contenu → hash totalement différent', () => {
    const hashA = service.calculateHash(Buffer.from('diplome-v1'));
    const hashB = service.calculateHash(Buffer.from('diplome-v2'));
    expect(hashA).not.toBe(hashB);
  });

  it('buffer vide → hash SHA-256 valide (valeur connue)', () => {
    const hash = service.calculateHash(Buffer.alloc(0));
    expect(hash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });

  it('accepte de grands buffers sans erreur', () => {
    const bigBuf = Buffer.alloc(1024 * 1024, 'x'); // 1 Mo
    const hash = service.calculateHash(bigBuf);
    expect(hash).toHaveLength(64);
  });
});
