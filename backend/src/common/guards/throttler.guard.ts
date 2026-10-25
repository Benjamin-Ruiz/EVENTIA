import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Limita por IP y, en el inicio de sesión, también por correo: frena la fuerza bruta contra una
 * misma cuenta sin bloquear a distintos usuarios que comparten IP (p. ej. la red del campus).
 */
@Injectable()
export class EventiaThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const ip = req.ips?.length ? req.ips[0] : req.ip;
    const correo = typeof req.body?.correo === 'string' ? req.body.correo.trim().toLowerCase() : '';
    return correo && req.url?.endsWith('/auth/login') ? `${ip}:${correo}` : ip;
  }
}
