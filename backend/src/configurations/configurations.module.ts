import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { ConfigurationsController } from './configurations.controller';
import { ConfigurationsService } from './configurations.service';

@Module({
  imports: [AuditModule],
  controllers: [ConfigurationsController],
  providers: [ConfigurationsService],
  exports: [ConfigurationsService],
})
export class ConfigurationsModule {}
