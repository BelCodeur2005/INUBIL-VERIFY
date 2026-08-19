import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PartenariatsController } from './partenariats.controller';
import { PartenariatsService } from './partenariats.service';

@Module({
  imports: [AuditModule],
  controllers: [PartenariatsController],
  providers: [PartenariatsService],
  exports: [PartenariatsService],
})
export class PartenariatsModule {}
