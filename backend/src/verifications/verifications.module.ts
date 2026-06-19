import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DocumentsModule } from '../documents/documents.module';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { VerificationsController } from './verifications.controller';
import { VerificationsService } from './verifications.service';
import { PublicVerifyController } from './public-verify.controller';
import { PublicVerifyService } from './public-verify.service';

@Module({
  imports: [AuthModule, DocumentsModule, BlockchainModule],
  controllers: [VerificationsController, PublicVerifyController],
  providers: [VerificationsService, PublicVerifyService],
})
export class VerificationsModule {}
