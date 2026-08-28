import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, GoneException } from '@nestjs/common';
import { PublicPartagesService } from './public-partages.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

const TOKEN    = 'a'.repeat(64);
const PARTAGE_ID = 'par-0000-0000-0000-000000000001';
const DOC_ID     = 'doc-0000-0000-0000-000000000002';

const makeDoc = (overrides = {}) => ({
  id:               DOC_ID,
  numero_unique:    'INUB-2026-0001',
  filiere:          'Licence en Informatique',
  annee_academique: '2025-2026',
  date_emission:    new Date('2026-06-01'),
  statut:           'actif',
  moyenne_generale: 13.5,
  url_verification: 'https://verify.inubil.com/d/INUB-2026-0001',
  etudiants:         { prenom: 'Bertrand', nom: 'KAMGA' },
  universites:       { nom: 'ISTAMA INUBIL' },
  types_document:    { nom: 'Licence', categorie: 'diplome' },
  mentions_document: { nom: 'Assez Bien' },
  matieres_document: [
    { nom_matiere: 'Algorithmique', note: 14, note_max: 20, resultat: 'valide', semestre: 1 },
  ],
  ...overrides,
});

const makePartage = (overrides = {}) => ({
  id:                   PARTAGE_ID,
  token_acces:          TOKEN,
  statut:               'actif',
  date_expiration:      null,
  nb_consultations:     2,
  derniere_consultation: null,
  documents:            makeDoc(),
  ...overrides,
});

const makePrisma = () => ({
  partages_document: {
    findFirst: jest.fn(),
    update:    jest.fn().mockResolvedValue({}),
  },
});

const makeNotificationsInApp = () => ({
  creer: jest.fn().mockResolvedValue(undefined),
});

describe('PublicPartagesService', () => {
  let service: PublicPartagesService;
  let prisma: ReturnType<typeof makePrisma>;
  let notificationsInApp: ReturnType<typeof makeNotificationsInApp>;

  beforeEach(async () => {
    prisma = makePrisma();
    notificationsInApp = makeNotificationsInApp();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublicPartagesService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notificationsInApp },
      ],
    }).compile();
    service = module.get(PublicPartagesService);
  });

  // ── accès valide ──────────────────────────────────────────────────────────

  it('retourne le document pour un token valide et actif', async () => {
    prisma.partages_document.findFirst.mockResolvedValue(makePartage());

    const result = await service.accederParToken(TOKEN);

    expect(result.document.numero_unique).toBe('INUB-2026-0001');
    expect(result.document.etudiant_nom).toBe('Bertrand KAMGA');
    expect(result.document.mention).toBe('Assez Bien');
    expect(result.document.matieres).toHaveLength(1);
  });

  it('incrémente nb_consultations après accès', async () => {
    prisma.partages_document.findFirst.mockResolvedValue(makePartage());

    const result = await service.accederParToken(TOKEN);

    expect(prisma.partages_document.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: PARTAGE_ID },
        data: expect.objectContaining({
          nb_consultations: { increment: 1 },
          derniere_consultation: expect.any(Date),
        }),
      }),
    );
    expect(result.partage.nb_consultations).toBe(3); // 2 + 1
  });

  it('notifie l\'etudiant in-app quand son compte est lie', async () => {
    prisma.partages_document.findFirst.mockResolvedValue(
      makePartage({ documents: makeDoc({ etudiants: { prenom: 'Bertrand', nom: 'KAMGA', utilisateur_id: 'usr-0000-0000-0000-000000000009' } }) }),
    );

    await service.accederParToken(TOKEN);

    expect(notificationsInApp.creer).toHaveBeenCalledWith(
      expect.objectContaining({
        utilisateurId: 'usr-0000-0000-0000-000000000009',
        type: 'partage_consulte',
      }),
    );
  });

  it('ne notifie personne si le document n\'a pas de compte etudiant lie', async () => {
    prisma.partages_document.findFirst.mockResolvedValue(makePartage());

    await service.accederParToken(TOKEN);

    expect(notificationsInApp.creer).not.toHaveBeenCalled();
  });

  it('retourne la date d\'expiration dans le partage', async () => {
    const expiration = new Date('2027-01-01');
    prisma.partages_document.findFirst.mockResolvedValue(
      makePartage({ date_expiration: expiration }),
    );

    const result = await service.accederParToken(TOKEN);

    expect(result.partage.date_expiration).toEqual(expiration);
  });

  // ── token invalide / révoqué ───────────────────────────────────────────────

  it('lève NotFoundException si le token est introuvable', async () => {
    prisma.partages_document.findFirst.mockResolvedValue(null);

    await expect(service.accederParToken(TOKEN)).rejects.toThrow(NotFoundException);
  });

  it('lève NotFoundException si le partage est révoqué (sécurité : pas de révélation d\'état)', async () => {
    prisma.partages_document.findFirst.mockResolvedValue(makePartage({ statut: 'revoque' }));

    await expect(service.accederParToken(TOKEN)).rejects.toThrow(NotFoundException);
  });

  // ── expiration ────────────────────────────────────────────────────────────

  it('lève GoneException si le partage a expiré (date dépassée, statut actif)', async () => {
    const datePassee = new Date('2020-01-01');
    prisma.partages_document.findFirst.mockResolvedValue(
      makePartage({ date_expiration: datePassee, statut: 'actif' }),
    );

    await expect(service.accederParToken(TOKEN)).rejects.toThrow(GoneException);
  });

  it('auto-expire le partage quand la date est dépassée', async () => {
    const datePassee = new Date('2020-01-01');
    prisma.partages_document.findFirst.mockResolvedValue(
      makePartage({ date_expiration: datePassee, statut: 'actif' }),
    );

    try { await service.accederParToken(TOKEN); } catch {}

    expect(prisma.partages_document.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { statut: 'expire' } }),
    );
  });

  it('lève GoneException si statut est déjà "expire"', async () => {
    prisma.partages_document.findFirst.mockResolvedValue(
      makePartage({ statut: 'expire', date_expiration: null }),
    );

    await expect(service.accederParToken(TOKEN)).rejects.toThrow(GoneException);
  });

  it('accepte un partage sans expiration (illimité)', async () => {
    prisma.partages_document.findFirst.mockResolvedValue(
      makePartage({ date_expiration: null }),
    );

    await expect(service.accederParToken(TOKEN)).resolves.toBeDefined();
  });

  it('accepte un partage dont la date d\'expiration est dans le futur', async () => {
    const futur = new Date();
    futur.setFullYear(futur.getFullYear() + 1);
    prisma.partages_document.findFirst.mockResolvedValue(
      makePartage({ date_expiration: futur }),
    );

    await expect(service.accederParToken(TOKEN)).resolves.toBeDefined();
  });

  // ── matieres ─────────────────────────────────────────────────────────────

  it('retourne les matières du document (relevé de notes)', async () => {
    prisma.partages_document.findFirst.mockResolvedValue(makePartage());

    const result = await service.accederParToken(TOKEN);

    expect(result.document.matieres[0].nom_matiere).toBe('Algorithmique');
    expect(result.document.matieres[0].note).toBe(14);
  });
});
