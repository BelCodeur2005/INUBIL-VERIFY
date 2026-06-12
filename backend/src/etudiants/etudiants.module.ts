import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EtudiantsController } from './etudiants.controller';
import { EtudiantsService } from './etudiants.service';

@Module({
  imports: [AuthModule],
  controllers: [EtudiantsController],
  providers: [EtudiantsService],
})
export class EtudiantsModule {}
