import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inscripcion } from '../inscripciones/entities/inscripcion.entity';
import { INSCRIPCION_CANCELADA, INSCRIPCION_CONFIRMADA } from '../inscripciones/inscripciones.service';
import { Notificacion } from './entities/notificacion.entity';

/**
 * Las notificaciones se procesan de forma asíncrona a partir de eventos de dominio, desacopladas del
 * flujo de inscripción. Hoy se guardan en BD y se registran en el log (simulando un correo); en el
 * futuro este módulo puede extraerse a un servicio independiente con una cola de mensajes.
 */
@Injectable()
export class NotificacionesService {
  private readonly logger = new Logger('Notificaciones');

  constructor(@InjectRepository(Notificacion) private readonly repo: Repository<Notificacion>) {}

  @OnEvent(INSCRIPCION_CONFIRMADA, { async: true })
  async alConfirmar(i: Inscripcion) {
    await this.enviar(
      i.usuarioId,
      'Inscripción confirmada',
      `Tu inscripción #${i.id} a "${i.evento?.titulo}" por ${i.cantidad} plaza(s) fue confirmada.`,
    );
  }

  @OnEvent(INSCRIPCION_CANCELADA, { async: true })
  async alCancelar(i: Inscripcion) {
    await this.enviar(i.usuarioId, 'Inscripción cancelada', `Tu inscripción #${i.id} a "${i.evento?.titulo}" fue cancelada.`);
  }

  misNotificaciones(usuarioId: number) {
    return this.repo.find({ where: { usuarioId }, order: { creadoEn: 'DESC' } });
  }

  async marcarLeida(id: number, usuarioId: number) {
    const n = await this.repo.findOne({ where: { id, usuarioId } });
    if (!n) throw new NotFoundException('Notificación no encontrada');
    n.leida = true;
    return this.repo.save(n);
  }

  private async enviar(usuarioId: number, asunto: string, mensaje: string) {
    try {
      await this.repo.save(this.repo.create({ usuarioId, asunto, mensaje }));
      this.logger.log(`[correo simulado] usuario=${usuarioId} · ${asunto}`);
    } catch (e) {
      this.logger.error('No se pudo registrar la notificación', (e as Error).stack);
    }
  }
}
