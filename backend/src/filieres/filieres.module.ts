import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { FilieresController } from './filieres.controller';
import { FilieresService } from './filieres.service';

@Module({
  imports: [AuditModule],
  controllers: [FilieresController],
  providers: [FilieresService],
  exports: [FilieresService],
})
export class FilieresModule {}
