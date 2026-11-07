/* Adaptador de lectura: no inicializa ni escribe el estado comprador. */
(function () {
  'use strict';
  var key = 'nexora.comprador.demo.v1';
  function day(value) { return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value + 'T12:00:00Z')) && new Date(value + 'T12:00:00Z').toISOString().slice(0, 10) === value; }
  function positive(value) { return Number.isFinite(value) && value > 0; }
  function crudo() { return window.NexoraShared ? window.NexoraShared.crudo() : sessionStorage.getItem(key); }
  function read(providerId) {
    var registry = window.NexoraProviders, data = window.NexoraData;
    if (!registry || !registry.byId(providerId) || !data || !data.products) return { ok: false, code: 'dependencies', message: 'No se pudo cargar la identidad o el catálogo compartido. Recarga esta página.' };
    var raw;
    try { raw = crudo(); } catch (error) { return { ok: false, code: 'storage', message: 'No se puede consultar el almacenamiento de sesión. Permite sessionStorage y vuelve a cargar.' }; }
    if (!raw) return { ok: false, code: 'missing', message: 'Todavía no existe un escenario disponible en esta pestaña. Regresa al acceso de tu rol para prepararlo. No se generaron datos desde esta consulta.' };
    try {
      var state = JSON.parse(raw);
      if (!state || state.version !== 3 || !day(state.baseDate) || !day(state.scenarioDate) || !Array.isArray(state.opps) || !Array.isArray(state.participations)) throw new Error('schema');
      var seen = new Set();
      state.opps.forEach(function (o) { if (!o || typeof o.id !== 'string' || seen.has(o.id)) throw new Error('opportunity IDs'); seen.add(o.id); });
      var own = state.opps.filter(function (o) { return registry.providerFor(o.id) === providerId; });
      var opportunities = own.map(function (o) {
        var p = Object.prototype.hasOwnProperty.call(data.products, o.product) ? data.products[o.product] : null;
        if (!p || typeof p.name !== 'string' || ['presentation','unit','zoneId','provider'].some(function (field) { return typeof o[field] !== 'string' || !o[field].trim(); }) || !day(o.closeDate) || !day(o.from) || !day(o.until) || o.from > o.until || !positive(o.lotQty) || !positive(o.priceJoint) || !Number.isInteger(o.interestedCount) || o.interestedCount < 0 || ['abierta', 'cerrada'].indexOf(o.status) === -1) throw new Error('opportunity fields');
        var active = state.participations.filter(function (r) { return r && r.opportunityId === o.id && r.status === 'Confirmada'; });
        var ids = new Set(), businesses = new Set();
        active.forEach(function (r) { if (typeof r.id !== 'string' || !r.id || ids.has(r.id) || typeof r.businessId !== 'string' || !r.businessId) throw new Error('participation fields'); ids.add(r.id); businesses.add(r.businessId); });
        var abierta = o.status !== 'cerrada' && o.closeDate >= state.scenarioDate, reglas = window.NexoraCompra, avance = reglas ? reglas.resumen(o, state.participations) : null, estado = reglas ? reglas.estadoVisible(o, state.participations, abierta, !!(window.NexoraAccounts && window.NexoraAccounts.proveedorSuspendido(providerId))) : null;
        // Cantidades por negocio: sin nombres hasta que la compra se confirma (D3).
        var confirmada = !!estado && estado.clave === 'confirmada';
        var cantidades = (o.participantesDemo || []).map(function (x) { return { qty: x.qty, zone: registry.zoneName(x.zoneId), name: confirmada ? x.nombre || null : null }; }).concat(active.map(function (r) { return { qty: r.snapshot ? r.snapshot.qty : null, zone: registry.zoneName(o.zoneId), name: confirmada ? r.business || null : null }; }));
        // Whitelist only public scenario fields. No needs, people, messages or participation records escape.
        return {
          id: o.id, providerId: providerId, provider: o.provider, hoy: state.scenarioDate,
          product: { id: o.product, name: p.name, icon: ['drop','cup','box'].indexOf(p.icon) === -1 ? 'box' : p.icon },
          presentation: o.presentation, unit: o.unit, zoneId: o.zoneId, zone: registry.zoneName(o.zoneId),
          closeDate: o.closeDate, from: o.from, until: o.until,
          status: o.status === 'cerrada' || o.closeDate < state.scenarioDate ? 'cerrada' : 'abierta',
          lotQty: o.lotQty, priceJoint: o.priceJoint, interestedCount: o.interestedCount,
          confirmedParticipations: active.length, confirmedBusinesses: businesses.size,
          total: avance ? avance.total : 0, minimo: avance ? avance.minimo : null, alcanzaMinimo: avance ? avance.alcanzaMinimo : false, faltaMinimo: avance ? avance.faltaMinimo : null, tramo: avance ? avance.tramo : 0, tramos: o.tramos || [], precioActual: avance ? avance.precio : o.priceJoint, siguienteTramo: avance ? avance.siguienteTramo : null,
          negocios: reglas ? reglas.negocios(o, state.participations) : businesses.size, estado: estado, cantidades: cantidades,
          entregaDesde: o.entregaDesde, entregaHasta: o.entregaHasta, entrega: reglas ? reglas.entregaTexto(o) : '', puntualidad: reglas ? reglas.puntualidad(o.provider) : null
        };
      });
      return { ok: true, baseDate: state.baseDate, scenarioDate: state.scenarioDate, opportunities: opportunities };
    } catch (error) {
      return { ok: false, code: 'incompatible', message: 'El escenario comprador no es compatible o contiene datos incompletos. Se conserva intacto: no se migró, reinició ni sobrescribió. Revisa el escenario desde Comprador.' };
    }
  }
  function conversations(providerId) {
    var source = read(providerId); if (!source.ok) return source;
    try {
      var state = JSON.parse(crudo()), messaging = state.messaging;
      if (!messaging || messaging.version !== 1 || !Array.isArray(messaging.conversations) || !Array.isArray(messaging.messages)) throw new Error('messaging');
      var own = messaging.conversations.filter(function (c) { return c && source.opportunities.some(function (o) { return o.id === c.opportunityId; }); });
      var items = own.map(function (c) {
        if (typeof c.id !== 'string' || typeof c.createdAt !== 'string') throw new Error('conversation');
        return { id: c.id, opportunityId: c.opportunityId, createdAt: c.createdAt, messages: messaging.messages.filter(function (m) { return m && m.conversationId === c.id; }).map(function (m) {
          if (typeof m.text !== 'string' || typeof m.createdAt !== 'string' || ['sent','received'].indexOf(m.direction) === -1) throw new Error('message');
          return { id: m.id, text: m.text, createdAt: m.createdAt, unread: m.direction === 'sent' && !m.leidoProveedorAt, author: m.direction === 'sent' ? 'Comprador (demo)' : 'Proveedor (simulación existente)' };
        }) };
      });
      return { ok: true, items: items, opportunities: source.opportunities };
    } catch (error) { return { ok: false, message: 'No se pudo consultar el historial de mensajes. Se conservan los datos existentes.' }; }
  }
  function markRead(providerId, id) {
    if (!window.NexoraShared || !window.NexoraShared.activo() || providerId !== 'PROV-DEMO-ANDINA') return;
    var history = conversations(providerId);
    if (!history.ok || !history.items.some(function (c) { return c.id === id && c.messages.some(function (m) { return m.unread; }); })) return;
    window.NexoraShared.transaccion(function (s) { s.messaging.messages.forEach(function (m) { if (m.conversationId === id && m.direction === 'sent' && !m.leidoProveedorAt) m.leidoProveedorAt = new Date().toISOString(); }); });
  }
  // Quién se unió o se retiró de mis compras, sin nombres.
  function movimientos(providerId) {
    var source = read(providerId); if (!source.ok) return [];
    try {
      var lista = [];
      JSON.parse(crudo()).participations.forEach(function (p) {
        var o = source.opportunities.find(function (x) { return x.id === p.opportunityId; }); if (!o) return;
        var qty = p.snapshot ? p.snapshot.qty : null;
        lista.push({ id: 'union:' + p.id, tipo: 'union', opportunityId: o.id, product: o.product.name, qty: qty, unit: o.unit, at: p.confirmedAt });
        if (p.status === 'Retirada') lista.push({ id: 'retiro:' + p.id, tipo: 'retiro', opportunityId: o.id, product: o.product.name, qty: qty, unit: o.unit, at: p.withdrawnAt });
      });
      return lista.sort(function (a, b) { return String(b.at).localeCompare(String(a.at)); }).slice(0, 12);
    } catch (error) { return []; }
  }
  window.NexoraScenarioRead = Object.freeze({ movimientos: movimientos, markRead: markRead, crudo: crudo, read: read, conversations: conversations });
})();
