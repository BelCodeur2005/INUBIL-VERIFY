import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Ip,
  Post,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import {
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { AuthTokensDto } from './dto/auth-response.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

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
}
