import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InfoResponseDto } from './common/dto/info-response.dto';
import { HealthResponseDto } from './common/dto/health-response.dto';

@Injectable()
export class AppService {
  constructor(private readonly config: ConfigService) {}

  /** Informations generales de l'API (racine). */
  getInfo(): InfoResponseDto {
    return {
      name: 'INUBIL Verify API',
      description: "Plateforme d'authentification de diplomes via blockchain",
      version: '0.1.0',
      environment: this.config.get<string>('NODE_ENV', 'development'),
    };
  }

  /** Sonde de sante (health check). */
  getHealth(): HealthResponseDto {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
    };
  }
}
