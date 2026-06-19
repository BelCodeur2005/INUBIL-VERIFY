import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

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

  // CORS : autorise uniquement le frontend declare (cahier §9.1)
  app.enableCors({
    origin: config.get<string>('FRONTEND_URL'),
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
