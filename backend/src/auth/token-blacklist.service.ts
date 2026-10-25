import { Injectable } from '@nestjs/common';

/**
 * Lista de tokens revocados (cierre de sesión). Cada entrada se descarta al expirar el token,
 * por lo que el tamaño permanece acotado. En una arquitectura con varias instancias se
 * reemplazaría por un almacén compartido (p. ej. Redis).
 */
@Injectable()
export class TokenBlacklistService {
  private readonly revocados = new Map<string, number>();

  revocar(jti: string, expSegundos: number) {
    this.revocados.set(jti, expSegundos * 1000);
    this.limpiar();
  }

  estaRevocado(jti: string): boolean {
    const exp = this.revocados.get(jti);
    return exp !== undefined && exp > Date.now();
  }

  private limpiar() {
    const ahora = Date.now();
    for (const [jti, exp] of this.revocados) if (exp <= ahora) this.revocados.delete(jti);
  }
}
