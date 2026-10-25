import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDate,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinDate,
} from 'class-validator';

const recortar = ({ value }) => (typeof value === 'string' ? value.trim() : value);

export class CrearEventoDto {
  @ApiProperty({ example: 'Concierto universitario' })
  @Transform(recortar)
  @IsString()
  @IsNotEmpty({ message: 'El título no puede estar vacío' })
  @MaxLength(150)
  titulo: string;

  @ApiPropertyOptional({ example: 'Presentación de bandas estudiantiles' })
  @IsOptional()
  @Transform(recortar)
  @IsString()
  @MaxLength(2000)
  descripcion?: string;

  @ApiProperty({ example: 'Auditorio URL Quetzaltenango' })
  @Transform(recortar)
  @IsString()
  @IsNotEmpty({ message: 'El lugar es obligatorio' })
  @MaxLength(150)
  lugar: string;

  @ApiProperty({ example: '2026-12-15T18:00:00.000Z' })
  @Type(() => Date)
  @IsDate({ message: 'Fecha inválida' })
  @MinDate(() => new Date(), { message: 'La fecha del evento debe ser futura' })
  fecha: Date;

  @ApiProperty({ example: 150, minimum: 1 })
  @IsInt({ message: 'El cupo debe ser un número entero' })
  @Min(1, { message: 'El cupo debe ser un entero positivo' })
  @Max(100000)
  cupo: number;

  @ApiProperty({ example: 75, minimum: 0 })
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Precio inválido' })
  @Min(0, { message: 'El precio no puede ser negativo' })
  @Max(1000000)
  precio: number;
}
