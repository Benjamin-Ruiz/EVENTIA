import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { UsuariosService } from '../usuarios/usuarios.service';
import { UsuarioPublicoDto } from '../usuarios/dto/usuario-publico.dto';
import { TokenBlacklistService } from './token-blacklist.service';
import { LoginDto, LoginRespuestaDto } from './dto/login.dto';

/** Hash válido de referencia para igualar el tiempo de respuesta cuando el correo no existe. */
const HASH_FICTICIO = bcrypt.hashSync('contraseña-ficticia-eventia', 12);
const CREDENCIALES_INVALIDAS = 'Credenciales inválidas';

@Injectable()
export class AuthService {
  constructor(
    private readonly usuarios: UsuariosService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly blacklist: TokenBlacklistService,
  ) {}

  /** Mensaje genérico ante cualquier fallo: no revela si la cuenta existe. */
  async login(dto: LoginDto): Promise<LoginRespuestaDto> {
    const usuario = await this.usuarios.buscarParaLogin(dto.correo);
    const valida = await bcrypt.compare(dto.password, usuario?.passwordHash ?? HASH_FICTICIO);
    if (!usuario || !valida || !usuario.activo) throw new UnauthorizedException(CREDENCIALES_INVALIDAS);

    const accessToken = await this.jwt.signAsync({
      sub: usuario.id,
      correo: usuario.correo,
      rol: usuario.rol,
      jti: randomUUID(),
    });
    return {
      accessToken,
      tipo: 'Bearer',
      expiraEn: this.config.get('JWT_EXPIRES_IN', '15m'),
      usuario: UsuarioPublicoDto.from(usuario),
    };
  }

  logout(jti: string, exp: number) {
    this.blacklist.revocar(jti, exp);
    return { mensaje: 'Sesión cerrada correctamente' };
  }
}
