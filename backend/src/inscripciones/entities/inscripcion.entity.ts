import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { Evento } from '../../eventos/entities/evento.entity';

export enum EstadoInscripcion {
  CONFIRMADA = 'confirmada',
  CANCELADA = 'cancelada',
}

@Entity('inscripciones')
export class Inscripcion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  eventoId: number;

  @ManyToOne(() => Evento, (e) => e.inscripciones, { onDelete: 'CASCADE' })
  evento: Evento;

  @Column()
  usuarioId: number;

  @ManyToOne(() => Usuario, (u) => u.inscripciones, { onDelete: 'CASCADE' })
  usuario: Usuario;

  @Column({ type: 'integer' })
  cantidad: number;

  @Column({ type: 'varchar', default: EstadoInscripcion.CONFIRMADA })
  estado: EstadoInscripcion;

  @CreateDateColumn()
  creadoEn: Date;
}
