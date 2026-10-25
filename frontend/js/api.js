/**
 * Cliente HTTP de Eventia. El token se guarda en sessionStorage (se pierde al cerrar la pestaña).
 * Ocultar opciones en la interfaz es solo usabilidad: toda autorización real se valida en el backend.
 */
const Api = (() => {
  const BASE = '/api';
  const CLAVE = 'eventia.sesion';

  const leerSesion = () => {
    try { return JSON.parse(sessionStorage.getItem(CLAVE)) || null; } catch { return null; }
  };
  const guardarSesion = (s) => {
    try { s ? sessionStorage.setItem(CLAVE, JSON.stringify(s)) : sessionStorage.removeItem(CLAVE); } catch { /* sin almacenamiento */ }
  };

  async function solicitud(metodo, ruta, cuerpo) {
    const sesion = leerSesion();
    const headers = { 'Content-Type': 'application/json' };
    if (sesion?.accessToken) headers.Authorization = `Bearer ${sesion.accessToken}`;

    const res = await fetch(BASE + ruta, {
      method: metodo,
      headers,
      body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
    });
    const datos = res.status === 204 ? null : await res.json().catch(() => null);

    if (!res.ok) {
      if (res.status === 401 && sesion && ruta !== '/auth/login') {
        guardarSesion(null);
        window.dispatchEvent(new CustomEvent('sesion-expirada'));
      }
      const msg = Array.isArray(datos?.mensaje) ? datos.mensaje.join('. ') : datos?.mensaje || 'Error inesperado';
      const err = new Error(msg);
      err.status = res.status;
      throw err;
    }
    return datos;
  }

  return {
    sesion: leerSesion,
    async login(correo, password) {
      const r = await solicitud('POST', '/auth/login', { correo, password });
      guardarSesion(r);
      return r;
    },
    async logout() {
      try { await solicitud('POST', '/auth/logout'); } finally { guardarSesion(null); }
    },
    registrar: (d) => solicitud('POST', '/usuarios', d),
    eventos: (params = {}) => solicitud('GET', '/eventos?' + new URLSearchParams(params)),
    evento: (id) => solicitud('GET', `/eventos/${id}`),
    misEventos: () => solicitud('GET', '/eventos/mios'),
    crearEvento: (d) => solicitud('POST', '/eventos', d),
    actualizarEvento: (id, d) => solicitud('PUT', `/eventos/${id}`, d),
    cerrarEvento: (id) => solicitud('PATCH', `/eventos/${id}/cerrar`),
    eliminarEvento: (id) => solicitud('DELETE', `/eventos/${id}`),
    inscribir: (id, cantidad) => solicitud('POST', `/eventos/${id}/inscripciones`, { cantidad }),
    participantes: (id) => solicitud('GET', `/eventos/${id}/inscripciones`),
    misInscripciones: () => solicitud('GET', '/inscripciones/mias'),
    cancelarInscripcion: (id) => solicitud('DELETE', `/inscripciones/${id}`),
    notificaciones: () => solicitud('GET', '/notificaciones/mias'),
    marcarLeida: (id) => solicitud('PATCH', `/notificaciones/${id}/leida`),
    usuarios: () => solicitud('GET', '/usuarios'),
    actualizarUsuario: (id, d) => solicitud('PATCH', `/usuarios/${id}`, d),
  };
})();
