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
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthTokensDto } from './dto/auth-response.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SessionResponseDto } from './dto/session-response.dto';
import { ProfileResponseDto } from './dto/profile-response.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthenticatedUser } from './strategies/jwt.strategy';

@ApiTags('Authentification')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Connexion — retourne les jetons JWT' })
  @ApiOkResponse({ description: 'Connexion reussie.', type: AuthTokensDto })
  @ApiResponse({ status: 401, description: 'Identifiants invalides.' })
  @ApiResponse({ status: 403, description: 'Compte desactive.' })
  @ApiResponse({ status: 429, description: 'Compte temporairement bloque (trop de tentatives).' })
  login(
    @Body() dto: LoginDto,
    @Ip() ip: string,
    @Req() req: Request,
  ): Promise<AuthTokensDto> {
    return this.auth.login(dto, ip, req.headers['user-agent']);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Renouvelle l'access token via le refresh token" })
  @ApiOkResponse({ description: 'Nouveaux jetons.', type: AuthTokensDto })
  @ApiResponse({ status: 401, description: 'Refresh token invalide ou session expiree.' })
  refresh(
    @Body() dto: RefreshTokenDto,
    @Ip() ip: string,
    @Req() req: Request,
  ): Promise<AuthTokensDto> {
    return this.auth.refresh(dto.refresh_token, ip, req.headers['user-agent']);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deconnexion — revoque la session du refresh token' })
  @ApiResponse({ status: 204, description: 'Session revoquee.' })
  logout(@Body() dto: RefreshTokenDto): Promise<void> {
    return this.auth.logout(dto.refresh_token);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Demande de reinitialisation de mot de passe' })
  @ApiResponse({
    status: 200,
    description: 'Si le compte existe, un email de reinitialisation est envoye.',
  })
  forgotPassword(@Body() dto: ForgotPasswordDto): Promise<void> {
    return this.auth.forgotPassword(dto.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reinitialise le mot de passe via le token recu par email' })
  @ApiResponse({ status: 200, description: 'Mot de passe reinitialise.' })
  @ApiResponse({ status: 400, description: 'Token invalide ou expire.' })
  resetPassword(@Body() dto: ResetPasswordDto): Promise<void> {
    return this.auth.resetPassword(dto.token, dto.nouveau_mot_de_passe);
  }

  @Get('permissions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: "Permissions de l'utilisateur connecte (RBAC)" })
  @ApiOkResponse({
    description: "Liste des permissions de l'utilisateur.",
    type: String,
    isArray: true,
  })
  @ApiResponse({ status: 401, description: 'Non authentifie.' })
  getPermissions(@CurrentUser() user: AuthenticatedUser): Promise<string[]> {
    return this.auth.getPermissions(user.role_id);
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: "Sessions actives de l'utilisateur connecte" })
  @ApiOkResponse({ type: SessionResponseDto, isArray: true })
  @ApiResponse({ status: 401, description: 'Non authentifie.' })
  listerSessions(
    @CurrentUser('id') userId: string,
  ): Promise<SessionResponseDto[]> {
    return this.auth.listerSessions(userId);
  }

  @Delete('sessions/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Revoque une session (deconnexion a distance)' })
  @ApiResponse({ status: 204, description: 'Session revoquee.' })
  @ApiResponse({ status: 401, description: 'Non authentifie.' })
  @ApiResponse({ status: 404, description: 'Session introuvable.' })
  revoquerSession(
    @CurrentUser('id') userId: string,
    @Param('id') sessionId: string,
  ): Promise<void> {
    return this.auth.revoquerSession(userId, sessionId);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: "Profil complet de l'utilisateur connecte" })
  @ApiOkResponse({ type: ProfileResponseDto })
  @ApiResponse({ status: 401, description: 'Non authentifie.' })
  getMe(@CurrentUser('id') userId: string): Promise<ProfileResponseDto> {
    return this.auth.getProfile(userId);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Modifier son profil (nom, prenom, email)' })
  @ApiOkResponse({ type: ProfileResponseDto })
  @ApiResponse({ status: 401, description: 'Non authentifie.' })
  @ApiResponse({ status: 409, description: 'Email deja utilise.' })
  updateMe(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProfileDto,
  ): Promise<ProfileResponseDto> {
    return this.auth.updateProfile(userId, dto);
  }

  @Patch('password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Changer son mot de passe' })
  @ApiResponse({ status: 204, description: 'Mot de passe change.' })
  @ApiResponse({
    status: 400,
    description: 'Ancien mot de passe incorrect ou confirmation invalide.',
  })
  @ApiResponse({ status: 401, description: 'Non authentifie.' })
  changePassword(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangePasswordDto,
  ): Promise<void> {
    return this.auth.changePassword(userId, dto);
  }
}
