import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  constructor(private readonly config: ConfigService) {}

  /** Informations generales de l'API (racine). */
  getInfo() {
    return {
      name: 'INUBIL Verify API',
      description: "Plateforme d'authentification de diplomes via blockchain",
      version: '0.1.0',
      environment: this.config.get<string>('NODE_ENV'),
    };
  }

  /** Sonde de sante (health check). */
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
    };
  }
}
