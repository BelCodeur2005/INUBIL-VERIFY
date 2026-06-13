import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { UtilisateursModule } from '../utilisateurs/utilisateurs.module';
import { DocumentsModule } from '../documents/documents.module';
import { AdminController } from './admin.controller';
import { AdminStatsService } from './admin-stats.service';
import { AdminAuditService } from './admin-audit.service';
import { AuditInterceptor } from './interceptors/audit.interceptor';

@Module({
  imports: [AuthModule, AuditModule, UtilisateursModule, DocumentsModule],
  controllers: [AdminController],
  providers: [AdminStatsService, AdminAuditService, AuditInterceptor],
})
export class AdminModule {}
