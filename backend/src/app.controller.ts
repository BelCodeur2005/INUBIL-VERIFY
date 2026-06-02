import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';
import { InfoResponseDto } from './common/dto/info-response.dto';
import { HealthResponseDto } from './common/dto/health-response.dto';

@ApiTags('Système')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: "Informations générales de l'API" })
  @ApiOkResponse({ description: "Métadonnées de l'API.", type: InfoResponseDto })
  getInfo(): InfoResponseDto {
    return this.appService.getInfo();
  }

  @Get('health')
  @ApiOperation({ summary: 'Sonde de santé (health check)' })
  @ApiOkResponse({ description: "État de l'API.", type: HealthResponseDto })
  getHealth(): HealthResponseDto {
    return this.appService.getHealth();
  }
}
