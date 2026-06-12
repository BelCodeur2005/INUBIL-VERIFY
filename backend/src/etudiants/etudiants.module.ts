import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MailModule } from '../mail/mail.module';
import { EtudiantsController } from './etudiants.controller';
import { EtudiantsService } from './etudiants.service';

@Module({
  imports: [AuthModule, MailModule],
  controllers: [EtudiantsController],
  providers: [EtudiantsService],
})
export class EtudiantsModule {}
