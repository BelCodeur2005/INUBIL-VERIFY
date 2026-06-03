import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { Permission } from '../auth/constants/permissions.constant';
import { AssignerPermissionsDto } from './dto/assigner-permissions.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RoleResponseDto } from './dto/role-response.dto';
import { RolesService } from './roles.service';

@ApiTags('Rôles')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('roles')
export class RolesController {
  constructor(private readonly service: RolesService) {}

  @Get()
  @ApiOperation({ summary: 'Liste des rôles (filtre optionnel par universite_id)' })
  @ApiQuery({ name: 'universite_id', required: false, type: String })
  @ApiOkResponse({ type: [RoleResponseDto] })
  @ApiResponse({ status: 401, description: 'Non authentifié.' })
  lister(@Query('universite_id') universiteId?: string): Promise<RoleResponseDto[]> {
    return this.service.lister(universiteId);
  }

  @Get(':id')
  @ApiOperation({ summary: "Détail d'un rôle avec ses permissions" })
  @ApiOkResponse({ type: RoleResponseDto })
  @ApiResponse({ status: 401, description: 'Non authentifié.' })
  @ApiResponse({ status: 404, description: 'Rôle introuvable.' })
  findOne(@Param('id') id: string): Promise<RoleResponseDto> {
    return this.service.findOne(id);
  }

  @Post()
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.GERER_UNIVERSITES)
  @ApiOperation({ summary: 'Créer un rôle' })
  @ApiCreatedResponse({ type: RoleResponseDto })
  @ApiResponse({ status: 401, description: 'Non authentifié.' })
  @ApiResponse({ status: 403, description: 'Permission GERER_UNIVERSITES requise.' })
  @ApiResponse({ status: 409, description: 'Nom de rôle déjà utilisé pour cette université.' })
  creer(
    @Body() dto: CreateRoleDto,
    @CurrentUser('id') userId: string,
    @Ip() ip: string,
  ): Promise<RoleResponseDto> {
    return this.service.creer(dto, userId, ip);
  }

  @Patch(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.GERER_UNIVERSITES)
  @ApiOperation({ summary: 'Modifier un rôle (y compris les rôles système)' })
  @ApiOkResponse({ type: RoleResponseDto })
  @ApiResponse({ status: 401, description: 'Non authentifié.' })
  @ApiResponse({ status: 403, description: 'Permission GERER_UNIVERSITES requise.' })
  @ApiResponse({ status: 404, description: 'Rôle introuvable.' })
  @ApiResponse({ status: 409, description: 'Nom déjà utilisé.' })
  modifier(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ): Promise<RoleResponseDto> {
    return this.service.modifier(id, dto, userId, req.ip);
  }

  @Delete(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.GERER_UNIVERSITES)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer un rôle (bloqué si système ou utilisé)' })
  @ApiNoContentResponse()
  @ApiResponse({ status: 401, description: 'Non authentifié.' })
  @ApiResponse({ status: 403, description: 'Permission GERER_UNIVERSITES requise ou rôle système.' })
  @ApiResponse({ status: 404, description: 'Rôle introuvable.' })
  @ApiResponse({ status: 409, description: 'Rôle assigné à des utilisateurs.' })
  supprimer(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ): Promise<void> {
    return this.service.supprimer(id, userId, req.ip);
  }

  @Put(':id/permissions')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.GERER_UNIVERSITES)
  @ApiOperation({
    summary: 'Remplacer toutes les permissions d\'un rôle (opération atomique)',
  })
  @ApiOkResponse({ type: RoleResponseDto })
  @ApiResponse({ status: 400, description: 'Permission(s) inconnue(s).' })
  @ApiResponse({ status: 401, description: 'Non authentifié.' })
  @ApiResponse({ status: 403, description: 'Permission GERER_UNIVERSITES requise.' })
  @ApiResponse({ status: 404, description: 'Rôle introuvable.' })
  assignerPermissions(
    @Param('id') id: string,
    @Body() dto: AssignerPermissionsDto,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ): Promise<RoleResponseDto> {
    return this.service.assignerPermissions(id, dto, userId, req.ip);
  }
}
