import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Rol } from '../../common/enums/rol.enum';
import { Usuario } from '../entities/usuario.entity';

/** Proyección segura: solo los campos que el frontend necesita (evita exposición excesiva de datos). */
export class UsuarioPublicoDto {
  @ApiProperty() id: number;
  @ApiProperty() nombre: string;
  @ApiProperty() correo: string;
  @ApiProperty({ enum: Rol }) rol: Rol;

  static from(u: Usuario): UsuarioPublicoDto {
    return { id: u.id, nombre: u.nombre, correo: u.correo, rol: u.rol };
  }
}

export class UsuarioAdminDto extends UsuarioPublicoDto {
  @ApiPropertyOptional() telefono?: string;
  @ApiProperty() activo: boolean;
  @ApiProperty() creadoEn: Date;

  static fromAdmin(u: Usuario): UsuarioAdminDto {
    return { ...UsuarioPublicoDto.from(u), telefono: u.telefono, activo: u.activo, creadoEn: u.creadoEn };
  }
}
