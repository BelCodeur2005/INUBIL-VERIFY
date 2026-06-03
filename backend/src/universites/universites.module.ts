import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { UniversitesController } from './universites.controller';
import { UniversitesService } from './universites.service';

@Module({
  imports: [AuditModule],
  controllers: [UniversitesController],
  providers: [UniversitesService],
  exports: [UniversitesService],
})
export class UniversitesModule {}
