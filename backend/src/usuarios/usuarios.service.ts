import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Rol } from '../common/enums/rol.enum';
import { UsuarioAutenticado } from '../common/decorators/current-user.decorator';
import { Usuario } from './entities/usuario.entity';
import { RegistroDto } from './dto/registro.dto';
import { ActualizarUsuarioAdminDto } from './dto/actualizar-usuario-admin.dto';

export const BCRYPT_ROUNDS = 12;

@Injectable()
export class UsuariosService {
  constructor(@InjectRepository(Usuario) private readonly repo: Repository<Usuario>) {}

  /** Registro público: el rol siempre lo asigna el servidor (nunca el cliente). */
  async registrar(dto: RegistroDto): Promise<Usuario> {
    const existe = await this.repo.exists({ where: { correo: dto.correo } });
    if (existe) throw new ConflictException('No fue posible completar el registro con ese correo');

    const usuario = this.repo.create({
      nombre: dto.nombre,
      correo: dto.correo,
      telefono: dto.telefono,
      passwordHash: await bcrypt.hash(dto.password, BCRYPT_ROUNDS),
      rol: Rol.USUARIO,
    });
    return this.repo.save(usuario);
  }

  /** Solo para autenticación: incluye explícitamente el hash. */
  buscarParaLogin(correo: string): Promise<Usuario | null> {
    return this.repo
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('u.correo = :correo', { correo: correo.trim().toLowerCase() })
      .getOne();
  }

  async buscarPorId(id: number): Promise<Usuario> {
    const usuario = await this.repo.findOne({ where: { id } });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    return usuario;
  }

  /** Un usuario solo puede consultar su propio perfil; el administrador puede consultar cualquiera. */
  async consultar(id: number, actor: UsuarioAutenticado): Promise<Usuario> {
    if (actor.rol !== Rol.ADMINISTRADOR && actor.id !== id) {
      throw new ForbiddenException('No puede consultar la información de otro usuario');
    }
    return this.buscarPorId(id);
  }

  listar(): Promise<Usuario[]> {
    return this.repo.find({ order: { id: 'ASC' } });
  }

  async actualizarComoAdmin(id: number, dto: ActualizarUsuarioAdminDto, actor: UsuarioAutenticado) {
    const usuario = await this.buscarPorId(id);
    if (usuario.id === actor.id && (dto.rol && dto.rol !== Rol.ADMINISTRADOR || dto.activo === false)) {
      throw new ForbiddenException('Un administrador no puede quitarse sus propios privilegios');
    }
    Object.assign(usuario, dto);
    return this.repo.save(usuario);
  }
}
