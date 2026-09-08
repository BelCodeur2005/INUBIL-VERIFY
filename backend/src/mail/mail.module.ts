import { Module } from '@nestjs/common';
import { ConfigurationsModule } from '../configurations/configurations.module';
import { MailService } from './mail.service';

@Module({
  imports: [ConfigurationsModule],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
