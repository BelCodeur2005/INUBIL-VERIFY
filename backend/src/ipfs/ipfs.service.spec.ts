import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { IpfsService } from './ipfs.service';

const FAKE_CID = 'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco';
const FAKE_GATEWAY = 'https://gateway.pinata.cloud';
const BUFFER = Buffer.from('fake-pdf-content');

const makeConfig = (overrides: Record<string, string> = {}) => ({
  get: jest.fn((key: string, def = '') =>
    ({ PINATA_API_KEY: 'key123', PINATA_SECRET_KEY: 'secret456', PINATA_GATEWAY: FAKE_GATEWAY, ...overrides }[key] ?? def),
  ),
});

const mockFetchOk = () =>
  jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ IpfsHash: FAKE_CID }),
  } as unknown as Response);

const mockFetchFail = (msg = 'Network error') =>
  jest.fn().mockRejectedValue(new Error(msg));

const mockFetchHttpError = (status = 500, body = 'Internal error') =>
  jest.fn().mockResolvedValue({
    ok: false,
    status,
    text: () => Promise.resolve(body),
  } as unknown as Response);

describe('IpfsService', () => {
  let service: IpfsService;

  const buildService = async (configOverrides: Record<string, string> = {}) => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IpfsService,
        { provide: ConfigService, useValue: makeConfig(configOverrides) },
      ],
    }).compile();
    return module.get(IpfsService);
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ── Configuration ─────────────────────────────────────────────────────────

  it('est configuré quand API key et secret sont présents', async () => {
    service = await buildService();
    expect(service.configured).toBe(true);
  });

  it('n\'est pas configuré si PINATA_API_KEY est vide', async () => {
    service = await buildService({ PINATA_API_KEY: '' });
    expect(service.configured).toBe(false);
  });

  it('retourne null sans appel réseau quand non configuré', async () => {
    service = await buildService({ PINATA_API_KEY: '' });
    const fetchSpy = jest.spyOn(global, 'fetch');

    const result = await service.uploadFile(BUFFER, 'test.pdf', 'application/pdf');

    expect(result).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  // ── Upload réussi ─────────────────────────────────────────────────────────

  it('retourne cid et url après upload réussi', async () => {
    service = await buildService();
    jest.spyOn(global, 'fetch').mockImplementation(mockFetchOk());

    const result = await service.uploadFile(BUFFER, 'diplome.pdf', 'application/pdf');

    expect(result).toEqual({
      cid: FAKE_CID,
      url: `${FAKE_GATEWAY}/ipfs/${FAKE_CID}`,
    });
  });

  it('envoie les bons headers Pinata', async () => {
    service = await buildService();
    const fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(mockFetchOk());

    await service.uploadFile(BUFFER, 'diplome.pdf', 'application/pdf');

    const [, options] = fetchSpy.mock.calls[0];
    expect((options as RequestInit).headers).toMatchObject({
      pinata_api_key: 'key123',
      pinata_secret_api_key: 'secret456',
    });
  });

  it('utilise POST sur l\'endpoint Pinata', async () => {
    service = await buildService();
    const fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(mockFetchOk());

    await service.uploadFile(BUFFER, 'diplome.pdf', 'application/pdf');

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.pinata.cloud/pinning/pinFileToIPFS',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  // ── Erreurs HTTP ──────────────────────────────────────────────────────────

  it('lève une erreur si Pinata répond avec un statut non-ok', async () => {
    service = await buildService();
    jest.spyOn(global, 'fetch').mockImplementation(mockFetchHttpError(401, 'Unauthorized'));

    await expect(service.uploadFile(BUFFER, 'test.pdf', 'application/pdf')).rejects.toThrow(
      'Pinata 401',
    );
  });

  // ── Retry ─────────────────────────────────────────────────────────────────

  it('réussit au 2ème essai si le 1er échoue', async () => {
    service = await buildService();
    jest
      .spyOn(global, 'fetch')
      .mockImplementationOnce(mockFetchFail('Timeout'))
      .mockImplementationOnce(mockFetchOk());

    const result = await service.uploadFile(BUFFER, 'test.pdf', 'application/pdf');

    expect(result?.cid).toBe(FAKE_CID);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  }, 10_000);

  it('réussit au 3ème essai si les 2 premiers échouent', async () => {
    service = await buildService();
    jest
      .spyOn(global, 'fetch')
      .mockImplementationOnce(mockFetchFail('Timeout'))
      .mockImplementationOnce(mockFetchFail('Timeout'))
      .mockImplementationOnce(mockFetchOk());

    const result = await service.uploadFile(BUFFER, 'test.pdf', 'application/pdf');

    expect(result?.cid).toBe(FAKE_CID);
    expect(global.fetch).toHaveBeenCalledTimes(3);
  }, 15_000);

  it('lève une erreur après 3 tentatives toutes échouées', async () => {
    service = await buildService();
    jest.spyOn(global, 'fetch').mockImplementation(mockFetchFail('Network down'));

    await expect(
      service.uploadFile(BUFFER, 'test.pdf', 'application/pdf'),
    ).rejects.toThrow('Network down');

    expect(global.fetch).toHaveBeenCalledTimes(3);
  }, 20_000);
});
