import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
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
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permission } from '../auth/constants/permissions.constant';
import { PartenariatsService } from './partenariats.service';
import { CreerPartenariatDto } from './dto/creer-partenariat.dto';
import { UpdatePartenariatDto } from './dto/update-partenariat.dto';
import { PartenariatResponseDto } from './dto/partenariat-response.dto';

@ApiTags('Partenariats')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('partenariats')
export class PartenariatsController {
  constructor(private readonly service: PartenariatsService) {}

  @Get()
  @RequirePermissions(Permission.PARTNER_READ)
  @ApiOperation({ summary: 'Lister les partenariats de mon université' })
  @ApiOkResponse({ type: [PartenariatResponseDto] })
  lister(
    @CurrentUser('id') acteurId: string,
  ): Promise<PartenariatResponseDto[]> {
    return this.service.lister(acteurId);
  }

  @Get(':id')
  @RequirePermissions(Permission.PARTNER_READ)
  @ApiOperation({ summary: "Détail d'un partenariat" })
  @ApiOkResponse({ type: PartenariatResponseDto })
  @ApiResponse({
    status: 403,
    description: "Partenariat d'une autre université.",
  })
  @ApiResponse({ status: 404, description: 'Partenariat introuvable.' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') acteurId: string,
  ): Promise<PartenariatResponseDto> {
    return this.service.findOne(id, acteurId);
  }

  @Post()
  @RequirePermissions(Permission.PARTNER_CREATE)
  @ApiOperation({ summary: 'Créer un partenariat inter-universités' })
  @ApiCreatedResponse({ type: PartenariatResponseDto })
  @ApiResponse({
    status: 404,
    description: 'Université partenaire introuvable.',
  })
  @ApiResponse({ status: 409, description: 'Ce partenariat existe déjà.' })
  creer(
    @Body() dto: CreerPartenariatDto,
    @CurrentUser('id') acteurId: string,
    @Req() req: Request,
  ): Promise<PartenariatResponseDto> {
    return this.service.creer(dto, acteurId, req.ip);
  }

  @Patch(':id')
  @RequirePermissions(Permission.PARTNER_EDIT)
  @ApiOperation({
    summary: 'Modifier un partenariat (dates, statut, description)',
  })
  @ApiOkResponse({ type: PartenariatResponseDto })
  @ApiResponse({ status: 403, description: 'Accès refusé.' })
  @ApiResponse({ status: 404, description: 'Partenariat introuvable.' })
  modifier(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePartenariatDto,
    @CurrentUser('id') acteurId: string,
    @Req() req: Request,
  ): Promise<PartenariatResponseDto> {
    return this.service.modifier(id, dto, acteurId, req.ip);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(Permission.PARTNER_DELETE)
  @ApiOperation({ summary: 'Supprimer un partenariat' })
  @ApiNoContentResponse()
  @ApiResponse({ status: 403, description: 'Accès refusé.' })
  @ApiResponse({ status: 404, description: 'Partenariat introuvable.' })
  supprimer(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') acteurId: string,
    @Req() req: Request,
  ): Promise<void> {
    return this.service.supprimer(id, acteurId, req.ip);
  }
}
