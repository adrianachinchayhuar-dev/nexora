/* Cuentas de rol de la demo: proveedores registrados y su aprobación, y la suspensión de proveedores y compradores.
   Una sola clave compartida (con `rev`); toda escritura relee lo último, aplica y guarda. Las contraseñas nunca se guardan
   en texto plano: sal + SHA-256, como en las cuentas de compradores. Es una simulación, no seguridad real. */
(function () {
  'use strict';
  var KEY = 'nexora.demo.estados.v1', INTENTOS = 5;
  var DEMO_PROVEEDORES = ['PROV-DEMO-ANDINA', 'PROV-DEMO-LIMA-SUR'];
  var DEMO_ACCESO = { email: 'proveedor@nexora.example', password: 'NexoraProveedor', id: 'PROV-DEMO-ANDINA' };
  var ETIQUETA = { en_revision: 'En revisión', aprobada: 'Aprobada', rechazada: 'Rechazada', suspendida: 'Suspendida', activa: 'Activa' };
  var TRANSICIONES = {
    proveedor: { en_revision: ['aprobada', 'rechazada'], aprobada: ['suspendida'], suspendida: ['aprobada'], rechazada: ['aprobada'] },
    negocio: { activa: ['suspendida'], suspendida: ['activa'] }
  };
  var CON_MOTIVO = ['rechazada', 'suspendida'];

  function almacen() { return window.NexoraShared ? window.NexoraShared.almacen : window.sessionStorage || sessionStorage; }
  function vacio() { return { version: 1, rev: 0, proveedores: [], estados: {}, historial: [] }; }
  function leer() {
    var crudo;
    try { crudo = almacen().getItem(KEY); } catch (error) { return { error: 'No se pudo consultar el estado de las cuentas. Permite el almacenamiento e inténtalo de nuevo.' }; }
    if (!crudo) return { state: vacio() };
    try {
      var s = JSON.parse(crudo);
      if (!s || s.version !== 1 || !Number.isSafeInteger(s.rev) || !Array.isArray(s.proveedores) || !Array.isArray(s.historial) || !s.estados || typeof s.estados !== 'object' || Array.isArray(s.estados)) throw new Error('schema');
      return { state: s };
    } catch (error) { return { error: 'El estado de las cuentas no es compatible. Se conserva sin cambios.' }; }
  }
  // Leer lo último → aplicar → guardar. Si otra pestaña escribió en medio, se repite sobre lo nuevo.
  function escribir(cambio) {
    for (var i = 0; i < INTENTOS; i++) {
      var actual = leer(); if (actual.error) return actual;
      var rev = actual.state.rev, resultado = cambio(actual.state);
      if (resultado && resultado.error) return resultado;
      var ultimo = leer(); if (ultimo.error) return ultimo;
      if (ultimo.state.rev !== rev) continue;
      actual.state.rev = rev + 1;
      try { almacen().setItem(KEY, JSON.stringify(actual.state)); } catch (error) { return { error: 'No se pudo guardar. El estado anterior se conserva; puedes volver a intentarlo.' }; }
      return resultado || {};
    }
    return { error: 'Otra pestaña cambió estos datos. Inténtalo de nuevo.' };
  }
  function hex(n) { var a = new Uint8Array(n); window.crypto.getRandomValues(a); return Array.prototype.map.call(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join(''); }
  function sha256(texto) {
    if (!window.crypto || !window.crypto.subtle) return Promise.reject(new Error('crypto'));
    return window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto)).then(function (buf) { return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join(''); });
  }
  function tipoDe(id) { return /^PROV-/.test(String(id)) ? 'proveedor' : 'negocio'; }
  function esDemo(id) { return DEMO_PROVEEDORES.indexOf(id) !== -1; }
  function copia(v) { return JSON.parse(JSON.stringify(v)); }

  // Estado de una cuenta: { estado, motivo }. Un proveedor desconocido nunca cuenta como aprobado.
  function estadoDe(id, estado) {
    var r = estado ? { state: estado } : leer(), s = r.state;
    if (s) {
      var p = s.proveedores.find(function (x) { return x.id === id; });
      if (p) return { estado: p.estado, motivo: p.motivo || '' };
      var o = Object.prototype.hasOwnProperty.call(s.estados, id) ? s.estados[id] : null;
      if (o) return { estado: o.estado, motivo: o.motivo || '' };
    }
    if (tipoDe(id) === 'proveedor') return { estado: esDemo(id) ? 'aprobada' : 'inexistente', motivo: '' };
    return { estado: 'activa', motivo: '' };
  }
  function proveedorSuspendido(id) { return !!id && estadoDe(id).estado === 'suspendida'; }
  function proveedor(id) {
    var r = leer(); if (r.error) return null;
    return r.state.proveedores.find(function (x) { return x.id === id; }) || null;
  }
  // Para las pantallas: sin hash ni sal.
  function publico(p) { return { id: p.id, razonSocial: p.razonSocial, ruc: p.ruc, contacto: p.contacto, phone: p.phone, email: p.email, zonas: p.zonas.slice(), estado: p.estado, motivo: p.motivo || '', creadoAt: p.creadoAt, revisadoAt: p.revisadoAt || null }; }
  function lista() {
    var r = leer(); if (r.error) return { error: r.error, items: [] };
    var orden = { en_revision: 0, aprobada: 1, suspendida: 2, rechazada: 3 };
    return { items: r.state.proveedores.map(publico).sort(function (a, b) { return (orden[a.estado] - orden[b.estado]) || String(b.creadoAt).localeCompare(String(a.creadoAt)); }) };
  }
  function pendientes() { var l = lista(); return l.items.filter(function (p) { return p.estado === 'en_revision'; }).length; }

  function validar(d) {
    var t = function (v) { return String(v == null ? '' : v).trim(); };
    if (t(d.razonSocial).length < 2 || t(d.razonSocial).length > 100) return 'Escribe la razón social (2 a 100 letras).';
    if (!/^\d{11}$/.test(t(d.ruc))) return 'El RUC tiene 11 dígitos.';
    if (t(d.contacto).length < 2 || t(d.contacto).length > 60) return 'Escribe el nombre de contacto (2 a 60 letras).';
    if (!/^9\d{8}$/.test(t(d.phone).replace(/\s/g, ''))) return 'El celular tiene 9 dígitos y empieza con 9.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t(d.email))) return 'Escribe un correo válido, como nombre@empresa.com.';
    if (String(d.password || '').length < 8) return 'La contraseña necesita al menos 8 caracteres.';
    if (!Array.isArray(d.zonas) || !d.zonas.length || d.zonas.some(function (z) { return !window.NexoraProviders || !window.NexoraProviders.zonaValida(z); })) return 'Elige al menos una zona que atiendes.';
    if (d.terminos !== true) return 'Acepta los términos para continuar.';
    return '';
  }
  // Registro: la cuenta queda «En revisión». Devuelve una promesa con '' o el mensaje de error, y el id en `ultimoId`.
  function registrarProveedor(d) {
    var problema = validar(d); if (problema) return Promise.resolve({ error: problema });
    var email = String(d.email).trim().toLowerCase(), salt;
    try { salt = hex(8); } catch (error) { return Promise.resolve({ error: 'Este navegador no permite crear la cuenta de la demo.' }); }
    return sha256(salt + d.password).then(function (hash) {
      var resultado = escribir(function (s) {
        if (email === DEMO_ACCESO.email || s.proveedores.some(function (p) { return p.email === email; })) return { error: 'Ya existe una cuenta con ese correo. Inicia sesión.' };
        if (s.proveedores.some(function (p) { return p.ruc === String(d.ruc).trim(); })) return { error: 'Ese RUC ya está registrado. Inicia sesión.' };
        var id = 'PROV-' + hex(4).toUpperCase();
        s.proveedores.push({ id: id, razonSocial: String(d.razonSocial).trim(), ruc: String(d.ruc).trim(), contacto: String(d.contacto).trim(), phone: String(d.phone).replace(/\s/g, ''), email: email, salt: salt, hash: hash, zonas: d.zonas.slice(), estado: 'en_revision', motivo: '', creadoAt: new Date().toISOString(), revisadoAt: null });
        return { id: id };
      });
      return resultado;
    }, function () { return { error: 'Este navegador no permite crear la cuenta de la demo.' }; });
  }
  var MAL = 'Credenciales incorrectas. Revisa tu correo y contraseña.';
  function entrarProveedor(email, password) {
    email = String(email || '').trim().toLowerCase();
    if (email === DEMO_ACCESO.email) return Promise.resolve(password === DEMO_ACCESO.password ? { id: DEMO_ACCESO.id } : { error: MAL });
    var r = leer(); if (r.error) return Promise.resolve({ error: r.error });
    var cuenta = r.state.proveedores.find(function (p) { return p.email === email; });
    if (!cuenta) return Promise.resolve({ error: MAL });
    return sha256(cuenta.salt + password).then(function (hash) { return hash === cuenta.hash ? { id: cuenta.id } : { error: MAL }; }, function () { return { error: 'Este navegador no permite iniciar sesión en la demo.' }; });
  }

  // Compradores creados en el registro (nexora.demo.cuentas.v1); solo nombre e id, para que el admin pueda suspenderlos.
  function compradores() {
    try {
      var crudo = (window.localStorage || {}).getItem && window.localStorage.getItem('nexora.demo.cuentas.v1'), l = crudo ? JSON.parse(crudo) : [];
      return Array.isArray(l) ? l.filter(function (c) { return c && typeof c.id === 'string'; }).map(function (c) { return { id: c.id, name: c.business || 'Negocio sin nombre' }; }) : [];
    } catch (error) { return []; }
  }

  function nombreDe(id, s) {
    var p = s.proveedores.find(function (x) { return x.id === id; }); if (p) return p.razonSocial;
    var d = window.NexoraProviders && window.NexoraProviders.byId(id); if (d) return d.name;
    var c = compradores().find(function (x) { return x.id === id; }); return c ? c.name : id;
  }
  function permitidas(tipo, actual) { return (TRANSICIONES[tipo] && TRANSICIONES[tipo][actual]) || []; }
  function revisar(id, siguiente, motivo, administrador, nombre) {
    var texto = String(motivo == null ? '' : motivo).replace(/\s+/g, ' ').trim();
    if (CON_MOTIVO.indexOf(siguiente) !== -1 && (texto.length < 3 || texto.length > 200)) return { error: 'Escribe el motivo en pocas palabras (3 a 200 letras).' };
    var resultado = escribir(function (s) {
      var previo = estadoDe(id, s).estado, tipo = tipoDe(id);
      if (previo === 'inexistente') return { error: 'La cuenta ya no existe. Vuelve a consultar.' };
      if (permitidas(tipo, previo).indexOf(siguiente) === -1) return { error: 'La acción ya fue realizada o no corresponde al estado actual.' };
      var ahora = new Date().toISOString(), cuenta = s.proveedores.find(function (x) { return x.id === id; }), guardado = CON_MOTIVO.indexOf(siguiente) !== -1 ? texto : '';
      if (cuenta) { cuenta.estado = siguiente; cuenta.motivo = guardado; cuenta.revisadoAt = ahora; }
      else s.estados[id] = { estado: siguiente, motivo: guardado, at: ahora };
      s.historial.push({ id: 'EV-' + Date.now().toString(36) + '-' + s.historial.length, tipo: tipo, objetivo: id, nombre: nombre || nombreDe(id, s), previo: previo, nuevo: siguiente, motivo: guardado, at: ahora, administratorId: administrador || 'ADMIN-DEMO-NEXORA' });
      return { previo: previo, nuevo: siguiente };
    });
    return resultado;
  }
  function historial() { var r = leer(); return r.error ? { error: r.error } : { items: copia(r.state.historial) }; }

  window.NexoraAccounts = { clave: KEY, etiqueta: function (e) { return ETIQUETA[e] || e; }, etiquetas: ETIQUETA, estadoDe: estadoDe, proveedorSuspendido: proveedorSuspendido, proveedor: function (id) { var p = proveedor(id); return p ? publico(p) : null; }, lista: lista, pendientes: pendientes,
    registrarProveedor: registrarProveedor, entrarProveedor: entrarProveedor, compradores: compradores, permitidas: permitidas, tipoDe: tipoDe, revisar: revisar, historial: historial, validar: validar, demoAcceso: { email: DEMO_ACCESO.email, password: DEMO_ACCESO.password } };
})();
