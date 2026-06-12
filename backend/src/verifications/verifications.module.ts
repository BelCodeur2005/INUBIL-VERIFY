import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DocumentsModule } from '../documents/documents.module';
import { VerificationsController } from './verifications.controller';
import { VerificationsService } from './verifications.service';
import { PublicVerifyController } from './public-verify.controller';
import { PublicVerifyService } from './public-verify.service';

@Module({
  imports: [AuthModule, DocumentsModule],
  controllers: [VerificationsController, PublicVerifyController],
  providers: [VerificationsService, PublicVerifyService],
})
export class VerificationsModule {}
