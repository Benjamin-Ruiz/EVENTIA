import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { Rol } from '../common/enums/rol.enum';
import { UsuarioAutenticado } from '../common/decorators/current-user.decorator';
import { EstadoEvento, Evento } from './entities/evento.entity';
import { CrearEventoDto } from './dto/crear-evento.dto';
import { ActualizarEventoDto } from './dto/actualizar-evento.dto';
import { BuscarEventosDto } from './dto/buscar-eventos.dto';

@Injectable()
export class EventosService {
  constructor(@InjectRepository(Evento) private readonly repo: Repository<Evento>) {}

  async buscar(filtros: BuscarEventosDto) {
    const { q, desde, disponibles, pagina = 1, limite = 20 } = filtros;
    const qb = this.repo
      .createQueryBuilder('e')
      .leftJoin('e.organizador', 'o')
      .addSelect(['o.id', 'o.nombre'])
      .orderBy('e.fecha', 'ASC');

    if (q) {
      const texto = `%${q.toLowerCase()}%`;
      qb.andWhere(
        new Brackets((w) =>
          w
            .where('LOWER(e.titulo) LIKE :texto', { texto })
            .orWhere('LOWER(e.descripcion) LIKE :texto', { texto })
            .orWhere('LOWER(e.lugar) LIKE :texto', { texto }),
        ),
      );
    }
    if (desde) qb.andWhere('e.fecha >= :desde', { desde: desde.toISOString() });
    if (disponibles === 'true') {
      qb.andWhere('e.inscritos < e.cupo').andWhere('e.estado = :abierto', { abierto: EstadoEvento.ABIERTO });
    }

    const [items, total] = await qb.skip((pagina - 1) * limite).take(limite).getManyAndCount();
    return { items, total, pagina, limite };
  }

  async obtener(id: number): Promise<Evento> {
    const evento = await this.repo.findOne({ where: { id }, relations: { organizador: true } });
    if (!evento) throw new NotFoundException('Evento no encontrado');
    return evento;
  }

  misEventos(actor: UsuarioAutenticado) {
    return this.repo.find({
      where: { organizadorId: actor.id },
      relations: { organizador: true },
      order: { fecha: 'ASC' },
    });
  }

  /** El organizador se toma del token, nunca del cuerpo de la solicitud. */
  async crear(dto: CrearEventoDto, actor: UsuarioAutenticado): Promise<Evento> {
    const evento = this.repo.create({ ...dto, organizadorId: actor.id, inscritos: 0, estado: EstadoEvento.ABIERTO });
    const guardado = await this.repo.save(evento);
    return this.obtener(guardado.id);
  }

  /**
   * Autorización a nivel de recurso (ABAC/ReBAC): tener el rol de organizador no basta,
   * el evento debe pertenecerle. El administrador puede operar sobre cualquier evento.
   */
  async obtenerParaGestionar(id: number, actor: UsuarioAutenticado): Promise<Evento> {
    const evento = await this.obtener(id);
    if (actor.rol !== Rol.ADMINISTRADOR && evento.organizadorId !== actor.id) {
      throw new ForbiddenException('Solo el organizador del evento puede realizar esta operación');
    }
    return evento;
  }

  async actualizar(id: number, dto: ActualizarEventoDto, actor: UsuarioAutenticado): Promise<Evento> {
    const evento = await this.obtenerParaGestionar(id, actor);
    if (evento.estado === EstadoEvento.CERRADO) {
      throw new ConflictException('El evento está cerrado y no admite cambios');
    }
    if (dto.cupo !== undefined && dto.cupo < evento.inscritos) {
      throw new BadRequestException(`El cupo no puede ser menor a las ${evento.inscritos} plazas ya ocupadas`);
    }
    Object.assign(evento, dto);
    await this.repo.save(evento);
    return this.obtener(id);
  }

  async cerrar(id: number, actor: UsuarioAutenticado): Promise<Evento> {
    const evento = await this.obtenerParaGestionar(id, actor);
    if (evento.estado === EstadoEvento.CERRADO) throw new ConflictException('El evento ya está cerrado');
    evento.estado = EstadoEvento.CERRADO;
    await this.repo.save(evento);
    return this.obtener(id);
  }

  async eliminar(id: number, actor: UsuarioAutenticado) {
    const evento = await this.obtenerParaGestionar(id, actor);
    if (evento.inscritos > 0) {
      throw new ConflictException('No se puede eliminar un evento con inscripciones; ciérrelo en su lugar');
    }
    await this.repo.remove(evento);
  }
}
