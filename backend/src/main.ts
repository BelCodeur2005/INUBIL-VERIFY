import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

// BigInt natif n'est pas sérialisable en JSON (ethers.js v6 retourne des BigInt
// pour les numéros de bloc). On les convertit en string pour éviter le crash.
(BigInt.prototype as unknown as { toJSON: () => string }).toJSON = function () {
  return this.toString();
};

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // En-tetes HTTP de securite (cahier §9.1).
  // CSP assouplie pour laisser l'UI Swagger (/api/docs) charger ses scripts
  // et styles inline. Le backend ne sert que du JSON hormis cette page.
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: [`'self'`],
          scriptSrc: [`'self'`, `'unsafe-inline'`],
          styleSrc: [`'self'`, `'unsafe-inline'`, 'https:'],
          imgSrc: [`'self'`, 'data:', 'https:'],
          fontSrc: [`'self'`, 'https:', 'data:'],
        },
      },
    }),
  );

  // CORS : autorise le frontend declare + Swagger UI, en dev comme en prod (cahier §9.1)
  const nodeEnv = config.get<string>('NODE_ENV', 'development');
  const frontendUrl =
    config.get<string>('FRONTEND_URL') ?? 'http://localhost:5173';
  // Swagger UI est servi sur le meme host que l'API (/api/docs) : en local c'est
  // localhost:3000, en production l'URL publique Render elle-meme — sans ca, un fetch
  // "Try it out" depuis le navigateur envoie un header Origin egal au domaine de l'API,
  // rejete par le whitelist ci-dessous puisqu'il ne contenait que le cas local.
  const apiUrl =
    config.get<string>('RENDER_EXTERNAL_URL') ??
    config.get<string>('API_URL') ??
    'https://inubil-verify-api.onrender.com';
  const allowedOrigins = [
    frontendUrl,
    'http://localhost:3000', // Swagger UI (même hôte que l'API, en local)
    'http://127.0.0.1:3000',
    apiUrl, // Swagger UI (même hôte que l'API, en production)
  ];
  // Vite prend le port suivant (5174, 5175...) si 5173 est deja occupe sur la
  // machine du dev — tolere toute la plage usuelle en dev pour eviter de
  // devoir mettre a jour FRONTEND_URL a chaque fois. Reste strict en production.
  const portViteDev = /^http:\/\/localhost:517[0-9]$/;
  app.enableCors({
    origin: (origin, callback) => {
      // Requêtes sans Origin (curl, Postman, mobile) → autorisées
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      if (nodeEnv !== 'production' && portViteDev.test(origin))
        return callback(null, true);
      callback(new Error(`CORS: origine non autorisée — ${origin}`));
    },
    credentials: true,
  });

  // Validation globale des DTOs : rejette tout champ non declare,
  // transforme les payloads en instances typees.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Arret propre (fermeture des connexions - utile des #5 Prisma)
  app.enableShutdownHooks();

  // Documentation OpenAPI / Swagger, exposee sur /api/docs.
  const swaggerConfig = new DocumentBuilder()
    .setTitle('INUBIL Verify API')
    .setDescription(
      "API de la plateforme d'authentification de diplomes via blockchain.",
    )
    .setVersion('0.1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Jeton JWT obtenu via la connexion.',
      },
      'access-token',
    )
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = config.get<number>('APP_PORT', 3000);
  // '0.0.0.0' obligatoire pour etre joignable depuis l'hote via Docker
  await app.listen(port, '0.0.0.0');

  logger.log(`INUBIL Verify API demarree sur http://localhost:${port}`);
  logger.log(`Documentation Swagger : http://localhost:${port}/api/docs`);
}

void bootstrap();
