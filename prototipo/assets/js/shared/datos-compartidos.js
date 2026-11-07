/* Datos de la demo compartidos entre pestañas del mismo navegador.
   Lo común (compras, participaciones, mensajes) va en una clave; lo privado de cada negocio, en otra.
   El rol sigue por pestaña en sessionStorage. Si localStorage falla, la pestaña sigue sola con su sessionStorage. */
(function () {
  'use strict';
  var COMPARTIDO = 'nexora.demo.compartido.v1', EPOCA = 'nexora.demo.epoca.v1', EPOCA_PESTANA = 'nexora.demo.epocaPestana.v1';
  var ESCENARIO_PESTANA = 'nexora.comprador.demo.v1', SOLO_PESTANA = 'nexora.demo.soloPestana.v1', CUENTA_ACTIVA = 'nexora.demo.cuentaActiva.v1';
  var PROVEEDOR = 'nexora.proveedor.demo.v1', ADMINISTRADOR = 'nexora.administrador.demo.v1', ESTADOS_CUENTA = 'nexora.demo.estados.v1';
  var NEGOCIO = 'nexora.demo.negocio.', TITULAR = 'NEG-DEMO-ROSITA', INTENTOS = 5;
  var PRIVADOS = ['user', 'profileVersion', 'needs', 'orders', 'selections', 'notifs', 'msgs', 'descartes'];
  var almacenLocal;

  function sesion() { return window.sessionStorage || sessionStorage; }
  function local() {
    if (almacenLocal !== undefined) return almacenLocal;
    try { var s = window.localStorage, prueba = 'nexora.demo.prueba'; s.setItem(prueba, '1'); s.removeItem(prueba); almacenLocal = s; }
    catch (error) { almacenLocal = null; }
    return almacenLocal;
  }
  function soloPestana() { try { return sesion().getItem(SOLO_PESTANA) === '1'; } catch (error) { return true; } }
  function activo() { return !window.NexoraScenario && !!local() && !soloPestana(); }
  function pasarASoloPestana() { almacenLocal = null; try { sesion().setItem(SOLO_PESTANA, '1'); } catch (error) { /* sin sesión tampoco hay más que hacer */ } aviso('nexora-solo-pestana', 'Esta pestaña funciona sola: tus cambios no llegan a las otras.'); }
  function claveNegocio(id) { return NEGOCIO + id + '.v1'; }
  function copia(valor) { return JSON.parse(JSON.stringify(valor)); }
  function leer(clave) {
    var crudo = local().getItem(clave);
    return crudo ? JSON.parse(crudo) : null;
  }
  function negocioActivo() {
    try { var c = JSON.parse(sesion().getItem(CUENTA_ACTIVA) || 'null'); if (c && typeof c.id === 'string' && c.id) return c.id; } catch (error) { /* usa el titular */ }
    return TITULAR;
  }
  function nuevaEpoca() { return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8); }

  function dividir(estado) {
    var privado = { version: 1, rev: estado.revPrivado || 0, drafts: estado.messaging.drafts || {} };
    PRIVADOS.forEach(function (k) { privado[k] = estado[k]; });
    return {
      compartido: { version: 1, rev: estado.rev || 0, baseDate: estado.baseDate, scenarioDate: estado.scenarioDate, opps: estado.opps, participations: estado.participations,
        messaging: { version: estado.messaging.version, conversations: estado.messaging.conversations, messages: estado.messaging.messages } },
      privado: privado
    };
  }
  function componer(c, p) {
    var opps = c.opps.some(function (o) { return !o.entregaHasta; }) && window.NexoraScenarioSeed ? window.NexoraScenarioSeed.enrich(c.opps, c.baseDate) : c.opps; // escenario anterior a las fechas de entrega
    var estado = { version: 3, rev: c.rev, revPrivado: p.rev, baseDate: c.baseDate, scenarioDate: c.scenarioDate, opps: opps, participations: c.participations,
      messaging: { version: c.messaging.version, conversations: c.messaging.conversations, messages: c.messaging.messages, drafts: p.drafts || {} } };
    PRIVADOS.forEach(function (k) { estado[k] = p[k]; });
    return estado;
  }
  function privadoVacio() {
    var d = window.NexoraData;
    return { version: 1, rev: 0, drafts: {}, user: Object.assign({ id: TITULAR }, copia(d.user)), profileVersion: 1, needs: [], orders: [], selections: {}, notifs: [], msgs: [], descartes: [] };
  }

  // Leer lo último → aplicar → guardar. Si otra pestaña escribió en medio, se repite sobre lo nuevo; nunca se pisa.
  function transaccion(cambio) {
    for (var i = 0; i < INTENTOS; i++) {
      var actual = leer(COMPARTIDO), rev = actual ? actual.rev : 0;
      if (cambio(actual || null) === false) return false;
      var ultimo = leer(COMPARTIDO);
      if ((ultimo ? ultimo.rev : 0) !== rev || !actual) { if (!actual) return false; continue; }
      actual.rev = rev + 1;
      local().setItem(COMPARTIDO, JSON.stringify(actual));
      return true;
    }
    return false;
  }

  // Guarda un estado completo solo si se calculó sobre lo último. Devuelve 'ok', 'conflicto' o 'sin-almacen'.
  function guardar(estado) {
    var partes = dividir(estado), clave = claveNegocio(estado.user.id), anteriorC, anteriorP;
    try {
      anteriorC = local().getItem(COMPARTIDO); anteriorP = local().getItem(clave);
      var c = anteriorC ? JSON.parse(anteriorC) : null, p = anteriorP ? JSON.parse(anteriorP) : null;
      if (!c || c.rev !== partes.compartido.rev || (p ? p.rev : 0) !== partes.privado.rev) return 'conflicto';
      var cambioComun = JSON.stringify(c) !== JSON.stringify(partes.compartido);
      partes.privado.rev++;
      if (cambioComun) { partes.compartido.rev++; local().setItem(COMPARTIDO, JSON.stringify(partes.compartido)); }
      try { local().setItem(clave, JSON.stringify(partes.privado)); }
      catch (error) { if (cambioComun) local().setItem(COMPARTIDO, anteriorC); throw error; }
      estado.rev = partes.compartido.rev; estado.revPrivado = partes.privado.rev;
      return 'ok';
    } catch (error) { return 'sin-almacen'; }
  }

  // Crea lo compartido y lo privado del titular si aún no existen. Consultar nunca siembra; esto solo lo llama el acceso.
  function asegurar() {
    var c = leer(COMPARTIDO); if (c) return c;
    var s = window.NexoraScenarioSeed.create({ sinCuenta: true }), partes = dividir(s);
    partes.compartido.rev = 1; partes.privado.rev = 1;
    local().setItem(COMPARTIDO, JSON.stringify(partes.compartido));
    local().setItem(claveNegocio(s.user.id), JSON.stringify(partes.privado));
    if (!local().getItem(EPOCA)) local().setItem(EPOCA, nuevaEpoca());
    return partes.compartido;
  }
  // Primer ingreso de un negocio: sus pedidos de ejemplo. Lo compartido no cambia.
  function crearPrivado(id, c) {
    var partes = dividir(window.NexoraScenarioSeed.create({ base: c.baseDate, sinCuenta: id === TITULAR }));
    partes.privado.rev = 1; partes.privado.user.id = id;
    local().setItem(claveNegocio(id), JSON.stringify(partes.privado));
    return partes.privado;
  }
  // Estado completo de un negocio para su store.
  function estado(id) {
    id = id || negocioActivo();
    var c = asegurar(), p = leer(claveNegocio(id)) || crearPrivado(id, c);
    migrarMensajesProveedor();
    return componer(leer(COMPARTIDO), p);
  }
  // Lectura para quien no es el negocio (proveedor, admin, validación del acceso). No siembra.
  function crudo() {
    if (!activo()) return sesion().getItem(ESCENARIO_PESTANA);
    migrar();
    var c = leer(COMPARTIDO); if (!c) return null;
    migrarMensajesProveedor(); c = leer(COMPARTIDO);
    return JSON.stringify(componer(c, leer(claveNegocio(TITULAR)) || privadoVacio()));
  }

  // Migración idempotente: conserva la clave original y los IDs de respuestas anteriores.
  function migrarMensajesProveedor() {
    var raw = local().getItem(PROVEEDOR), viejo;
    try { viejo = JSON.parse(raw || 'null'); } catch (e) { return; }
    if (!viejo || !Array.isArray(viejo.messages)) return;
    var c = leer(COMPARTIDO);
    var pendientes = viejo.messages.filter(function (m) { return m.providerId === 'PROV-DEMO-ANDINA' && typeof m.text === 'string' && Number.isFinite(Date.parse(m.createdAt)) && c.messaging.conversations.some(function (x) { return x.id === m.conversationId; }) && !c.messaging.messages.some(function (x) { return x.id === m.id; }); });
    if (!pendientes.length) return;
    transaccion(function (state) { pendientes.forEach(function (m) {
      if (!state.messaging.messages.some(function (x) { return x.id === m.id; })) state.messaging.messages.push(Object.assign({}, m, { direction: 'received', autorRol: 'proveedor', autorId: m.providerId, readAt: null, simulation: true }));
    }); });
  }

  function unir(base, extra) {
    (extra || []).forEach(function (item) { if (item && !base.some(function (x) { return x.id === item.id; })) base.push(item); });
    return base;
  }
  // Lleva a lo compartido una sesión abierta antes de esta etapa, sin perder lo que ya hicieron otras pestañas.
  function adoptar(viejo, crudoAnterior) {
    var partes = dividir(viejo), clave = claveNegocio(viejo.user.id), p = leer(clave);
    if (!leer(COMPARTIDO)) { partes.compartido.rev = 1; local().setItem(COMPARTIDO, JSON.stringify(partes.compartido)); }
    else transaccion(function (c) {
      unir(c.participations, partes.compartido.participations);
      unir(c.messaging.conversations, partes.compartido.messaging.conversations);
      unir(c.messaging.messages, partes.compartido.messaging.messages);
      partes.compartido.opps.forEach(function (o) {
        var destino = c.opps.find(function (x) { return x.id === o.id; }); if (!destino) { c.opps.push(o); return; }
        ['notices', 'questions', 'avisosInternos'].forEach(function (k) { if (o[k]) destino[k] = unir(destino[k] || [], o[k]); });
      });
    });
    if (!p) { partes.privado.rev = 1; local().setItem(clave, JSON.stringify(partes.privado)); }
    else { unir(p.needs, partes.privado.needs); unir(p.orders, partes.privado.orders); p.rev++; local().setItem(clave, JSON.stringify(p)); }
    if (!local().getItem(EPOCA)) local().setItem(EPOCA, nuevaEpoca());
    sesion().setItem(ESCENARIO_PESTANA + '.migrado-etapa1', crudoAnterior);
    sesion().removeItem(ESCENARIO_PESTANA);
  }
  // Una sesión que no se pudo leer se aparta intacta: ni se usa ni se borra.
  function apartarSesion() {
    var raw = sesion().getItem(ESCENARIO_PESTANA); if (raw === null) return;
    sesion().setItem(ESCENARIO_PESTANA + '.no-migrado', raw); sesion().removeItem(ESCENARIO_PESTANA);
  }
  function moverClave(clave) {
    var raw = sesion().getItem(clave); if (raw === null) return;
    if (local().getItem(clave) === null) local().setItem(clave, raw); else sesion().setItem(clave + '.no-migrado', raw);
    sesion().removeItem(clave);
  }
  function migrar() {
    try {
      moverClave(PROVEEDOR); moverClave(ADMINISTRADOR);
      var raw = sesion().getItem(ESCENARIO_PESTANA); if (raw === null) return;
      var viejo = JSON.parse(raw);
      if (window.NexoraScenarioSeed && window.NexoraScenarioSeed.validate(viejo)) adoptar(viejo, raw);
    } catch (error) { /* la sesión anterior se conserva; el store del comprador decide */ }
  }

  // Restablecer de una cuenta: vuelven sus pedidos de ejemplo y se quita solo lo suyo de lo compartido.
  function reiniciarNegocio(id, vacio) {
    try {
      var hecho = transaccion(function (c) {
        var propias = c.messaging.conversations.filter(function (x) { return x.businessId === id; }).map(function (x) { return x.id; });
        c.participations = c.participations.filter(function (p) { return p.businessId !== id; });
        c.messaging.conversations = c.messaging.conversations.filter(function (x) { return x.businessId !== id; });
        c.messaging.messages = c.messaging.messages.filter(function (m) { return propias.indexOf(m.conversationId) === -1; });
        if (id === TITULAR) {
          var inicial = window.NexoraScenarioSeed.messaging(TITULAR, c.baseDate, window.NexoraData.msgs);
          c.messaging.conversations = c.messaging.conversations.concat(inicial.conversations);
          c.messaging.messages = c.messaging.messages.concat(inicial.messages);
        }
      });
      if (!hecho) return false;
      var p = crearPrivado(id, leer(COMPARTIDO));
      if (vacio) { p.needs = []; p.orders = []; local().setItem(claveNegocio(id), JSON.stringify(p)); }
      return true;
    } catch (error) { return false; }
  }
  // Limpia todo lo de la demo en esta pestaña: rol, cuenta activa, filtros y copias.
  function limpiarPestana() {
    var s = sesion(), claves = [];
    for (var i = 0; i < s.length; i++) if (String(s.key(i)).indexOf('nexora.') === 0) claves.push(s.key(i));
    claves.forEach(function (k) { s.removeItem(k); });
  }
  // Restablecer demo: borra lo compartido y lo privado de todos. La época nueva avisa a las demás pestañas.
  function restablecerTodo() {
    try {
      if (activo()) {
        var l = local(), claves = [];
        for (var i = 0; i < l.length; i++) {
          var k = String(l.key(i));
          if (k === COMPARTIDO || k === PROVEEDOR || k === ADMINISTRADOR || k === ESTADOS_CUENTA || k === 'nexora.demo.cuentas.v1' || k === 'nexora.comprador.bienvenida' || k.indexOf(NEGOCIO) === 0) claves.push(k);
        }
        claves.forEach(function (x) { l.removeItem(x); });
        l.setItem(EPOCA, nuevaEpoca());
      }
      limpiarPestana();
      return '';
    } catch (error) { return 'No se pudo restablecer la demo. Inténtalo de nuevo.'; }
  }
  function restablecerYSalir() { var problema = restablecerTodo(); if (!problema) location.reload(); return problema; }
  // Una pestaña que quedó de una demo anterior vuelve al acceso.
  var epocaConocida = null;
  function verificarEpoca() {
    try {
      if (!activo()) return;
      var actual = local().getItem(EPOCA), propia = sesion().getItem(EPOCA_PESTANA);
      if (actual && propia && actual !== propia) limpiarPestana();
      if (actual) sesion().setItem(EPOCA_PESTANA, actual);
      epocaConocida = actual;
    } catch (error) { /* sin almacenamiento no hay nada que verificar */ }
  }
  verificarEpoca();

  // Almacén para los datos privados de proveedor y admin: el común si está disponible; si no, el de la pestaña.
  var almacen = {
    getItem: function (clave) { if (activo()) { moverClave(clave); return local().getItem(clave); } return sesion().getItem(clave); },
    setItem: function (clave, valor) {
      if (activo()) { try { local().setItem(clave, valor); return; } catch (error) { pasarASoloPestana(); } }
      sesion().setItem(clave, valor);
    },
    removeItem: function (clave) { if (activo()) local().removeItem(clave); else sesion().removeItem(clave); }
  };

  // Otra pestaña cambió datos: se actualiza lo que hay en memoria y se repinta, salvo que estés escribiendo.
  var refrescos = [], tocados = [], iniciales = new WeakMap(), espera = null;
  function valor(el) { return el.type === 'checkbox' || el.type === 'radio' ? el.checked : el.value; }
  function editable(el) { return !!el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName || '') || el.isContentEditable === true) && ['hidden', 'button', 'submit', 'reset'].indexOf(el.type) === -1; }
  function esFiltro(el) { return el.type === 'search' || el.tagName === 'SELECT' || /search|filtro|filter/i.test(el.id || ''); }
  function ocupado() {
    if (typeof document === 'undefined') return false;
    var foco = document.activeElement;
    if (editable(foco) && valor(foco)) return true; // un campo vacío con el cursor no retiene el repintado
    if (document.querySelector('dialog[open],[role="alertdialog"],[aria-modal="true"]:not([hidden]),[data-edicion]:not([hidden])')) return true;
    tocados = tocados.filter(function (el) { return el.isConnected !== false; });
    return tocados.some(function (el) { return !esFiltro(el) && valor(el) !== iniciales.get(el); });
  }
  function aviso(id, texto) {
    if (typeof document === 'undefined' || !document.body || !document.createElement) return;
    var el = document.getElementById(id);
    if (!el) {
      el = document.createElement('p'); el.id = id; el.setAttribute('role', 'status');
      el.style.cssText = 'position:fixed;left:16px;bottom:84px;z-index:60;margin:0;padding:8px 12px;max-width:min(320px,calc(100vw - 32px));border-radius:10px;background:#1f2430;color:#fff;font-size:13px;line-height:1.35;box-shadow:0 4px 14px rgba(0,0,0,.2)';
      document.body.appendChild(el);
    }
    el.textContent = texto; el.hidden = false;
  }
  function ocultarAviso(id) { var el = typeof document === 'undefined' ? null : document.getElementById(id); if (el) el.hidden = true; }
  function aplicar() {
    espera = null;
    refrescos.forEach(function (refrescar) { try { refrescar(); } catch (error) { /* la pantalla actual sigue visible */ } });
    var editor = typeof document === 'undefined' ? null : document.getElementById('message-text') || document.getElementById('ms-message');
    var borrador = editor && { id: editor.id, value: editor.value, start: editor.selectionStart, end: editor.selectionEnd, focus: document.activeElement === editor };
    if (ocupado() && !editor) { aviso('nexora-novedades', 'Hay novedades. Se mostrarán al terminar de escribir.'); espera = setTimeout(aplicar, 1500); return; }
    ocultarAviso('nexora-novedades');
    var evento = new Event('nexora-demo-change'); evento.detail = { reason: 'sync' }; window.dispatchEvent(evento);
    if (borrador) {
      var nuevo = document.getElementById(borrador.id);
      if (nuevo) { nuevo.value = borrador.value; if (borrador.focus) { nuevo.focus(); if (nuevo.setSelectionRange) nuevo.setSelectionRange(borrador.start, borrador.end); } }
    }
  }
  function programar() { if (espera === null) espera = setTimeout(aplicar, 60); }
  function esDeDatos(clave) { return clave === COMPARTIDO || clave === PROVEEDOR || clave === ADMINISTRADOR || clave === ESTADOS_CUENTA || clave === 'nexora.demo.cuentas.v1' || String(clave).indexOf(NEGOCIO) === 0; }
  if (window.addEventListener) {
    window.addEventListener('storage', function (e) {
      if (!activo()) return;
      if (e.key === EPOCA && e.newValue) {
        // La primera época (se crea al preparar la demo) solo se adopta; un cambio real de época es un restablecimiento.
        if (epocaConocida && e.newValue !== epocaConocida) { limpiarPestana(); location.reload(); return; }
        epocaConocida = e.newValue; try { sesion().setItem(EPOCA_PESTANA, e.newValue); } catch (error) { /* sin sesión no hay marca */ }
        return;
      }
      if (e.newValue !== null && esDeDatos(e.key)) programar();
    });
    window.addEventListener('pageshow', function (e) { if (e.persisted && activo()) programar(); });
  }
  if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('focusin', function (e) { var el = e.target; if (editable(el) && !iniciales.has(el)) { iniciales.set(el, valor(el)); tocados.push(el); } }, true);
    document.addEventListener('submit', function (e) {
      var form = e.target;
      setTimeout(function () { if (form.querySelector && form.querySelector('[aria-invalid="true"]')) return; tocados.forEach(function (el) { if (form.contains && form.contains(el)) iniciales.set(el, valor(el)); }); }, 0);
    }, true);
    document.addEventListener('DOMContentLoaded', function () { if (!window.NexoraScenario && !activo()) aviso('nexora-solo-pestana', 'Esta pestaña funciona sola: tus cambios no llegan a las otras.'); });
  }

  window.NexoraShared = { reiniciarNegocio: reiniciarNegocio, restablecerTodo: restablecerTodo, restablecerYSalir: restablecerYSalir, alCambiar: function (fn) { refrescos.push(fn); }, ocupado: ocupado, activo: activo, transaccion: transaccion, guardar: guardar, asegurar: asegurar, estado: estado, crudo: crudo, adoptar: adoptar, apartarSesion: apartarSesion, migrar: migrar, negocioActivo: negocioActivo, pasarASoloPestana: pasarASoloPestana, almacen: almacen, claveNegocio: claveNegocio };
})();
