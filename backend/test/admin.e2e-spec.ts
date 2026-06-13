import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Tests e2e Admin — nécessitent une base de données avec le seed exécuté.
 * Lancer avec : npm run test:e2e
 * Pré-requis  : docker compose up -d postgres && npm run prisma:seed
 *
 * Ces tests utilisent le compte super-admin créé par le seed.
 * Credentials seed : à récupérer dans backend/prisma/seed.ts
 */
describe('Admin (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;

  // Credentials du super-admin injecté par le seed (à adapter si tu changes le seed)
  const SUPER_ADMIN_EMAIL    = 'admin@inubil.com';
  const SUPER_ADMIN_PASSWORD = 'Admin123!';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    // Connexion super-admin pour les tests suivants
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: SUPER_ADMIN_EMAIL, mot_de_passe: SUPER_ADMIN_PASSWORD });

    accessToken = res.body?.access_token ?? '';
  });

  afterAll(async () => {
    await app.close();
  });

  // ── GET /admin/statistiques ────────────────────────────────────────────────

  describe('GET /admin/statistiques', () => {
    it('retourne les KPIs globaux', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/statistiques')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('universites');
      expect(res.body).toHaveProperty('documents');
      expect(res.body).toHaveProperty('etudiants');
      expect(res.body).toHaveProperty('utilisateurs');
    });

    it('refuse sans token → 401', async () => {
      await request(app.getHttpServer()).get('/admin/statistiques').expect(401);
    });
  });

  // ── GET /admin/documents ───────────────────────────────────────────────────

  describe('GET /admin/documents', () => {
    it('retourne la liste paginée de tous les documents', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/documents')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('page');
      expect(res.body).toHaveProperty('limit');
      expect(res.body).toHaveProperty('items');
      expect(Array.isArray(res.body.items)).toBe(true);
    });

    it('filtre par statut=actif', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/documents?statut=actif')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      res.body.items.forEach((doc: any) => {
        expect(doc.statut).toBe('actif');
      });
    });

    it('filtre par statut=brouillon', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/documents?statut=brouillon')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      res.body.items.forEach((doc: any) => {
        expect(doc.statut).toBe('brouillon');
      });
    });

    it('refuse un statut invalide → 400', async () => {
      await request(app.getHttpServer())
        .get('/admin/documents?statut=invalide')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });

    it('pagination : page=1 limit=5', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/documents?page=1&limit=5')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(5);
      expect(res.body.items.length).toBeLessThanOrEqual(5);
    });

    it('refuse sans token → 401', async () => {
      await request(app.getHttpServer()).get('/admin/documents').expect(401);
    });
  });

  // ── GET /admin/audit ───────────────────────────────────────────────────────

  describe('GET /admin/audit', () => {
    it('retourne le journal d\'audit paginé', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/audit')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('items');
      expect(Array.isArray(res.body.items)).toBe(true);
    });

    it('refuse sans token → 401', async () => {
      await request(app.getHttpServer()).get('/admin/audit').expect(401);
    });
  });

  // ── GET /admin/utilisateurs ────────────────────────────────────────────────

  describe('GET /admin/utilisateurs', () => {
    it('retourne la liste des utilisateurs', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/utilisateurs')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(res.body) || res.body.items !== undefined).toBe(true);
    });

    it('refuse sans token → 401', async () => {
      await request(app.getHttpServer()).get('/admin/utilisateurs').expect(401);
    });
  });

  // ── GET /admin/etudiants ───────────────────────────────────────────────────

  describe('GET /admin/etudiants', () => {
    it('retourne la liste des étudiants avec total/page/limit', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/etudiants')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('recherche par nom', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/etudiants?search=KAMGA')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('data');
    });

    it('refuse sans token → 401', async () => {
      await request(app.getHttpServer()).get('/admin/etudiants').expect(401);
    });
  });
});
