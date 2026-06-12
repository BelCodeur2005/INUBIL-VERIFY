import { Module } from '@nestjs/common';
import { PublicPartagesController } from './public-partages.controller';
import { PublicPartagesService } from './public-partages.service';

@Module({
  controllers: [PublicPartagesController],
  providers: [PublicPartagesService],
})
export class PartagesModule {}
