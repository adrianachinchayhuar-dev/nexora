/* Decisiones administrativas sobre cuentas. Aprobar, rechazar, suspender y reactivar tienen efecto real en la demo:
   el estado vive en NexoraAccounts (compartido entre pestañas) y el historial se guarda en la misma escritura. */
(function () {
  'use strict';
  var CODIGOS = { 'En revisión': 'en_revision', Aprobada: 'aprobada', Rechazada: 'rechazada', Suspendida: 'suspendida', Activa: 'activa' };
  function cuentas() { return window.NexoraAccounts; }
  function etiqueta(codigo) { return cuentas().etiqueta(codigo); }
  function nombreZonas(ids) { return ids.map(function (z) { return window.NexoraProviders.zoneName(z).replace(/\s*\(demo\)/i, ''); }).join(', '); }
  function view() {
    if (!window.NexoraAdminSession.current()) return { error: 'Inicia la sesión administrativa para consultar o registrar decisiones.' };
    var A = cuentas(); if (!A) return { error: 'No se cargó el módulo de cuentas. Recarga esta pantalla.' };
    var l = A.lista(); if (l.error) return { error: l.error };
    var requests = l.items.map(function (p) {
      return { id: p.id, key: 'proveedor:' + p.id, type: 'proveedor', name: p.razonSocial, zone: nombreZonas(p.zonas), detail: 'Empresa proveedora registrada desde su acceso.', status: etiqueta(p.estado), estado: p.estado, motivo: p.motivo,
        datos: { ruc: p.ruc, contacto: p.contacto, phone: p.phone, email: p.email, zonas: nombreZonas(p.zonas), creadoAt: p.creadoAt, revisadoAt: p.revisadoAt } };
    });
    var source = window.NexoraAdminRead.users(), users = [];
    if (source.ok) {
      users = source.items.map(function (u) { return Object.assign({}, u); });
      A.compradores().forEach(function (c) { if (!users.some(function (u) { return u.id === c.id; })) users.push({ key: 'negocio:' + c.id, id: c.id, type: 'negocio', name: c.name, origin: 'Cuenta creada en el registro de compradores' }); });
      users.forEach(function (u) { var e = A.estadoDe(u.id); u.estado = e.estado; u.motivo = e.motivo; u.status = etiqueta(e.estado); });
    }
    return { requests: requests, users: users, pendientes: requests.filter(function (r) { return r.estado === 'en_revision'; }).length, sourceError: source.ok ? '' : source.message };
  }
  function filter(items, type, status) { return items.filter(function (r) { return (!type || r.type === type) && (!status || r.status === status); }); }
  function target(kind, id) {
    var current = view(); if (current.error) return current;
    var list = kind === 'request' ? current.requests : kind === 'moderation' ? current.users : [];
    var record = list.find(function (r) { return (kind === 'request' ? r.id : r.key) === id; });
    return record ? { record: record } : { error: current.sourceError || 'La solicitud o la cuenta no existe en esta vista.' };
  }
  function prepare(kind, id, next) {
    var result = target(kind, id); if (result.error) return result;
    var code = CODIGOS[next], tipo = result.record.type;
    if (!code || cuentas().permitidas(tipo, result.record.estado).indexOf(code) === -1) return { error: 'La acción ya fue realizada o no corresponde al estado actual.' };
    return { proposal: { kind: kind, id: id, accountId: result.record.id, type: tipo, previous: result.record.status, previousCode: result.record.estado, next: next, nextCode: code, name: result.record.name, needsReason: code === 'rechazada' || code === 'suspendida', motivo: '' } };
  }
  var MENSAJES = {
    aprobada: 'Proveedor aprobado. Ya puede entrar a su dashboard.',
    rechazada: 'Solicitud rechazada. El proveedor verá el motivo.',
    suspendida: { proveedor: 'Proveedor suspendido. Sus productos se ocultan y sus compras sin confirmar pasan a «No se concretó».', negocio: 'Negocio suspendido. No podrá entrar hasta que lo reactives.' },
    activa: 'Negocio reactivado.'
  };
  function confirm(proposal) {
    if (!proposal) return { error: 'Revisa y confirma primero una acción válida.' };
    var admin = window.NexoraAdminSession.current(); if (!admin) return { error: 'Inicia la sesión administrativa para consultar o registrar decisiones.' };
    var prepared = prepare(proposal.kind, proposal.id, proposal.next); if (prepared.error) return prepared;
    if (prepared.proposal.previousCode !== proposal.previousCode) return { error: 'El estado cambió. Revisa la información antes de confirmar nuevamente.' };
    var result = cuentas().revisar(proposal.accountId, proposal.nextCode, proposal.motivo, admin.id, proposal.name);
    if (result.error) return result;
    var text = MENSAJES[proposal.nextCode];
    return { message: typeof text === 'string' ? (proposal.nextCode === 'aprobada' && result.previo === 'suspendida' ? 'Proveedor reactivado. Ya puede volver a su dashboard.' : text) : text[proposal.type] };
  }
  function activity(type, status) {
    if (!window.NexoraAdminSession.current()) return { error: 'Inicia la sesión administrativa para consultar o registrar decisiones.' };
    var h = cuentas() ? cuentas().historial() : { error: 'No se cargó el módulo de cuentas.' }; if (h.error) return { error: h.error };
    try {
      var items = h.items.map(function (event, index) {
        if (!event || typeof event.id !== 'string' || typeof event.at !== 'string' || !Number.isFinite(Date.parse(event.at)) || !CODIGOS[etiqueta(event.nuevo)]) throw Error('event');
        var action = event.nuevo === 'rechazada' ? 'rechazo' : event.nuevo === 'suspendida' ? 'suspension' : event.nuevo === 'activa' || event.previo === 'suspendida' ? 'reactivacion' : 'aprobacion';
        return { action: action, id: event.objetivo, name: event.nombre, kind: event.tipo === 'proveedor' ? 'Proveedor' : 'Negocio', motivo: event.motivo || '', previous: etiqueta(event.previo), result: etiqueta(event.nuevo), at: event.at, administratorId: event.administratorId, position: index };
      });
      items.sort(function (a, b) { return Date.parse(b.at) - Date.parse(a.at) || b.position - a.position; });
      return { total: items.length, items: items.filter(function (e) { return (!type || e.action === type) && (!status || e.result === status); }) };
    } catch (e) { return { error: 'El historial administrativo contiene registros incompatibles. Se conserva intacto; no se reconstruyeron eventos.' }; }
  }
  window.NexoraAdminStore = { activity: activity, view: view, filter: filter, prepare: prepare, confirm: confirm, pendientes: function () { return cuentas() ? cuentas().pendientes() : 0; } };
})();
