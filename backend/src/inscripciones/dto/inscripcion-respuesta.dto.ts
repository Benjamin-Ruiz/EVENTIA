import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoInscripcion, Inscripcion } from '../entities/inscripcion.entity';

export class InscripcionRespuestaDto {
  @ApiProperty() id: number;
  @ApiProperty() eventoId: number;
  @ApiPropertyOptional() evento?: string;
  @ApiPropertyOptional() fechaEvento?: Date;
  @ApiProperty() cantidad: number;
  @ApiProperty({ enum: EstadoInscripcion }) estado: EstadoInscripcion;
  @ApiProperty() creadoEn: Date;

  static from(i: Inscripcion): InscripcionRespuestaDto {
    return {
      id: i.id,
      eventoId: i.eventoId,
      evento: i.evento?.titulo,
      fechaEvento: i.evento?.fecha,
      cantidad: i.cantidad,
      estado: i.estado,
      creadoEn: i.creadoEn,
    };
  }
}

/** Vista para el organizador: incluye solo nombre y correo del participante. */
export class ParticipanteDto {
  @ApiProperty() inscripcionId: number;
  @ApiProperty() nombre: string;
  @ApiProperty() correo: string;
  @ApiProperty() cantidad: number;
  @ApiProperty({ enum: EstadoInscripcion }) estado: EstadoInscripcion;
  @ApiProperty() creadoEn: Date;

  static from(i: Inscripcion): ParticipanteDto {
    return {
      inscripcionId: i.id,
      nombre: i.usuario?.nombre,
      correo: i.usuario?.correo,
      cantidad: i.cantidad,
      estado: i.estado,
      creadoEn: i.creadoEn,
    };
  }
}
