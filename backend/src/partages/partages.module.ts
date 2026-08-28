import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { PublicPartagesController } from './public-partages.controller';
import { PublicPartagesService } from './public-partages.service';

@Module({
  imports: [NotificationsModule],
  controllers: [PublicPartagesController],
  providers: [PublicPartagesService],
})
export class PartagesModule {}
