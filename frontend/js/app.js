/* Eventia · SPA sin dependencias. Rutas por hash: #/eventos, #/evento/:id, #/login, ... */
(() => {
  const $app = document.getElementById('app');
  const $menu = document.getElementById('menu');
  const $toast = document.getElementById('toast');

  // ---------- utilidades ----------
  const esc = (v) =>
    String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fecha = (f) => new Date(f).toLocaleString('es-GT', { dateStyle: 'medium', timeStyle: 'short' });
  const moneda = (n) => (Number(n) === 0 ? 'Gratis' : `Q${Number(n).toFixed(2)}`);
  const aInputFecha = (f) => {
    const d = new Date(f);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  };
  let timer;
  function aviso(msg, tipo = '') {
    $toast.textContent = msg;
    $toast.className = `toast ${tipo}`;
    $toast.hidden = false;
    clearTimeout(timer);
    timer = setTimeout(() => ($toast.hidden = true), 4000);
  }
  const usuario = () => Api.sesion()?.usuario;
  const tieneRol = (...roles) => roles.includes(usuario()?.rol);
  const ir = (ruta) => (location.hash = ruta);
  const datosForm = (form) => Object.fromEntries(new FormData(form).entries());

  // ---------- menú ----------
  function pintarMenu() {
    const u = usuario();
    let html = '<a href="#/eventos">Eventos</a>';
    if (!u) {
      html += '<a href="#/login">Iniciar sesión</a><a href="#/registro">Registrarse</a>';
    } else {
      if (tieneRol('usuario', 'organizador')) html += '<a href="#/mis-inscripciones">Mis inscripciones</a>';
      if (tieneRol('organizador', 'administrador')) html += '<a href="#/organizador">Mis eventos</a>';
      if (tieneRol('administrador')) html += '<a href="#/admin">Usuarios</a>';
      html += '<a href="#/notificaciones">Notificaciones</a>';
      html += `<span class="rol">${esc(u.nombre)} · ${esc(u.rol)}</span><button data-accion="logout">Salir</button>`;
    }
    $menu.innerHTML = html;
  }

  // ---------- vistas ----------
  function tarjetaEvento(e) {
    const pct = Math.min(100, Math.round((e.inscritos / e.cupo) * 100));
    const chip =
      e.estado === 'cerrado' ? '<span class="chip cerrado">Cerrado</span>'
        : e.disponibles === 0 ? '<span class="chip agotado">Agotado</span>'
          : `<span class="chip abierto">${e.disponibles} disponibles</span>`;
    return `
      <article class="tarjeta">
        <h3><a href="#/evento/${e.id}">${esc(e.titulo)}</a></h3>
        <p class="meta">📅 ${fecha(e.fecha)}</p>
        <p class="meta">📍 ${esc(e.lugar)}</p>
        <p class="meta">💲 ${moneda(e.precio)} · por ${esc(e.organizador)}</p>
        <div class="barra"><span style="width:${pct}%"></span></div>
        ${chip}
      </article>`;
  }

  async function vistaEventos(params) {
    const q = params.get('q') || '';
    const disp = params.get('disponibles') === 'true';
    $app.innerHTML = `
      <h1>Descubre eventos</h1>
      <form class="filtros" id="f-buscar">
        <input name="q" placeholder="Buscar por título, lugar..." value="${esc(q)}" maxlength="100" />
        <label style="display:flex;gap:6px;align-items:center"><input type="checkbox" name="disponibles" ${disp ? 'checked' : ''}/> Solo con cupo</label>
        <button class="btn">Buscar</button>
      </form>
      <div id="lista" class="grid"><p class="vacio">Cargando...</p></div>`;
    document.getElementById('f-buscar').addEventListener('submit', (ev) => {
      ev.preventDefault();
      const d = datosForm(ev.target);
      const p = new URLSearchParams();
      if (d.q) p.set('q', d.q);
      if (d.disponibles) p.set('disponibles', 'true');
      ir(`#/eventos?${p}`);
    });
    const filtros = { desde: new Date().toISOString() };
    if (q) filtros.q = q;
    if (disp) filtros.disponibles = 'true';
    const r = await Api.eventos(filtros);
    document.getElementById('lista').innerHTML = r.items.length
      ? r.items.map(tarjetaEvento).join('')
      : '<p class="vacio">No se encontraron eventos.</p>';
  }

  async function vistaEvento(id) {
    const e = await Api.evento(id);
    const u = usuario();
    let accion = '';
    if (!u) accion = '<p><a href="#/login">Inicia sesión</a> para inscribirte.</p>';
    else if (e.organizadorId === u.id) accion = '<p class="meta">Eres el organizador de este evento.</p>';
    else if (tieneRol('usuario', 'organizador') && e.estado === 'abierto' && e.disponibles > 0) {
      accion = `
        <form id="f-inscribir" class="filtros">
          <label>Cantidad de plazas
            <input type="number" name="cantidad" min="1" max="${Math.min(5, e.disponibles)}" value="1" required />
          </label>
          <button class="btn">Inscribirme</button>
        </form>`;
    } else if (e.estado !== 'abierto' || e.disponibles === 0) accion = '<p class="meta">Este evento no admite más inscripciones.</p>';

    $app.innerHTML = `
      <p><a href="#/eventos">← Volver</a></p>
      <article class="tarjeta">
        <h1>${esc(e.titulo)}</h1>
        <p>${esc(e.descripcion)}</p>
        <p class="meta">📅 ${fecha(e.fecha)} · 📍 ${esc(e.lugar)}</p>
        <p class="meta">💲 ${moneda(e.precio)} · Organiza: ${esc(e.organizador)}</p>
        <p><strong>Disponibilidad:</strong> ${e.disponibles} de ${e.cupo} plazas</p>
        <div class="barra"><span style="width:${Math.round((e.inscritos / e.cupo) * 100)}%"></span></div>
        ${accion}
      </article>`;

    document.getElementById('f-inscribir')?.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      try {
        await Api.inscribir(id, Number(datosForm(ev.target).cantidad));
        aviso('¡Inscripción confirmada! Revisa tus notificaciones.', 'ok');
        vistaEvento(id);
      } catch (err) { aviso(err.message, 'error'); }
    });
  }

  function vistaLogin() {
    $app.innerHTML = `
      <h1>Iniciar sesión</h1>
      <form class="formulario tarjeta" id="f-login">
        <label>Correo <input type="email" name="correo" required autocomplete="username" /></label>
        <label>Contraseña <input type="password" name="password" required autocomplete="current-password" /></label>
        <button class="btn">Entrar</button>
        <p class="meta">¿No tienes cuenta? <a href="#/registro">Regístrate</a></p>
      </form>`;
    document.getElementById('f-login').addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const d = datosForm(ev.target);
      try {
        const r = await Api.login(d.correo, d.password);
        aviso(`Bienvenido, ${r.usuario.nombre}`, 'ok');
        pintarMenu();
        ir('#/eventos');
      } catch (err) { aviso(err.message, 'error'); }
    });
  }

  function vistaRegistro() {
    $app.innerHTML = `
      <h1>Crear cuenta</h1>
      <form class="formulario tarjeta" id="f-registro">
        <label>Nombre <input name="nombre" required maxlength="100" /></label>
        <label>Correo <input type="email" name="correo" required maxlength="150" /></label>
        <label>Teléfono (opcional) <input name="telefono" pattern="\\d{8}" placeholder="8 dígitos" /></label>
        <label>Contraseña <input type="password" name="password" required minlength="8" autocomplete="new-password" /></label>
        <p class="meta">Mínimo 8 caracteres con letras y números.</p>
        <button class="btn">Registrarme</button>
      </form>`;
    document.getElementById('f-registro').addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const d = datosForm(ev.target);
      if (!d.telefono) delete d.telefono;
      try {
        await Api.registrar(d);
        await Api.login(d.correo, d.password);
        aviso('Cuenta creada correctamente', 'ok');
        pintarMenu();
        ir('#/eventos');
      } catch (err) { aviso(err.message, 'error'); }
    });
  }

  async function vistaMisInscripciones() {
    const lista = await Api.misInscripciones();
    $app.innerHTML = `
      <h1>Mis inscripciones</h1>
      ${lista.length ? `
      <div class="tabla-wrap"><table>
        <thead><tr><th>#</th><th>Evento</th><th>Fecha</th><th>Plazas</th><th>Estado</th><th></th></tr></thead>
        <tbody>${lista.map((i) => `
          <tr>
            <td>${i.id}</td>
            <td><a href="#/evento/${i.eventoId}">${esc(i.evento)}</a></td>
            <td>${fecha(i.fechaEvento)}</td>
            <td>${i.cantidad}</td>
            <td><span class="chip ${esc(i.estado)}">${esc(i.estado)}</span></td>
            <td>${i.estado === 'confirmada' ? `<button class="btn sec" data-accion="cancelar" data-id="${i.id}">Cancelar</button>` : ''}</td>
          </tr>`).join('')}
        </tbody></table></div>` : '<p class="vacio">Aún no tienes inscripciones. <a href="#/eventos">Explora eventos</a>.</p>'}`;
  }

  async function vistaNotificaciones() {
    const lista = await Api.notificaciones();
    $app.innerHTML = `
      <h1>Notificaciones</h1>
      ${lista.length ? lista.map((n) => `
        <article class="tarjeta" style="margin-bottom:10px;${n.leida ? 'opacity:.6' : ''}">
          <strong>${esc(n.asunto)}</strong>
          <p>${esc(n.mensaje)}</p>
          <p class="meta">${fecha(n.creadoEn)}</p>
          ${n.leida ? '' : `<button class="btn sec" data-accion="leida" data-id="${n.id}">Marcar como leída</button>`}
        </article>`).join('') : '<p class="vacio">No tienes notificaciones.</p>'}`;
  }

  function formEvento(e = {}) {
    return `
      <form class="formulario tarjeta" id="f-evento">
        <label>Título <input name="titulo" required maxlength="150" value="${esc(e.titulo)}" /></label>
        <label>Descripción <textarea name="descripcion" maxlength="2000">${esc(e.descripcion)}</textarea></label>
        <label>Lugar <input name="lugar" required maxlength="150" value="${esc(e.lugar)}" /></label>
        <label>Fecha y hora <input type="datetime-local" name="fecha" required value="${e.fecha ? aInputFecha(e.fecha) : ''}" /></label>
        <label>Cupo <input type="number" name="cupo" required min="${e.inscritos || 1}" value="${e.cupo ?? ''}" /></label>
        <label>Precio (Q) <input type="number" name="precio" required min="0" step="0.01" value="${e.precio ?? 0}" /></label>
        <div class="acciones">
          <button class="btn">${e.id ? 'Guardar cambios' : 'Publicar evento'}</button>
          <a class="btn sec" href="#/organizador">Cancelar</a>
        </div>
      </form>`;
  }

  function leerFormEvento(form) {
    const d = datosForm(form);
    return {
      titulo: d.titulo,
      descripcion: d.descripcion,
      lugar: d.lugar,
      fecha: new Date(d.fecha).toISOString(),
      cupo: Number(d.cupo),
      precio: Number(d.precio),
    };
  }

  async function vistaOrganizador() {
    const lista = await Api.misEventos();
    $app.innerHTML = `
      <h1>Mis eventos</h1>
      <p><a class="btn" href="#/organizador/nuevo">+ Nuevo evento</a></p>
      ${lista.length ? `
      <div class="tabla-wrap"><table>
        <thead><tr><th>Evento</th><th>Fecha</th><th>Ocupación</th><th>Estado</th><th>Acciones</th></tr></thead>
        <tbody>${lista.map((e) => `
          <tr>
            <td><a href="#/evento/${e.id}">${esc(e.titulo)}</a></td>
            <td>${fecha(e.fecha)}</td>
            <td>${e.inscritos}/${e.cupo}</td>
            <td><span class="chip ${esc(e.estado)}">${esc(e.estado)}</span></td>
            <td class="acciones">
              <a class="btn sec" href="#/organizador/participantes/${e.id}">Participantes</a>
              ${e.estado === 'abierto' ? `
                <a class="btn sec" href="#/organizador/editar/${e.id}">Editar</a>
                <button class="btn sec" data-accion="cerrar" data-id="${e.id}">Cerrar</button>` : ''}
              ${e.inscritos === 0 ? `<button class="btn peligro" data-accion="eliminar" data-id="${e.id}">Eliminar</button>` : ''}
            </td>
          </tr>`).join('')}
        </tbody></table></div>` : '<p class="vacio">Todavía no has publicado eventos.</p>'}`;
  }

  async function vistaEditarEvento(id) {
    const e = id ? await Api.evento(id) : {};
    $app.innerHTML = `<h1>${id ? 'Editar evento' : 'Nuevo evento'}</h1>${formEvento(e)}`;
    document.getElementById('f-evento').addEventListener('submit', async (ev) => {
      ev.preventDefault();
      try {
        const datos = leerFormEvento(ev.target);
        id ? await Api.actualizarEvento(id, datos) : await Api.crearEvento(datos);
        aviso(id ? 'Evento actualizado' : 'Evento publicado', 'ok');
        ir('#/organizador');
      } catch (err) { aviso(err.message, 'error'); }
    });
  }

  async function vistaParticipantes(id) {
    const [e, lista] = await Promise.all([Api.evento(id), Api.participantes(id)]);
    $app.innerHTML = `
      <p><a href="#/organizador">← Mis eventos</a></p>
      <h1>Participantes · ${esc(e.titulo)}</h1>
      <p class="meta">${e.inscritos} de ${e.cupo} plazas ocupadas</p>
      ${lista.length ? `
      <div class="tabla-wrap"><table>
        <thead><tr><th>#</th><th>Nombre</th><th>Correo</th><th>Plazas</th><th>Estado</th><th>Fecha</th></tr></thead>
        <tbody>${lista.map((p) => `
          <tr><td>${p.inscripcionId}</td><td>${esc(p.nombre)}</td><td>${esc(p.correo)}</td><td>${p.cantidad}</td>
          <td><span class="chip ${esc(p.estado)}">${esc(p.estado)}</span></td><td>${fecha(p.creadoEn)}</td></tr>`).join('')}
        </tbody></table></div>` : '<p class="vacio">Sin inscripciones todavía.</p>'}`;
  }

  async function vistaAdmin() {
    const lista = await Api.usuarios();
    const yo = usuario().id;
    $app.innerHTML = `
      <h1>Administración de usuarios</h1>
      <div class="tabla-wrap"><table>
        <thead><tr><th>#</th><th>Nombre</th><th>Correo</th><th>Rol</th><th>Activo</th></tr></thead>
        <tbody>${lista.map((u) => `
          <tr>
            <td>${u.id}</td><td>${esc(u.nombre)}</td><td>${esc(u.correo)}</td>
            <td><select data-accion="rol" data-id="${u.id}" ${u.id === yo ? 'disabled' : ''}>
              ${['usuario', 'organizador', 'administrador'].map((r) => `<option ${r === u.rol ? 'selected' : ''}>${r}</option>`).join('')}
            </select></td>
            <td><input type="checkbox" data-accion="activo" data-id="${u.id}" ${u.activo ? 'checked' : ''} ${u.id === yo ? 'disabled' : ''}/></td>
          </tr>`).join('')}
        </tbody></table></div>`;
  }

  // ---------- acciones delegadas ----------
  document.addEventListener('click', async (ev) => {
    const el = ev.target.closest('[data-accion]');
    if (!el || el.tagName === 'SELECT' || el.type === 'checkbox') return;
    const id = Number(el.dataset.id);
    try {
      switch (el.dataset.accion) {
        case 'logout':
          await Api.logout();
          pintarMenu();
          aviso('Sesión cerrada');
          ir('#/eventos');
          break;
        case 'cancelar':
          if (!confirm('¿Cancelar esta inscripción?')) return;
          await Api.cancelarInscripcion(id);
          aviso('Inscripción cancelada', 'ok');
          vistaMisInscripciones();
          break;
        case 'leida':
          await Api.marcarLeida(id);
          vistaNotificaciones();
          break;
        case 'cerrar':
          if (!confirm('Al cerrar el evento ya no admitirá inscripciones ni cambios. ¿Continuar?')) return;
          await Api.cerrarEvento(id);
          aviso('Evento cerrado', 'ok');
          vistaOrganizador();
          break;
        case 'eliminar':
          if (!confirm('¿Eliminar este evento?')) return;
          await Api.eliminarEvento(id);
          aviso('Evento eliminado', 'ok');
          vistaOrganizador();
          break;
      }
    } catch (err) { aviso(err.message, 'error'); }
  });

  document.addEventListener('change', async (ev) => {
    const el = ev.target;
    if (!el.dataset?.accion) return;
    const id = Number(el.dataset.id);
    try {
      if (el.dataset.accion === 'rol') await Api.actualizarUsuario(id, { rol: el.value });
      if (el.dataset.accion === 'activo') await Api.actualizarUsuario(id, { activo: el.checked });
      aviso('Usuario actualizado', 'ok');
    } catch (err) {
      aviso(err.message, 'error');
      vistaAdmin();
    }
  });

  window.addEventListener('sesion-expirada', () => {
    pintarMenu();
    aviso('Tu sesión expiró. Inicia sesión nuevamente.', 'error');
    ir('#/login');
  });

  // ---------- enrutador ----------
  const privada = (roles, vista) => (...args) => {
    if (!usuario()) { ir('#/login'); return; }
    if (roles && !tieneRol(...roles)) { $app.innerHTML = '<p class="vacio">No tienes permiso para ver esta sección.</p>'; return; }
    return vista(...args);
  };

  const rutas = [
    [/^\/eventos$/, (_, p) => vistaEventos(p)],
    [/^\/evento\/(\d+)$/, (m) => vistaEvento(Number(m[1]))],
    [/^\/login$/, vistaLogin],
    [/^\/registro$/, vistaRegistro],
    [/^\/mis-inscripciones$/, privada(null, vistaMisInscripciones)],
    [/^\/notificaciones$/, privada(null, vistaNotificaciones)],
    [/^\/organizador$/, privada(['organizador', 'administrador'], vistaOrganizador)],
    [/^\/organizador\/nuevo$/, privada(['organizador', 'administrador'], () => vistaEditarEvento(null))],
    [/^\/organizador\/editar\/(\d+)$/, privada(['organizador', 'administrador'], (m) => vistaEditarEvento(Number(m[1])))],
    [/^\/organizador\/participantes\/(\d+)$/, privada(['organizador', 'administrador'], (m) => vistaParticipantes(Number(m[1])))],
    [/^\/admin$/, privada(['administrador'], vistaAdmin)],
  ];

  async function enrutar() {
    pintarMenu();
    const [ruta, query = ''] = (location.hash.slice(1) || '/eventos').split('?');
    const params = new URLSearchParams(query);
    for (const [re, vista] of rutas) {
      const m = ruta.match(re);
      if (m) {
        try { await vista(m, params); } catch (err) {
          $app.innerHTML = `<p class="vacio">${esc(err.message)}</p>`;
        }
        return;
      }
    }
    ir('#/eventos');
  }

  window.addEventListener('hashchange', enrutar);
  enrutar();
})();
