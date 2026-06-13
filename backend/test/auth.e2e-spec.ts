import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Tests e2e Auth — nécessitent une base de données Postgres active.
 * Lancer avec : npm run test:e2e
 * Pré-requis  : docker compose up -d postgres
 */
describe('Auth (e2e)', () => {
  let app: INestApplication;

  const emailTest = `e2e-test-${Date.now()}@inubil-test.cm`;
  const motDePasse = 'MotDePasse123!';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // ── Inscription ────────────────────────────────────────────────────────────

  describe('POST /auth/register', () => {
    it('refuse si email manquant', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ mot_de_passe: motDePasse, nom: 'Test', prenom: 'E2E' })
        .expect(400);
      expect(res.body.message).toBeDefined();
    });

    it('refuse si mot de passe trop court', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: emailTest, mot_de_passe: '123', nom: 'Test', prenom: 'E2E' })
        .expect(400);
    });
  });

  // ── Connexion ──────────────────────────────────────────────────────────────

  describe('POST /auth/login', () => {
    it('refuse si compte inexistant', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'inconnu@inubil.cm', mot_de_passe: 'nimportequoi' })
        .expect(401);
    });

    it('refuse si champs manquants', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: emailTest })
        .expect(400);
    });
  });

  // ── Endpoints protégés sans token ──────────────────────────────────────────

  describe('Endpoints protégés', () => {
    it('GET /auth/me → 401 sans token', async () => {
      await request(app.getHttpServer()).get('/auth/me').expect(401);
    });

    it('GET /documents → 401 sans token', async () => {
      await request(app.getHttpServer()).get('/documents').expect(401);
    });

    it('GET /admin/statistiques → 401 sans token', async () => {
      await request(app.getHttpServer()).get('/admin/statistiques').expect(401);
    });

    it('GET /admin/documents → 401 sans token', async () => {
      await request(app.getHttpServer()).get('/admin/documents').expect(401);
    });
  });

  // ── Endpoints publics accessibles sans token ───────────────────────────────

  describe('Endpoints publics', () => {
    it('GET / → 200 avec nom API', async () => {
      const res = await request(app.getHttpServer()).get('/').expect(200);
      expect(res.body.name).toBe('INUBIL Verify API');
    });

    it('GET /health → 200 status ok', async () => {
      const res = await request(app.getHttpServer()).get('/health').expect(200);
      expect(res.body.status).toBe('ok');
    });

    it('GET /verify/INCONNU → 404 diplôme introuvable', async () => {
      await request(app.getHttpServer()).get('/verify/INCONNU').expect(404);
    });

    it('GET /partages/token-inexistant → 404', async () => {
      await request(app.getHttpServer()).get('/partages/token-inexistant').expect(404);
    });
  });

  // ── Token invalide ─────────────────────────────────────────────────────────

  describe('Token invalide', () => {
    it('GET /auth/me avec token forgé → 401', async () => {
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer token.faux.invalide')
        .expect(401);
    });

    it('GET /admin/documents avec token forgé → 401', async () => {
      await request(app.getHttpServer())
        .get('/admin/documents')
        .set('Authorization', 'Bearer token.faux.invalide')
        .expect(401);
    });
  });

  // ── Forgot password ────────────────────────────────────────────────────────

  describe('POST /auth/forgot-password', () => {
    it('retourne 200 même si email inexistant (anti-énumération)', async () => {
      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'inexistant@inubil.cm' })
        .expect(200);
    });

    it('retourne 400 si email invalide', async () => {
      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'pas-un-email' })
        .expect(400);
    });
  });
});
