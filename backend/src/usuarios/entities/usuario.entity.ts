import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Rol } from '../../common/enums/rol.enum';
import { Evento } from '../../eventos/entities/evento.entity';
import { Inscripcion } from '../../inscripciones/entities/inscripcion.entity';

@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  nombre: string;

  @Column({ unique: true, length: 150 })
  correo: string;

  @Column({ nullable: true, length: 20 })
  telefono: string;

  /** Nunca se selecciona por defecto para no filtrarlo en respuestas. */
  @Column({ select: false })
  passwordHash: string;

  @Column({ type: 'varchar', default: Rol.USUARIO })
  rol: Rol;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn()
  creadoEn: Date;

  @OneToMany(() => Evento, (e) => e.organizador)
  eventos: Evento[];

  @OneToMany(() => Inscripcion, (i) => i.usuario)
  inscripciones: Inscripcion[];
}
