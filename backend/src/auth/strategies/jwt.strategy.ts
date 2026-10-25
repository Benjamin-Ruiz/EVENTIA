import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsuariosService } from '../../usuarios/usuarios.service';
import { TokenBlacklistService } from '../token-blacklist.service';
import { UsuarioAutenticado } from '../../common/decorators/current-user.decorator';

export interface JwtPayload {
  sub: number;
  correo: string;
  rol: string;
  jti: string;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly usuarios: UsuariosService,
    private readonly blacklist: TokenBlacklistService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
      algorithms: ['HS256'],
    });
  }

  /**
   * Además de la firma y la expiración, se comprueba que el token no haya sido revocado y que el
   * usuario siga activo. El rol se toma de la base de datos, no del token, para que un cambio de
   * rol tenga efecto inmediato.
   */
  async validate(payload: JwtPayload): Promise<UsuarioAutenticado & { jti: string; exp: number }> {
    if (!payload?.jti || this.blacklist.estaRevocado(payload.jti)) {
      throw new UnauthorizedException('La sesión fue cerrada');
    }
    const usuario = await this.usuarios.buscarPorId(payload.sub).catch(() => null);
    if (!usuario || !usuario.activo) throw new UnauthorizedException('Autenticación ausente o inválida');
    return { id: usuario.id, correo: usuario.correo, rol: usuario.rol, jti: payload.jti, exp: payload.exp };
  }
}
