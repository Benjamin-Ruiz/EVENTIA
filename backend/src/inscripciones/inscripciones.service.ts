import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Rol } from '../common/enums/rol.enum';
import { UsuarioAutenticado } from '../common/decorators/current-user.decorator';
import { EstadoEvento, Evento } from '../eventos/entities/evento.entity';
import { EventosService } from '../eventos/eventos.service';
import { EstadoInscripcion, Inscripcion } from './entities/inscripcion.entity';
import { CrearInscripcionDto } from './dto/crear-inscripcion.dto';

export const INSCRIPCION_CONFIRMADA = 'inscripcion.confirmada';
export const INSCRIPCION_CANCELADA = 'inscripcion.cancelada';

@Injectable()
export class InscripcionesService {
  private readonly maxPorUsuario: number;

  constructor(
    @InjectRepository(Inscripcion) private readonly repo: Repository<Inscripcion>,
    private readonly dataSource: DataSource,
    private readonly eventos: EventosService,
    private readonly emitter: EventEmitter2,
    config: ConfigService,
  ) {
    this.maxPorUsuario = Number(config.get('MAX_INSCRIPCIONES_POR_USUARIO', 5));
  }

  /**
   * Flujo principal: consultar evento → verificar disponibilidad → inscribir → actualizar cupo.
   * El descuento de cupo se hace con un UPDATE condicionado dentro de una transacción, de modo que
   * dos solicitudes simultáneas nunca puedan sobrepasar el cupo (no se confía en un "leer y luego escribir").
   */
  async inscribir(eventoId: number, dto: CrearInscripcionDto, actor: UsuarioAutenticado): Promise<Inscripcion> {
    const inscripcion = await this.dataSource.transaction(async (manager) => {
      const evento = await manager.findOne(Evento, { where: { id: eventoId } });
      if (!evento) throw new NotFoundException('Evento no encontrado');
      if (evento.estado !== EstadoEvento.ABIERTO) throw new ConflictException('El evento no admite inscripciones');
      if (new Date(evento.fecha) <= new Date()) throw new ConflictException('El evento ya se realizó');
      if (evento.organizadorId === actor.id) {
        throw new ForbiddenException('No puede inscribirse en un evento que usted organiza');
      }

      const { total } = await manager
        .createQueryBuilder(Inscripcion, 'i')
        .select('COALESCE(SUM(i.cantidad), 0)', 'total')
        .where('i.eventoId = :eventoId AND i.usuarioId = :usuarioId AND i.estado = :estado', {
          eventoId,
          usuarioId: actor.id,
          estado: EstadoInscripcion.CONFIRMADA,
        })
        .getRawOne();
      if (Number(total) + dto.cantidad > this.maxPorUsuario) {
        throw new UnprocessableEntityException(
          `Cada usuario puede reservar como máximo ${this.maxPorUsuario} plazas por evento (ya tiene ${total})`,
        );
      }

      const resultado = await manager
        .createQueryBuilder()
        .update(Evento)
        .set({ inscritos: () => 'inscritos + :cantidad' })
        .where('id = :id AND estado = :abierto AND inscritos + :cantidad <= cupo', {
          id: eventoId,
          abierto: EstadoEvento.ABIERTO,
          cantidad: dto.cantidad,
        })
        .execute();
      if (!resultado.affected) {
        throw new ConflictException(`No hay cupos suficientes (disponibles: ${Math.max(evento.cupo - evento.inscritos, 0)})`);
      }

      return manager.save(
        manager.create(Inscripcion, {
          eventoId,
          usuarioId: actor.id,
          cantidad: dto.cantidad,
          estado: EstadoInscripcion.CONFIRMADA,
        }),
      );
    });

    const completa = await this.obtenerConEvento(inscripcion.id);
    this.emitter.emit(INSCRIPCION_CONFIRMADA, completa);
    return completa;
  }

  misInscripciones(actor: UsuarioAutenticado) {
    return this.repo.find({
      where: { usuarioId: actor.id },
      relations: { evento: true },
      order: { creadoEn: 'DESC' },
    });
  }

  /** Control de acceso por recurso: dueño de la inscripción, organizador del evento o administrador. */
  async consultar(id: number, actor: UsuarioAutenticado): Promise<Inscripcion> {
    const inscripcion = await this.obtenerConEvento(id);
    const esDueno = inscripcion.usuarioId === actor.id;
    const esOrganizador = inscripcion.evento?.organizadorId === actor.id;
    if (!esDueno && !esOrganizador && actor.rol !== Rol.ADMINISTRADOR) {
      throw new ForbiddenException('No puede consultar inscripciones de otros usuarios');
    }
    return inscripcion;
  }

  async participantes(eventoId: number, actor: UsuarioAutenticado) {
    await this.eventos.obtenerParaGestionar(eventoId, actor);
    return this.repo.find({
      where: { eventoId },
      relations: { usuario: true },
      order: { creadoEn: 'ASC' },
    });
  }

  /** Solo el dueño (o un administrador) puede cancelar; libera los cupos de forma atómica. */
  async cancelar(id: number, actor: UsuarioAutenticado): Promise<Inscripcion> {
    await this.dataSource.transaction(async (manager) => {
      const inscripcion = await manager.findOne(Inscripcion, { where: { id } });
      if (!inscripcion) throw new NotFoundException('Inscripción no encontrada');
      if (inscripcion.usuarioId !== actor.id && actor.rol !== Rol.ADMINISTRADOR) {
        throw new ForbiddenException('No puede cancelar inscripciones de otros usuarios');
      }
      if (inscripcion.estado === EstadoInscripcion.CANCELADA) {
        throw new ConflictException('La inscripción ya fue cancelada');
      }
      const r = await manager
        .createQueryBuilder()
        .update(Inscripcion)
        .set({ estado: EstadoInscripcion.CANCELADA })
        .where('id = :id AND estado = :confirmada', { id, confirmada: EstadoInscripcion.CONFIRMADA })
        .execute();
      if (!r.affected) throw new ConflictException('La inscripción ya fue cancelada');
      await manager
        .createQueryBuilder()
        .update(Evento)
        .set({ inscritos: () => 'MAX(inscritos - :cantidad, 0)' })
        .where('id = :id', { id: inscripcion.eventoId, cantidad: inscripcion.cantidad })
        .execute();
    });
    const cancelada = await this.obtenerConEvento(id);
    this.emitter.emit(INSCRIPCION_CANCELADA, cancelada);
    return cancelada;
  }

  private async obtenerConEvento(id: number): Promise<Inscripcion> {
    const inscripcion = await this.repo.findOne({ where: { id }, relations: { evento: true } });
    if (!inscripcion) throw new NotFoundException('Inscripción no encontrada');
    return inscripcion;
  }
}
