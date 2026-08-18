import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MailModule } from '../mail/mail.module';
import { AuditModule } from '../audit/audit.module';
import { ConfigurationsModule } from '../configurations/configurations.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';

/**
 * Module d'authentification.
 * Les secrets/durees JWT sont passes explicitement a chaque signature
 * (cf. AuthService), donc JwtModule.register reste vide.
 * PrismaService est fourni globalement par PrismaModule (@Global).
 */
@Module({
  imports: [PassportModule, JwtModule.register({}), MailModule, AuditModule, ConfigurationsModule],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
