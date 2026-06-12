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
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { EtudiantsService } from './etudiants.service';
import { DocumentsEtudiantQueryDto } from './dto/document-etudiant-response.dto';
import { CreerPartageDto } from './dto/creer-partage.dto';

@ApiTags('Espace étudiant')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('etudiants/moi')
export class EtudiantsController {
  constructor(private readonly service: EtudiantsService) {}

  @Get()
  @ApiOperation({ summary: 'Profil de l\'étudiant connecté' })
  @ApiOkResponse({ description: 'Profil étudiant avec université.' })
  @ApiResponse({ status: 403, description: 'Aucun espace étudiant lié à ce compte.' })
  profil(@CurrentUser() user: AuthenticatedUser) {
    return this.service.profil(user.id);
  }

  @Get('documents')
  @ApiOperation({ summary: 'Diplômes et relevés de l\'étudiant (filtres + pagination)' })
  @ApiOkResponse({ description: 'Liste paginée de documents.' })
  @ApiResponse({ status: 403, description: 'Aucun espace étudiant lié à ce compte.' })
  listerDocuments(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: DocumentsEtudiantQueryDto,
  ) {
    return this.service.listerDocuments(user.id, query);
  }

  @Get('statistiques')
  @ApiOperation({ summary: 'Statistiques de l\'étudiant (consultations, partages, etc.)' })
  @ApiOkResponse({ description: 'Compteurs agrégés.' })
  @ApiResponse({ status: 403, description: 'Aucun espace étudiant lié à ce compte.' })
  statistiques(@CurrentUser() user: AuthenticatedUser) {
    return this.service.statistiques(user.id);
  }

  @Get('partages')
  @ApiOperation({ summary: 'Liens de partage actifs de l\'étudiant' })
  @ApiOkResponse({ description: 'Liste des partages actifs.' })
  @ApiResponse({ status: 403, description: 'Aucun espace étudiant lié à ce compte.' })
  listerPartages(@CurrentUser() user: AuthenticatedUser) {
    return this.service.listerPartages(user.id);
  }

  @Post('partages')
  @ApiOperation({
    summary: 'Créer un lien de partage pour un document',
    description:
      'Génère un token 64-chars hex (256 bits). ' +
      'Si email_destinataire est fourni, envoie le lien par email (fire & forget).',
  })
  @ApiCreatedResponse({ description: 'Lien de partage créé.' })
  @ApiResponse({ status: 403, description: 'Aucun espace étudiant lié à ce compte.' })
  @ApiResponse({ status: 404, description: 'Document introuvable ou non actif.' })
  creerPartage(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreerPartageDto,
  ) {
    return this.service.creerPartage(user.id, dto);
  }

  @Delete('partages/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Révoquer un lien de partage' })
  @ApiNoContentResponse({ description: 'Partage révoqué.' })
  @ApiResponse({ status: 403, description: 'Ce partage ne vous appartient pas.' })
  @ApiResponse({ status: 404, description: 'Partage introuvable.' })
  revoquerPartage(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.revoquerPartage(id, user.id);
  }
}
