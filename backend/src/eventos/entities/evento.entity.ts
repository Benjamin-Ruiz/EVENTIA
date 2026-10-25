import { Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { Inscripcion } from '../../inscripciones/entities/inscripcion.entity';

export enum EstadoEvento {
  ABIERTO = 'abierto',
  CERRADO = 'cerrado',
}

@Entity('eventos')
export class Evento {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 150 })
  titulo: string;

  @Column({ type: 'text', default: '' })
  descripcion: string;

  @Column({ length: 150 })
  lugar: string;

  @Column({ type: 'datetime' })
  fecha: Date;

  @Column({ type: 'integer' })
  cupo: number;

  /** Plazas ocupadas. Se modifica solo mediante actualizaciones atómicas condicionadas. */
  @Column({ type: 'integer', default: 0 })
  inscritos: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  precio: number;

  @Column({ type: 'varchar', default: EstadoEvento.ABIERTO })
  estado: EstadoEvento;

  @Column()
  organizadorId: number;

  @ManyToOne(() => Usuario, (u) => u.eventos, { onDelete: 'CASCADE' })
  organizador: Usuario;

  @OneToMany(() => Inscripcion, (i) => i.evento)
  inscripciones: Inscripcion[];

  @CreateDateColumn()
  creadoEn: Date;

  @UpdateDateColumn()
  actualizadoEn: Date;
}
