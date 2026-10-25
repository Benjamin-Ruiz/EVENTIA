import { ApiProperty } from '@nestjs/swagger';
import { EstadoEvento, Evento } from '../entities/evento.entity';

export class EventoRespuestaDto {
  @ApiProperty() id: number;
  @ApiProperty() titulo: string;
  @ApiProperty() descripcion: string;
  @ApiProperty() lugar: string;
  @ApiProperty() fecha: Date;
  @ApiProperty() cupo: number;
  @ApiProperty() inscritos: number;
  @ApiProperty({ description: 'Cupos disponibles' }) disponibles: number;
  @ApiProperty() precio: number;
  @ApiProperty({ enum: EstadoEvento }) estado: EstadoEvento;
  @ApiProperty() organizadorId: number;
  @ApiProperty() organizador: string;

  static from(e: Evento): EventoRespuestaDto {
    return {
      id: e.id,
      titulo: e.titulo,
      descripcion: e.descripcion,
      lugar: e.lugar,
      fecha: e.fecha,
      cupo: e.cupo,
      inscritos: e.inscritos,
      disponibles: Math.max(e.cupo - e.inscritos, 0),
      precio: Number(e.precio),
      estado: e.estado,
      organizadorId: e.organizadorId,
      organizador: e.organizador?.nombre,
    };
  }
}
