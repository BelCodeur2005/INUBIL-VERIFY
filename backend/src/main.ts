import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // En-tetes HTTP de securite (cahier §9.1)
  app.use(helmet());

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

  // Arret propre (fermeture des connexions — utile des #5 Prisma)
  app.enableShutdownHooks();

  const port = config.get<number>('APP_PORT', 3000);
  // '0.0.0.0' obligatoire pour etre joignable depuis l'hote via Docker
  await app.listen(port, '0.0.0.0');

  logger.log(`INUBIL Verify API demarree sur http://localhost:${port}`);
}

void bootstrap();
