/* Solo consulta. No carga inicializadores ni expone necesidades, mensajes o perfiles privados. */
(function () {
  'use strict';
  // Nombres de los negocios unidos a una compra: los reales primero y luego los simulados.
  function nombresDe(state, id) {
    var vistos = [];
    (state.participations || []).filter(function (p) { return p && p.opportunityId === id && p.status === 'Confirmada'; }).forEach(function (p) { var n = p.business || 'Un negocio'; if (vistos.indexOf(n) === -1) vistos.push(n); });
    var fuente = (state.opps || []).find(function (x) { return x.id === id; }) || {};
    (fuente.participantesDemo || []).forEach(function (x) { if (x.nombre && vistos.indexOf(x.nombre) === -1) vistos.push(x.nombre); });
    return vistos;
  }
  function read() {
    try {
      var data = window.NexoraData, registry = window.NexoraProviders, adapter = window.NexoraScenarioRead;
      if (!data || !registry || !adapter) return { ok: false, message: 'No se cargaron las dependencias compartidas. Recarga esta pantalla.' };
      var raw;
      try { raw = adapter.crudo(); }
      catch (e) { return { ok: false, message: 'No se puede consultar sessionStorage. Permite el almacenamiento y vuelve a consultar.' }; }
      if (!raw) return { ok: false, message: 'No hay un escenario disponible en esta pestaña. Regresa al acceso administrativo para prepararlo. No se han generado ni restablecido datos desde esta consulta.' };
      var state = JSON.parse(raw);
      if (!state || state.version !== 3 || !state.user || typeof state.user.id !== 'string' || !state.user.id || !Array.isArray(state.opps) || !Array.isArray(state.participations)) throw Error('schema');
      // Enumerar relaciones ya existentes; no mantener un segundo registro proveedor.
      var providerIds = Array.from(new Set(data.opps.map(function (o) { return registry.providerFor(o.id); }).filter(Boolean)));
      if (state.opps.some(function (o) { return !o || !registry.providerFor(o.id); })) throw Error('unknown provider');
      var opportunities = [];
      providerIds.forEach(function (id) { var projection = adapter.read(id); if (!projection.ok) throw Error('incompatible'); opportunities = opportunities.concat(projection.opportunities); });
      if (opportunities.length !== state.opps.length) throw Error('projection');
      var businesses = new Set([state.user.id]), ids = new Set();
      state.participations.forEach(function (p) {
        if (!p || typeof p.id !== 'string' || !p.id || ids.has(p.id) || typeof p.businessId !== 'string' || !p.businessId || ['Confirmada','Retirada'].indexOf(p.status) === -1 || !opportunities.some(function (o) { return o.id === p.opportunityId; })) throw Error('participation');
        ids.add(p.id); businesses.add(p.businessId);
      });
      state.opps.forEach(function (o) { (o.participantesDemo || []).forEach(function (x) { businesses.add(x.id); }); });
      return { ok: true, scenarioDate: state.scenarioDate, businesses: businesses.size, providers: providerIds.length, open: opportunities.filter(function (o) { return o.status === 'abierta'; }).length, closed: opportunities.filter(function (o) { return o.status === 'cerrada'; }).length, confirmed: state.participations.filter(function (p) { return p.status === 'Confirmada'; }).length, opportunities: opportunities.map(function (o) { return { hoy: o.hoy, closeDateRaw: o.closeDate, entregaDesde: o.entregaDesde, entregaHasta: o.entregaHasta, nombres: nombresDe(state, o.id), negocios: o.negocios, avance: o.total + ' ' + o.unit + (Number.isFinite(o.minimo) ? ' de ' + o.minimo + ' mínimo' : ''), precio: new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(o.precioActual), entrega: o.entrega, estadoTexto: o.estado ? o.estado.texto : (o.status === 'abierta' ? 'Abierta' : 'Cerrada'), id: o.id, product: o.product.name, productId: o.product.id, closeDate: o.closeDate, provider: o.provider, providerId: o.providerId, zone: o.zone, status: o.status, confirmed: o.confirmedParticipations }; }) };
    } catch (e) { return { ok: false, message: 'El escenario no es compatible o contiene referencias incompletas. Se conserva intacto; no se migró ni reinició.' }; }
  }
  function users() {
    var source = read(); if (!source.ok) return source;
    try {
      var state = JSON.parse(window.NexoraScenarioRead.crudo());
      var businesses = Array.from(new Set([state.user.id].concat(state.participations.map(function (p) { return p.businessId; }))));
      var ids = Array.from(new Set(window.NexoraData.opps.map(function (o) { return window.NexoraProviders.providerFor(o.id); }).filter(Boolean)));
      return { ok: true, items: businesses.map(function (id) { return { key: 'negocio:' + id, id: id, type: 'negocio', name: id === state.user.id && typeof state.user.business === 'string' ? state.user.business : 'Negocio representado (nombre no disponible)', origin: 'Perfil existente del escenario demostrativo' }; }).concat(ids.map(function (id) { var p = window.NexoraProviders.byId(id); return { key: 'proveedor:' + id, id: id, type: 'proveedor', name: p.name, origin: 'Identidad del registro compartido demostrativo' }; })) };
    } catch (e) { return { ok: false, message: 'No se pudieron consultar las identidades existentes. No se alteraron los datos.' }; }
  }
  function groups() {
    var source = read(); if (!source.ok) return source;
    try {
      var state = JSON.parse(window.NexoraScenarioRead.crudo());
      var providerIds = Array.from(new Set(source.opportunities.map(function (o) { return o.providerId; }))), items = [];
      providerIds.forEach(function (id) { var projection = window.NexoraScenarioRead.read(id); if (!projection.ok) throw Error('projection'); items = items.concat(projection.opportunities); });
      return { ok: true, scenarioDate: source.scenarioDate, items: items.map(function (o) {
        var history = state.participations.filter(function (p) { return p.opportunityId === o.id; }).map(function (p) {
          return { id: p.id, businessId: p.businessId, business: typeof p.business === 'string' && p.business ? p.business : null, status: p.status, confirmedAt: typeof p.confirmedAt === 'string' ? p.confirmedAt : null, withdrawnAt: typeof p.withdrawnAt === 'string' ? p.withdrawnAt : null, quantity: p.snapshot && Number.isFinite(p.snapshot.qty) ? p.snapshot.qty : null, unit: p.snapshot && typeof p.snapshot.unit === 'string' ? p.snapshot.unit : null };
        });
        var businesses = [];
        history.filter(function (p) { return p.status === 'Confirmada'; }).forEach(function (p) { if (!businesses.some(function (b) { return b.id === p.businessId; })) businesses.push({ id: p.businessId, name: p.business, qty: p.quantity }); });
        // El admin ve los nombres de todos, también los simulados.
        var fuente = state.opps.find(function (x) { return x.id === o.id; }) || {};
        (fuente.participantesDemo || []).forEach(function (x) { businesses.push({ id: x.id, name: x.nombre || null, qty: x.qty, simulado: true }); });
        return Object.assign({}, o, { history: history, businesses: businesses, nombres: nombresDe(state, o.id) });
      }) };
    } catch (e) { return { ok: false, message: 'No se pudo consultar el seguimiento existente. Los registros se conservan intactos.' }; }
  }
  function opportunity(id) {
    if (!id) return { ok: false, notFound: true, message: 'Oportunidad no encontrada. Falta su identificador.' };
    var source = groups(); if (!source.ok) return source;
    var item = source.items.find(function (o) { return o.id === id; });
    return item ? { ok: true, item: item, scenarioDate: source.scenarioDate } : { ok: false, notFound: true, message: 'Oportunidad no encontrada. El identificador no existe en este escenario.' };
  }
  function filterOpportunities(items, query, status, provider) {
    var norm = window.NexoraUtils.normalizar;
    var text = norm(query || '').trim();
    return items.filter(function (o) { return (!text || norm(o.product.name + ' ' + o.id).includes(text)) && (!status || (o.estado ? o.estado.clave : o.status) === status) && (!provider || o.providerId === provider); });
  }
  window.NexoraAdminRead = { read: read, users: users, groups: groups, opportunity: opportunity, filterOpportunities: filterOpportunities };
})();
