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
import { Throttle } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthTokensDto } from './dto/auth-response.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { ProfileResponseDto } from './dto/profile-response.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SessionResponseDto } from './dto/session-response.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthenticatedUser } from './strategies/jwt.strategy';

@ApiTags('Authentification')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // ─── INSCRIPTION ────────────────────────────────────────────────────

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @ApiOperation({ summary: 'Inscription - cree un compte en attente de verification email' })
  @ApiCreatedResponse({ description: 'Compte cree. Email de verification envoye.' })
  @ApiResponse({ status: 409, description: 'Email deja utilise.' })
  @ApiResponse({ status: 429, description: 'Trop de tentatives, reessayez plus tard.' })
  register(@Body() dto: RegisterDto): Promise<{ message: string }> {
    return this.auth.register(dto);
  }

  // ─── VERIFICATION EMAIL ─────────────────────────────────────────────

  @Post('verifier-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Confirme un email via le token recu - active le compte ou applique un changement d\'email',
  })
  @ApiOkResponse({ description: 'Email verifie avec succes.' })
  @ApiResponse({ status: 400, description: 'Token invalide ou expire.' })
  verifierEmail(@Body() dto: VerifyEmailDto): Promise<{ message: string }> {
    return this.auth.verifierEmail(dto.token);
  }

  @Post('verifier-email/renvoyer')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { ttl: 600_000, limit: 3 } })
  @ApiOperation({ summary: 'Renvoie l\'email de verification (max 3 fois / 10 min par IP)' })
  @ApiResponse({ status: 204, description: 'Email renvoye si le compte existe et n\'est pas verifie.' })
  @ApiResponse({ status: 429, description: 'Trop de tentatives, reessayez plus tard.' })
  async renvoyerVerification(@Body() dto: ResendVerificationDto): Promise<void> {
    await this.auth.renvoyerVerification(dto.email);
  }

  // ─── CONNEXION ──────────────────────────────────────────────────────

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Connexion - retourne les jetons JWT' })
  @ApiOkResponse({ description: 'Connexion reussie.', type: AuthTokensDto })
  @ApiResponse({ status: 401, description: 'Identifiants invalides.' })
  @ApiResponse({ status: 403, description: 'Compte desactive ou email non verifie.' })
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
  @ApiOperation({ summary: 'Deconnexion - revoque la session du refresh token' })
  @ApiResponse({ status: 204, description: 'Session revoquee.' })
  logout(@Body() dto: RefreshTokenDto): Promise<void> {
    return this.auth.logout(dto.refresh_token);
  }

  // ─── MOT DE PASSE ───────────────────────────────────────────────────

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 600_000, limit: 5 } })
  @ApiOperation({ summary: 'Demande de reinitialisation de mot de passe' })
  @ApiResponse({
    status: 200,
    description: 'Si le compte existe, un email de reinitialisation est envoye.',
  })
  @ApiResponse({ status: 429, description: 'Trop de tentatives, reessayez plus tard.' })
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

  // ─── PROFIL ─────────────────────────────────────────────────────────

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
  @ApiOperation({
    summary:
      'Modifier son profil (nom, prenom). Un changement d\'email est mis en attente de verification.',
  })
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

  // ─── PERMISSIONS & SESSIONS ─────────────────────────────────────────

  @Get('permissions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: "Permissions de l'utilisateur connecte (RBAC)" })
  @ApiOkResponse({ description: "Liste des permissions.", type: String, isArray: true })
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
}
