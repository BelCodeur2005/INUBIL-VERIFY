import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { EtudiantsService } from './etudiants.service';
import { DocumentsEtudiantQueryDto } from './dto/document-etudiant-response.dto';
import { CreerPartageDto } from './dto/creer-partage.dto';

@Controller('etudiants/moi')
@UseGuards(JwtAuthGuard)
export class EtudiantsController {
  constructor(private readonly service: EtudiantsService) {}

  /** GET /etudiants/moi — profil de l'étudiant connecté */
  @Get()
  profil(@CurrentUser() user: AuthenticatedUser) {
    return this.service.profil(user.id);
  }

  /** GET /etudiants/moi/documents — liste ses diplômes et relevés */
  @Get('documents')
  listerDocuments(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: DocumentsEtudiantQueryDto,
  ) {
    return this.service.listerDocuments(user.id, query);
  }

  /** GET /etudiants/moi/statistiques — compteurs consultations */
  @Get('statistiques')
  statistiques(@CurrentUser() user: AuthenticatedUser) {
    return this.service.statistiques(user.id);
  }

  /** GET /etudiants/moi/partages — partages actifs */
  @Get('partages')
  listerPartages(@CurrentUser() user: AuthenticatedUser) {
    return this.service.listerPartages(user.id);
  }

  /** POST /etudiants/moi/partages — créer un lien de partage */
  @Post('partages')
  creerPartage(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreerPartageDto,
  ) {
    return this.service.creerPartage(user.id, dto);
  }

  /** DELETE /etudiants/moi/partages/:id — révoquer un partage */
  @Delete('partages/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  revoquerPartage(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.revoquerPartage(id, user.id);
  }
}
