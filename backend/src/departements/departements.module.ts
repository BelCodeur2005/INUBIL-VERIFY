import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { DepartementsController } from './departements.controller';
import { DepartementsService } from './departements.service';

@Module({
  imports: [AuditModule],
  controllers: [DepartementsController],
  providers: [DepartementsService],
  exports: [DepartementsService],
})
export class DepartementsModule {}
