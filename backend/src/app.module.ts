import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { envValidationSchema } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UniversitesModule } from './universites/universites.module';
import { RolesModule } from './roles/roles.module';
import { PermissionsModule } from './permissions/permissions.module';
import { UtilisateursModule } from './utilisateurs/utilisateurs.module';
import { InvitationsModule } from './invitations/invitations.module';
import { VerificationsModule } from './verifications/verifications.module';
import { DocumentsModule } from './documents/documents.module';
import { EtudiantsModule } from './etudiants/etudiants.module';
import { AdminModule } from './admin/admin.module';
import { PartagesModule } from './partages/partages.module';
import { TypesDocumentModule } from './types-document/types-document.module';
import { MentionsModule } from './mentions/mentions.module';
import { EtudiantsAdminModule } from './etudiants-admin/etudiants-admin.module';
import { BlockchainModule } from './blockchain/blockchain.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ConfigurationsModule } from './configurations/configurations.module';
import { ClesApiModule } from './cles-api/cles-api.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { PartenariatsModule } from './partenariats/partenariats.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
      validationSchema: envValidationSchema,
      validationOptions: { abortEarly: false, allowUnknown: true },
    }),
    // Rate limiting global : 100 requetes / minute par IP.
    // Les endpoints sensibles (register, forgot-password, renvoyer-verif)
    // appliquent leurs propres limites plus strictes via @Throttle().
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    PrismaModule,
    AuthModule,
    UniversitesModule,
    RolesModule,
    PermissionsModule,
    UtilisateursModule,
    InvitationsModule,
    VerificationsModule,
    DocumentsModule,
    EtudiantsModule,
    AdminModule,
    PartagesModule,
    TypesDocumentModule,
    MentionsModule,
    EtudiantsAdminModule,
    BlockchainModule,
    NotificationsModule,
    ConfigurationsModule,
    ClesApiModule,
    WebhooksModule,
    PartenariatsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
