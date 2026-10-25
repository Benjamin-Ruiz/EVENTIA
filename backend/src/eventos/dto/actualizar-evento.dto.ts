import { PartialType } from '@nestjs/swagger';
import { CrearEventoDto } from './crear-evento.dto';

/** Mismas validaciones que la creación; todos los campos son opcionales. organizadorId/estado no se aceptan. */
export class ActualizarEventoDto extends PartialType(CrearEventoDto) {}
