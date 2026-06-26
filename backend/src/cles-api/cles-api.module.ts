import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { ClesApiController } from './cles-api.controller';
import { ClesApiService } from './cles-api.service';

@Module({
  imports: [AuditModule],
  controllers: [ClesApiController],
  providers: [ClesApiService],
  exports: [ClesApiService],
})
export class ClesApiModule {}
