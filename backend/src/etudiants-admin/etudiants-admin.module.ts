import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { InvitationsModule } from '../invitations/invitations.module';
import { EtudiantsAdminController } from './etudiants-admin.controller';
import { EtudiantsAdminService } from './etudiants-admin.service';

@Module({
  imports: [AuditModule, InvitationsModule],
  controllers: [EtudiantsAdminController],
  providers: [EtudiantsAdminService],
  exports: [EtudiantsAdminService],
})
export class EtudiantsAdminModule {}
