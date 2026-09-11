import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { ConfigurationsModule } from '../configurations/configurations.module';
import { StorageModule } from '../storage/storage.module';
import { PublicPartagesController } from './public-partages.controller';
import { PublicPartagesService } from './public-partages.service';

@Module({
  imports: [NotificationsModule, ConfigurationsModule, StorageModule],
  controllers: [PublicPartagesController],
  providers: [PublicPartagesService],
})
export class PartagesModule {}
