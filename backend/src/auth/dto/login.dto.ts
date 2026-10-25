import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { UsuarioPublicoDto } from '../../usuarios/dto/usuario-publico.dto';

export class LoginDto {
  @ApiProperty({ example: 'ana@email.com' })
  @IsEmail({}, { message: 'Correo inválido' })
  @MaxLength(150)
  correo: string;

  @ApiProperty({ example: 'Segura123!' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(72)
  password: string;
}

export class LoginRespuestaDto {
  @ApiProperty() accessToken: string;
  @ApiProperty({ example: 'Bearer' }) tipo: string;
  @ApiProperty({ example: '15m' }) expiraEn: string;
  @ApiProperty({ type: UsuarioPublicoDto }) usuario: UsuarioPublicoDto;
}
