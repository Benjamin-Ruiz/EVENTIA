import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

/** El rol NO forma parte del DTO: con forbidNonWhitelisted se rechaza si el cliente intenta enviarlo. */
export class RegistroDto {
  @ApiProperty({ example: 'Ana López' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MaxLength(100)
  nombre: string;

  @ApiProperty({ example: 'ana@email.com' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'Correo inválido' })
  @MaxLength(150)
  correo: string;

  @ApiProperty({ example: 'Segura123!', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(72)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, { message: 'La contraseña debe contener letras y números' })
  password: string;

  @ApiPropertyOptional({ example: '55555555' })
  @IsOptional()
  @Matches(/^\d{8}$/, { message: 'El teléfono debe tener 8 dígitos' })
  telefono?: string;
}
