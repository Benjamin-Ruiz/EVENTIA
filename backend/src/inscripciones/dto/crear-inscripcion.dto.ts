import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Max, Min } from 'class-validator';

export const MAX_CANTIDAD_POR_SOLICITUD = 5;

export class CrearInscripcionDto {
  @ApiProperty({ example: 1, minimum: 1, maximum: MAX_CANTIDAD_POR_SOLICITUD })
  @IsInt({ message: 'La cantidad debe ser un número entero' })
  @Min(1, { message: 'La cantidad debe ser mayor que cero' })
  @Max(MAX_CANTIDAD_POR_SOLICITUD, { message: `No puede solicitar más de ${MAX_CANTIDAD_POR_SOLICITUD} plazas` })
  cantidad: number;
}
