import { Body, Controller, Get, HttpCode, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser, UsuarioAutenticado } from '../common/decorators/current-user.decorator';
import { AuthService } from './auth.service';
import { LoginDto, LoginRespuestaDto } from './dto/login.dto';

@ApiTags('Autenticación')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Iniciar sesión. Máximo 5 intentos por minuto por IP.' })
  @ApiOkResponse({ type: LoginRespuestaDto })
  @ApiUnauthorizedResponse({ description: 'Credenciales inválidas (mensaje genérico)' })
  @ApiTooManyRequestsResponse({ description: 'Demasiados intentos' })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @ApiBearerAuth()
  @Post('logout')
  @HttpCode(200)
  @ApiOperation({ summary: 'Cerrar sesión: revoca el token actual' })
  @ApiUnauthorizedResponse()
  logout(@Req() req: any) {
    return this.auth.logout(req.user.jti, req.user.exp);
  }

  @ApiBearerAuth()
  @Get('perfil')
  @ApiOperation({ summary: 'Ruta protegida de prueba: devuelve la identidad del token' })
  @ApiUnauthorizedResponse({ description: 'Token ausente, inválido, expirado o revocado' })
  perfil(@CurrentUser() user: UsuarioAutenticado) {
    return { id: user.id, correo: user.correo, rol: user.rol };
  }
}
