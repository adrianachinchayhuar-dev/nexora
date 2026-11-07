(function () {
  'use strict';
  var access=window.NexoraRoleAccess;
  if(typeof document!=='undefined'&&document.body&&document.body.dataset.roleAccess==='required'&&!access)return;
  if(access&&access.enabled()&&!access.requireRole('comprador'))return;
  if(access&&access.enabled()){var readiness=access.inspectScenario();if(readiness.error){window.NexoraAccessBlocked=readiness.error;return;}}
  var key = 'nexora.comprador.demo.v1', compra = window.NexoraCompra;
  var catalog = window.NexoraData.products;
  // Zonas por distrito. `compatibles`: otras zonas cuyas compras en grupo también te sirven (sin mapas).
  var zones = [{ id: 'sa-centro', name: 'Santa Anita · zona Centro (demo)', distrito: 'Santa Anita', compatibles: [] }, { id: 'ves-sector1', name: 'Villa El Salvador · Sector 1 (demo)', distrito: 'Villa El Salvador', compatibles: [] }];
  function zonasPorDistrito() {
    var out = [];
    zones.forEach(function (z) { var d = out.find(function (x) { return x.distrito === z.distrito; }); if (!d) out.push(d = { distrito: z.distrito, zonas: [] }); d.zonas.push({ id: z.id, name: z.name }); });
    return out;
  }
  // Compatibilidad territorial: la misma zona o una zona marcada como compatible (en cualquiera de los dos sentidos).
  function zonasCompatibles(a, b) {
    if (a === b) return true;
    var za = zones.find(function (z) { return z.id === a; }), zb = zones.find(function (z) { return z.id === b; });
    return !!(za && zb && ((za.compatibles || []).indexOf(b) !== -1 || (zb.compatibles || []).indexOf(a) !== -1));
  }
  // La zona del pedido toma por defecto la zona del negocio.
  function zonaPorDefecto() { var z = state && state.user && (state.user.zona || state.user.zoneId); return zones.some(function (x) { return x.id === z; }) ? z : zones[0].id; }
  function productById(id) { return Object.prototype.hasOwnProperty.call(catalog, id) ? catalog[id] : null; }
  function today() { return state && state.scenarioDate ? state.scenarioDate : window.NexoraData.baseDate; }
  // Marca de tiempo de mensajería: fecha del escenario + hora real de Lima, para no mezclar la fecha real con los ejemplos.
  function sceneNow() {
    var t = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Lima', hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date());
    return today() + 'T' + t.replace(/^24/, '00') + '-05:00';
  }
  function after(date, days) { var d = new Date(date + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10); }
  function fresh() { return window.NexoraScenarioSeed.create(); }
  function enrichOpportunities(opps,base) { return window.NexoraScenarioSeed.enrich(opps,base); }
  var state, storageError = '', protectStored = false, conflicto = false, shared = window.NexoraShared;
  function enCompartido() { return !!(shared && shared.activo()); }
  try {
    var enSesion = sessionStorage.getItem(key), stored = enCompartido() && !enSesion ? JSON.stringify(shared.estado()) : enSesion;
    state = stored ? JSON.parse(stored) : fresh();
    if (![1, 2, 3].includes(state.version) || !Array.isArray(state.needs) || !Array.isArray(state.orders) || !Array.isArray(state.opps) || !Array.isArray(state.notifs) || !Array.isArray(state.participations)) throw new Error('Estado incompatible');
    if (state.version === 1) {
      // Preserve the exact previous session before enriching only derived fields.
      sessionStorage.setItem(key + '.backup-etapa1', stored);
      state.opps = enrichOpportunities(state.opps, state.baseDate);
      state.scenarioDate = state.baseDate;
      state.selections = {};
      state.version = 2;
    }
    if (state.version === 2) {
      sessionStorage.setItem(key + '.backup-etapa3', stored || JSON.stringify(state));
      state.user.id = state.user.id || 'NEG-DEMO-ROSITA';
      state.opps.forEach(function (o) { delete o.confirmedCount; });
      state.version = 3;
    }
    if (!state.selections) state.selections = {};
    if (state.profileVersion === undefined) {
      if (stored) sessionStorage.setItem(key + '.backup-etapa8', stored);
      ['zoneId', 'businessType', 'phone', 'email', 'description', 'image'].forEach(function (field) {
        if (!Object.prototype.hasOwnProperty.call(state.user, field)) state.user[field] = window.NexoraData.user[field];
      });
      state.profileVersion = 1;
    }
    if (state.profileVersion !== 1) throw new Error('Perfil incompatible');
    if (!state.messaging) {
      if (stored) sessionStorage.setItem(key + '.backup-etapa7', stored);
      state.messaging = initialMessaging(state.user.id, state.baseDate, state.msgs);
    }
    // Campos nuevos de las compras en grupo (tramos, mínimo, participantes simulados…): se agregan sin tocar los existentes.
    state.opps.forEach(function (o) {
      var seed = window.NexoraData.opps.find(function (x) { return x.id === o.id; }); if (!seed) return;
      ['tramos', 'minimo', 'participantesDemo', 'costoTransporte', 'estado', 'marca'].forEach(function (k) { if (!Object.prototype.hasOwnProperty.call(o, k) && seed[k] !== undefined) o[k] = JSON.parse(JSON.stringify(seed[k])); });
      if (!o.estadoDesde) o.estadoDesde = after(state.baseDate, -(seed.estadoDias || 0));
    });
    state.opps.forEach(function (o) { var seed = window.NexoraData.opps.find(function (x) { return x.id === o.id; }); if (seed && !o.entregaHasta) { o.entregaDesde = after(o.closeDate, seed.entregaDias[0]); o.entregaHasta = after(o.closeDate, seed.entregaDias[1]); } });
    // Marca del pedido: vacía = «Cualquier marca»; soloEstaMarca = no acepta similares.
    // Ubicación del negocio: dirección, distrito y zona (se completan desde los datos que ya tenía).
    if (state.user.direccion === undefined) state.user.direccion = window.NexoraData.user.direccion;
    if (state.user.distrito === undefined) state.user.distrito = state.user.district || window.NexoraData.user.distrito;
    if (state.user.zona === undefined) state.user.zona = state.user.zoneId || window.NexoraData.user.zona;
    state.needs.forEach(function (n) { if (n.marca === undefined) n.marca = n.brand || ''; if (n.soloEstaMarca === undefined) n.soloEstaMarca = false; });
    if (!Array.isArray(state.descartes)) state.descartes = []; // «No me interesa»: [{ opportunityId, needId, at }]
    if (state.messaging.version !== 1 || !Array.isArray(state.messaging.conversations) || !Array.isArray(state.messaging.messages) || !state.messaging.drafts || typeof state.messaging.drafts !== 'object') throw new Error('Mensajería incompatible');
    if (enCompartido() && enSesion) { shared.adoptar(state, enSesion); state = shared.estado(state.user.id); }
  } catch (error) {
    if (enCompartido()) { shared.apartarSesion(); state = shared.estado(); }
    else {
      state = fresh(); protectStored = !!stored;
      storageError = 'No se pudo migrar la sesión. El estado anterior se conserva sin sobrescribir; usa Restablecer datos del comprador solo si deseas reemplazarlo.';
    }
  }
  function persist() {
    if (enCompartido()) return true; // cada operación ya guardó lo suyo
    if (protectStored) return false;
    try { sessionStorage.setItem(key, JSON.stringify(state)); storageError = ''; return true; }
    catch (error) { storageError = 'No se pudo guardar la sesión demo. Permite sessionStorage para conservar datos al navegar o recargar.'; return false; }
  }
  function opportunityStatus(o) {
    if (!o) return null;
    if (o.status === 'cerrada') return 'cerrada';
    if (o.status !== 'abierta' || typeof o.closeDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.closeDate) || Number.isNaN(Date.parse(o.closeDate + 'T12:00:00Z'))) return null;
    return o.closeDate < today() ? 'cerrada' : 'abierta';
  }
  function normalized(value) { return String(value || '').trim().toLowerCase(); }
  function compatible(need, opp) {
    return ['Registrada', 'Con coincidencia'].includes(need.status) && Number.isFinite(need.qty) && need.qty > 0 && opportunityStatus(opp) === 'abierta' && need.productId === opp.product && normalized(need.presentation) === normalized(opp.presentation) && normalized(need.unit) === normalized(opp.unit) && zonasCompatibles(need.zoneId, opp.zoneId) && need.requiredDate >= opp.from && need.requiredDate <= opp.until && (need.loAntesPosible || compra.llegaATiempo(opp, need.requiredDate)) && marcaCompatible(need, opp);
  }
  // Si el pedido pide «solo esta marca», la compra debe ser de esa marca; si no, acepta similares.
  function marcaCompatible(need, opp) { var m = normalized(need.marca); return !need.soloEstaMarca || !m || m === normalized(opp.marca); }
  function marcaTexto(need) { return need && String(need.marca || '').trim() ? String(need.marca).trim() : 'Cualquier marca'; }
  function compatibleNeeds(o) { return state.needs.filter(function (n) { return compatible(n, o); }); }
  function matches(id, zoneId, date, presentation, unit, marca) {
    var p = catalog[id]; if (!p) return [];
    marca = marca || {};
    return state.opps.filter(function (o) { return compatible({ productId: id, zoneId: zoneId, requiredDate: date, presentation: presentation || p.detail, unit: unit || p.unit, qty: 1, status: 'Registrada', marca: marca.marca || '', soloEstaMarca: !!marca.soloEstaMarca, loAntesPosible: !!marca.loAntesPosible }, o); });
  }
  // Explica en una línea por qué un pedido guardado no tiene compra en grupo. Solo lee: no cambia las reglas de compatibilidad.
  // Devuelve { kind: 'date' | 'groups' | 'brand', text } o null si el pedido sí coincide o no aplica (borrador, cancelado).
  function dayMonth(iso) { var d = new Date(String(iso) + 'T12:00:00Z'); return Number.isFinite(d.getTime()) ? new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(d).replace('.', '') : ''; }
  function noMatchReason(need) {
    if (!need || !['Registrada', 'Con coincidencia'].includes(need.status) || !Number.isFinite(need.qty) || need.qty <= 0) return null;
    if (state.opps.some(function (o) { return compatible(need, o); })) return null;
    var name = normalized(need.product), sameProduct = state.opps.filter(function (o) { return o.product === need.productId; });
    if (!sameProduct.length) return { kind: 'groups', text: 'Aún no hay compra en grupo para este producto.' };
    var same = sameProduct.filter(function (o) { return normalized(need.presentation) === normalized(o.presentation) && normalized(need.unit) === normalized(o.unit); });
    if (!same.length) return { kind: 'groups', text: 'Aún no hay compra en grupo para esta presentación.' };
    var open = same.filter(function (o) { return opportunityStatus(o) === 'abierta'; });
    if (!open.length) return { kind: 'groups', text: 'La compra en grupo de ' + name + ' ya cerró.' };
    var inZone = open.filter(function (o) { return zonasCompatibles(need.zoneId, o.zoneId); });
    if (!inZone.length) { var zone = zones.find(function (z) { return z.id === need.zoneId; }); return { kind: 'groups', text: 'Aún no hay compras en grupo en ' + (zone ? zone.name.replace(/\s*\(demo\)/, '') : 'esta zona') + '.' }; }
    var brandOk = inZone.filter(function (o) { return marcaCompatible(need, o); });
    if (!brandOk.length) return { kind: 'brand', text: 'Solo aceptas la marca ' + marcaTexto(need) + '.' };
    var o = brandOk[0];
    var tarde = brandOk.filter(function (x) { return !compra.llegaATiempo(x, need.requiredDate); })[0];
    if (tarde && need.requiredDate >= tarde.from && need.requiredDate <= tarde.until) return { kind: 'date', tarde: true, opportunityId: tarde.id, text: 'Esta compra entrega ' + compra.entregaTexto(tarde) + ' y tú lo necesitas para el ' + dayMonth(need.requiredDate) + '.' };
    if (need.requiredDate > o.until) return { kind: 'date', text: 'La compra en grupo de ' + name + ' acepta pedidos hasta el ' + dayMonth(o.until) + '. Cambia la fecha para unirte.' };
    if (need.requiredDate < o.from) return { kind: 'date', text: 'La compra en grupo de ' + name + ' acepta pedidos desde el ' + dayMonth(o.from) + '. Cambia la fecha para unirte.' };
    return null;
  }
  function selectedNeed(o) {
    var candidates = compatibleNeeds(o);
    if (candidates.length === 1) return candidates[0];
    return candidates.find(function (n) { return n.id === state.selections[o.id]; }) || null;
  }
  function selectNeed(opportunityId, needId) {
    var o = state.opps.find(function (o) { return o.id === opportunityId; });
    if (!o || (needId && !compatibleNeeds(o).some(function (n) { return n.id === needId; }))) return false;
    var next = JSON.parse(JSON.stringify(state));
    if (needId) next.selections[opportunityId] = needId; else delete next.selections[opportunityId];
    if (!saveNext(next, false)) return false;
    announce('reference'); return true;
  }
  function markNotificationsRead(index) {
    if (index !== undefined && (!Number.isInteger(index) || index < 0 || index >= state.notifs.length)) return false;
    var next = JSON.parse(JSON.stringify(state));
    next.notifs.forEach(function (n, i) { if (index === undefined || index === i) n.read = true; });
    return saveNext(next, false);
  }
  function uid(prefix) { return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8); }
  function validate(items, date, zone) {
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date + 'T12:00:00Z')) || date < today()) return 'Selecciona una fecha requerida válida, desde la fecha del escenario demo.';
    if (!zones.some(function (z) { return z.id === zone; })) return 'Selecciona una zona demostrativa.';
    if (!items.length || items.some(function (i) {
      return !productById(i.k) || !Number.isFinite(i.qty) || i.qty <= 0 || (catalog[i.k].unit !== 'kg' && !Number.isInteger(i.qty)) || !String(i.presentation || '').trim() || (i.price !== null && (!Number.isFinite(i.price) || i.price <= 0 || Math.abs(i.price * 100 - Math.round(i.price * 100)) > 0.000001));
    })) return 'Corrige o elimina todas las filas: producto y presentación obligatorios, cantidad positiva (entera salvo kg) y precio positivo con hasta dos decimales o vacío.';
    return '';
  }
  function register(text, items, date, zone) {
    if (zone === undefined || zone === null) zone = zonaPorDefecto(); // un campo vaciado a propósito sigue siendo un error
    var error = validate(items, date, zone); if (error) return { error: error };
    var orderId = uid('PED'), created = new Date().toISOString();
    var needs = items.map(function (i) {
      var marca = String(i.marca !== undefined ? i.marca : i.brand || '').trim(), solo = !!i.soloEstaMarca && !!marca;
      var p = catalog[i.k], ids = matches(i.k, zone, date, i.presentation, null, { marca: marca, soloEstaMarca: solo, loAntesPosible: !!i.loAntesPosible }).map(function (o) { return o.id; });
      return { id: uid('NEC'), orderId: orderId, productId: i.k, product: p.name, brand: marca, marca: marca, soloEstaMarca: solo, presentation: i.presentation.trim(), qty: i.qty, unit: p.unit, requiredDate: date, loAntesPosible: !!i.loAntesPosible, priceIndividual: i.price, zoneId: zone, status: ids.length ? 'Con coincidencia' : 'Registrada', opportunityIds: ids, createdAt: created };
    });
    var next = JSON.parse(JSON.stringify(state));
    next.orders.unshift({ id: orderId, text: text, createdAt: created });
    next.needs = needs.concat(next.needs);
    next.notifs.unshift({ text: 'Registraste ' + needs.length + ' necesidades demostrativas. La participación no se confirma automáticamente.', when: 'Ahora', read: false });
    if (!saveNext(next, false)) return { error: storageError || 'No se pudo guardar la necesidad. La sesión anterior se conserva sin cambios.' };
    return { needs: needs };
  }
  // Actualiza un pedido guardado: mismo ID, mismo pedido y misma fecha de creación; solo cambian cantidad, fecha,
  // zona y precio de hoy. Las coincidencias se recalculan con las mismas reglas del registro.
  // Si ya te uniste con este pedido no se edita: primero hay que retirarse.
  function updateNeed(id, changes) {
    var current = state.needs.find(function (n) { return n.id === id; });
    if (!current) return { error: 'No encontramos este pedido.' };
    if (!['Registrada', 'Con coincidencia'].includes(current.status)) return { error: 'Este pedido ya no se puede editar.' };
    var joined = state.participations.find(function (p) { return p && p.needId === id && p.status === 'Confirmada'; });
    if (joined) return { error: 'Ya te uniste con este pedido. Para cambiarlo, primero retírate.', participationId: joined.id };
    changes = changes || {};
    if (changes.zone === undefined || changes.zone === null) changes = Object.assign({}, changes, { zone: current.zoneId });
    var item = { k: current.productId, qty: changes.qty, presentation: current.presentation, brand: current.brand, price: changes.price === undefined ? null : changes.price };
    var error = validate([item], changes.date, changes.zone); if (error) return { error: error };
    var marca = changes.marca !== undefined ? String(changes.marca || '').trim() : (current.marca !== undefined ? current.marca : current.brand || '');
    var solo = (changes.soloEstaMarca !== undefined ? !!changes.soloEstaMarca : !!current.soloEstaMarca) && !!marca;
    var pronto = changes.loAntesPosible === undefined ? !!current.loAntesPosible : !!changes.loAntesPosible;
    var ids = matches(current.productId, changes.zone, changes.date, current.presentation, null, { marca: marca, soloEstaMarca: solo, loAntesPosible: pronto }).map(function (o) { return o.id; });
    var next = JSON.parse(JSON.stringify(state)), target = next.needs.find(function (n) { return n.id === id; });
    target.marca = marca; target.brand = marca; target.soloEstaMarca = solo;
    target.qty = changes.qty; target.requiredDate = changes.date; target.loAntesPosible = pronto; target.zoneId = changes.zone; target.priceIndividual = changes.price === undefined ? null : changes.price;
    target.opportunityIds = ids; target.status = ids.length ? 'Con coincidencia' : 'Registrada';
    if (next.selections) Object.keys(next.selections).forEach(function (key) { if (next.selections[key] === id && !ids.includes(key)) delete next.selections[key]; });
    if (!saveNext(next, false)) return { error: storageError || 'No se pudo guardar el cambio. El pedido anterior se conserva sin cambios.' };
    announce('update');
    return { need: JSON.parse(JSON.stringify(target)) };
  }
  // Avisos del proveedor y preguntas públicas de una compra en grupo (de demostración). Los más recientes primero.
  function newestFirst(list) { return (list || []).map(function (x, i) { return { item: x, i: i }; }).sort(function (a, b) { return a.item.date < b.item.date ? 1 : a.item.date > b.item.date ? -1 : b.i - a.i; }).map(function (x) { return JSON.parse(JSON.stringify(x.item)); }); }
  function opportunityNotices(o) { return newestFirst(o && o.notices); }
  function opportunityQuestions(o) { return newestFirst(o && o.questions); }
  // Publica una pregunta para todos. Solo si ya te uniste. Es anónima: se guarda la zona, nunca el negocio ni la cantidad.
  function askQuestion(opportunityId, text) {
    var o = state.opps.find(function (x) { return x.id === opportunityId; });
    if (!o) return { error: 'No encontramos esta compra en grupo.' };
    if (!activeParticipations(opportunityId).some(function (p) { return p.businessId === state.user.id; })) return { error: 'Únete a la compra en grupo para hacer una pregunta.' };
    var clean = String(text || '').replace(/\s+/g, ' ').trim();
    if (clean.length < 3 || clean.length > 200) return { error: 'Escribe tu pregunta en pocas palabras (hasta 200 letras).' };
    var next = JSON.parse(JSON.stringify(state)), target = next.opps.find(function (x) { return x.id === opportunityId; });
    var question = { id: uid('PRE'), date: today(), zoneId: state.user.zoneId || 'sa-centro', text: clean, answer: null, answeredAt: null };
    target.questions = (target.questions || []).concat([question]);
    if (!saveNext(next, false)) return { error: storageError || 'No se pudo publicar la pregunta. Inténtalo de nuevo.' };
    announce('question');
    return { question: JSON.parse(JSON.stringify(question)) };
  }
  function saveNext(next, allowReplace) {
    if (protectStored && !allowReplace) return false;
    if (enCompartido()) {
      var resultado = shared.guardar(next);
      if (resultado === 'ok') { state = next; protectStored = false; storageError = ''; return true; }
      if (resultado === 'conflicto') { conflicto = true; storageError = 'Otra pestaña cambió estos datos. Inténtalo de nuevo.'; return false; }
      shared.pasarASoloPestana(); // sin almacenamiento común: esta pestaña sigue por su cuenta
    }
    try { sessionStorage.setItem(key, JSON.stringify(next)); }
    catch (error) { storageError = 'No se pudo guardar la sesión demo. La operación no se registró. Permite sessionStorage e inténtalo de nuevo.'; return false; }
    state = next; protectStored = false; storageError = ''; return true;
  }
  function announce(reason) { var event = new Event('nexora-demo-change'); event.detail = { reason: reason }; window.dispatchEvent(event); }
  function reset(empty) {
    var next = fresh(); if (empty) { next.needs = []; next.orders = []; }
    if (!saveNext(next, true)) return false;
    try { sessionStorage.removeItem('nexora.comprador.opportunityFilters'); sessionStorage.removeItem('nexora.comprador.trackingFilters'); sessionStorage.removeItem('nexora.comprador.catalogFilters'); } catch (error) { /* The reset event also clears visible filters. */ }
    announce('reset'); return true;
  }
  // Confirmada and Retirada describe demo participation only, never a purchase.
  function activeParticipations(opportunityId) {
    return state.participations.filter(function (p) { return p && p.status === 'Confirmada' && (!opportunityId || p.opportunityId === opportunityId); });
  }
  function participationForNeed(needId) { return activeParticipations().find(function (p) { return p.needId === needId && p.businessId === state.user.id; }) || null; }
  function participationCounts(opportunityId) {
    var active = activeParticipations(opportunityId);
    return { participations: active.length, businesses: new Set(active.map(function (p) { return p.businessId; }).filter(Boolean)).size };
  }
  function ownParticipations() {
    return state.participations.filter(function (p) { return p && p.businessId === state.user.id; });
  }
  function participationById(id) { return ownParticipations().find(function (p) { return p.id === id; }) || null; }
  function participationHistoryForNeed(id) { return ownParticipations().filter(function (p) { return p.needId === id; }); }
  function participationHistoryForOpportunity(id) { return ownParticipations().filter(function (p) { return p.opportunityId === id; }); }
  function ownParticipationCounts() {
    var records = ownParticipations();
    return { confirmed: records.filter(function (p) { return p.status === 'Confirmada'; }).length, withdrawn: records.filter(function (p) { return p.status === 'Retirada'; }).length, historical: records.length };
  }
  function prepareWithdrawal(id) {
    var p = participationById(id);
    if (!p) return { error: 'Participación no encontrada para el negocio de esta sesión.' };
    if (p.status !== 'Confirmada') return { error: 'Solo se pueden retirar participaciones confirmadas. Este registro no admite otra retirada.' };
    var o = state.opps.find(function (item) { return item.id === p.opportunityId; });
    if (!o) return { error: 'La oportunidad vinculada no está disponible. Se conserva el historial, pero no se puede retirar.' };
    if (opportunityStatus(o) !== 'abierta') return { error: opportunityStatus(o) === 'cerrada' ? 'La oportunidad está cerrada. No se permite retirar la participación.' : 'No hay información válida del cierre para permitir la retirada.' };
    var snap = p.snapshot;
    if (!p.id || !p.needId || !p.orderId || typeof p.confirmedAt !== 'string' || !p.confirmedAt || Number.isNaN(Date.parse(p.confirmedAt)) || !state.needs.some(function (n) { return n.id === p.needId; }) || !snap || !snap.productId || !snap.presentation || !snap.unit || !Number.isFinite(snap.qty) || snap.qty <= 0 || !Number.isFinite(snap.priceJoint) || snap.priceJoint <= 0 || !o.closeDate) return { error: 'Faltan datos esenciales del registro histórico. Puedes consultarlo, pero no retirar hasta revisar esos datos.' };
    return { proposal: { participation: JSON.parse(JSON.stringify(p)), scenarioDateAtWithdrawal: today(), opportunityCloseDate: o.closeDate } };
  }
  function confirmWithdrawal(reviewed) {
    if (!reviewed || !reviewed.participation) return { error: 'Revisa la retirada antes de confirmar.' };
    var current = prepareWithdrawal(reviewed.participation.id);
    if (current.error) return current;
    if (JSON.stringify(current.proposal) !== JSON.stringify(reviewed)) return { error: 'El registro o las condiciones cambiaron. Cierra el diálogo y vuelve a revisar la retirada.' };
    var next = JSON.parse(JSON.stringify(state)), p = next.participations.find(function (item) { return item && item.id === reviewed.participation.id && item.businessId === next.user.id; });
    p.status = 'Retirada'; p.withdrawnAt = new Date().toISOString(); p.scenarioDateAtWithdrawal = today();
    next.notifs.unshift({ text: 'Participación demostrativa retirada: ' + p.id + '. El historial se conserva. No se canceló ninguna compra real.', when: 'Ahora', read: false });
    if (!saveNext(next, false)) return { error: storageError || 'La sesión anterior está protegida. No se registró la retirada.' };
    announce('withdrawal'); return { participation: p };
  }
  function canModifyNeed(needId, patch) {
    var need = state.needs.find(function (n) { return n.id === needId; });
    if (!need) return false;
    if (!participationForNeed(needId)) return true;
    return ['productId', 'presentation', 'unit', 'qty'].every(function (field) { return !Object.prototype.hasOwnProperty.call(patch, field) || patch[field] === need[field]; });
  }
  function prepareParticipation(opportunityId, needId) {
    var o = state.opps.find(function (item) { return item.id === opportunityId; });
    var n = state.needs.find(function (item) { return item.id === needId; });
    if (!o || !n) return { error: 'La oportunidad o la necesidad ya no existe.' };
    if (opportunityStatus(o) !== 'abierta') return { error: 'Esta oportunidad está cerrada. No admite nuevas participaciones.' };
    if (estadoCompra(o) === 'confirmada') return { error: 'Esta compra ya está confirmada. No admite nuevas uniones.' };
    if (estadoCompra(o) === 'cancelada') return { error: 'Esta compra no se concretó. No admite nuevas uniones.' };
    if (!compatible(n, o)) return { error: 'La necesidad no es compatible con esta oportunidad.' };
    if (participationForNeed(n.id)) return { error: 'Esta necesidad ya tiene una participación demostrativa confirmada. No se puede confirmar otra participación activa.' };
    if (!selectedNeed(o) || selectedNeed(o).id !== n.id) return { error: 'La referencia seleccionada cambió. Revisa la necesidad antes de confirmar.' };
    if (!Number.isFinite(o.priceJoint) || o.priceJoint <= 0) return { error: 'El precio conjunto no es válido en este escenario.' };
    var snapshot = { productId: n.productId, product: catalog[n.productId].name, brand: n.brand, presentation: n.presentation, unit: n.unit, qty: n.qty, provider: o.provider, zoneId: n.zoneId, requiredDate: n.requiredDate, priceIndividual: n.priceIndividual, priceJoint: o.priceJoint, closeDate: o.closeDate, from: o.from, until: o.until, entregaDesde: o.entregaDesde, entregaHasta: o.entregaHasta, loAntesPosible: !!n.loAntesPosible };
    var proposal = { businessId: state.user.id, business: state.user.business, opportunityId: o.id, needId: n.id, orderId: n.orderId, scenarioDateAtConfirmation: today(), snapshot: snapshot, savingSnapshot: saving(n, o) };
    return { proposal: proposal };
  }
  function confirmParticipation(reviewed) {
    if (!reviewed) return { error: 'Revisa la participación antes de confirmar.' };
    var current = prepareParticipation(reviewed.opportunityId, reviewed.needId);
    if (current.error) return current;
    if (JSON.stringify(current.proposal) !== JSON.stringify(reviewed)) return { error: 'Los datos revisados cambiaron. Cierra el diálogo y vuelve a revisar la participación.' };
    var participation = Object.assign({}, current.proposal, { id: uid('PAR'), status: 'Confirmada', confirmedAt: new Date().toISOString(), withdrawnAt: null, simulation: true });
    var next = JSON.parse(JSON.stringify(state));
    next.participations.unshift(participation);
    next.notifs.unshift({ text: 'Te uniste: ' + participation.snapshot.product + ' · ' + participation.snapshot.qty + ' ' + participation.snapshot.unit + '. Aún no es una compra confirmada.', when: 'Ahora', read: false });
    if (!saveNext(next, false)) return { error: storageError || 'La sesión anterior está protegida. No se registró la participación.' };
    announce('participation'); return { participation: participation };
  }
  function saving(need, opp) {
    if (!need || !Number.isFinite(need.priceIndividual) || need.priceIndividual <= 0 || !Number.isFinite(need.qty) || need.qty <= 0 || !Number.isFinite(opp.priceJoint) || opp.priceJoint <= 0) return null;
    var difference = need.priceIndividual - opp.priceJoint;
    return { unit: Math.round(Math.max(0, difference) * 100) / 100, total: Math.round(Math.max(0, difference) * need.qty * 100) / 100, pct: Math.round(Math.max(0, difference) / need.priceIndividual * 100), hasSaving: difference > 0 };
  }
  function initialMessaging(owner,base,legacy) { return window.NexoraScenarioSeed.messaging(owner,base,legacy); }
  function ownConversations() { return state.messaging ? state.messaging.conversations.filter(function (c) { return c.businessId === state.user.id; }) : []; }
  function conversationById(id) { return ownConversations().find(function (c) { return c.id === id; }) || null; }
  function conversationMessages(id) { return conversationById(id) ? state.messaging.messages.filter(function (m) { return m.conversationId === id; }) : []; }
  function unreadConversations() { return ownConversations().filter(function (c) { return conversationMessages(c.id).some(function (m) { return m.direction === 'received' && !m.readAt; }); }).length; }
  function conversationOpportunity(c) { return c && state.opps.find(function (o) { return o.id === c.opportunityId; }) || null; }
  function conversationEligibility(id) {
    var c = conversationById(id), o = conversationOpportunity(c);
    if (!c) return 'Conversación no encontrada para el negocio de esta sesión.';
    if (!o) return 'La oportunidad relacionada no está disponible. Se conserva el historial en solo lectura.';
    if (opportunityStatus(o) !== 'abierta') return 'Oportunidad cerrada o no disponible: conversación en solo lectura.';
    return '';
  }
  function openConversation(opportunityId) {
    var o = state.opps.find(function (o) { return o.id === opportunityId; });
    var existing = ownConversations().find(function (c) { return c.opportunityId === opportunityId && c.interlocutorId === 'SUP-DEMO-' + opportunityId; });
    if (existing) return { conversation: existing };
    if (!o || opportunityStatus(o) !== 'abierta') return { error: 'Solo puedes crear conversaciones de oportunidades abiertas.' };
    if (!o.provider) return { error: 'No hay proveedor sugerido en este escenario.' };
    var c = { id: uid('CONV'), businessId: state.user.id, opportunityId: o.id, interlocutorId: 'SUP-DEMO-' + o.id, interlocutorName: o.provider, participationId: null, createdAt: sceneNow(), simulation: true };
    var next = JSON.parse(JSON.stringify(state)); next.messaging.conversations.push(c);
    if (!saveNext(next, false)) return { error: storageError || 'No se pudo guardar la conversación.' };
    announce('conversation'); return { conversation: c };
  }
  function markConversationRead(id) {
    if (!conversationById(id)) return { error: 'Conversación no encontrada para este negocio.' };
    if (!conversationMessages(id).some(function (m) { return m.direction === 'received' && !m.readAt; })) return {};
    var next = JSON.parse(JSON.stringify(state)), at = sceneNow();
    next.messaging.messages.forEach(function (m) { if (m.conversationId === id && m.direction === 'received' && !m.readAt) m.readAt = at; });
    if (!saveNext(next, false)) return { error: storageError || 'No se pudo guardar la lectura.' };
    announce('message-read'); return {};
  }
  function saveMessageDraft(id, text) {
    if (!conversationById(id)) return { error: 'Conversación no encontrada para este negocio.' };
    var next = JSON.parse(JSON.stringify(state)); next.messaging.drafts[id] = String(text);
    if (!saveNext(next, false)) return { error: storageError || 'No se pudo guardar el borrador. Consérvalo antes de salir.' };
    return {};
  }
  function sendDemoMessage(id, text) {
    var error = conversationEligibility(id); if (error) return { error: error };
    text = String(text || '').trim();
    if (!text.length || text.length > 1000) return { error: 'Escribe entre 1 y 1.000 caracteres, sin contar espacios exteriores.' };
    var next = JSON.parse(JSON.stringify(state));
    var message = { id: uid('MSG'), conversationId: id, direction: 'sent', text: text, createdAt: sceneNow(), readAt: null, simulation: true };
    next.messaging.messages.push(message); delete next.messaging.drafts[id];
    if (!saveNext(next, false)) return { error: storageError || 'No se pudo guardar el mensaje. El borrador se conserva en pantalla.' };
    announce('message-sent'); return { message: message };
  }
  function validateProfile(patch) {
    var errors = {}, allowed = ['business', 'name', 'businessType', 'phone', 'email', 'description'], opcionales = ['ruc', 'horario'];
    if (!patch || typeof patch !== 'object' || Object.keys(patch).some(function (key) { return allowed.indexOf(key) === -1 && opcionales.indexOf(key) === -1; })) return { form: 'Solo puedes editar los campos descriptivos y de contacto.' };
    allowed.forEach(function (key) { if (typeof patch[key] !== 'string') errors[key] = 'Revisa este campo.'; });
    opcionales.forEach(function (key) { if (patch[key] !== undefined && typeof patch[key] !== 'string') errors[key] = 'Revisa este campo.'; });
    if (Object.keys(errors).length) return errors;
    if (patch.ruc && patch.ruc.trim() && !/^\d{11}$/.test(patch.ruc.replace(/\s/g, ''))) errors.ruc = 'El RUC tiene 11 dígitos.';
    if (patch.horario && patch.horario.trim().length > 80) errors.horario = 'El horario admite hasta 80 caracteres.';
    if (patch.business.trim().length < 2 || patch.business.trim().length > 80) errors.business = 'Escribe entre 2 y 80 caracteres.';
    if (patch.name.trim().length < 2 || patch.name.trim().length > 60) errors.name = 'Escribe entre 2 y 60 caracteres.';
    if (['', 'Bodega', 'Minimercado', 'Otro'].indexOf(patch.businessType) === -1) errors.businessType = 'Selecciona un rubro disponible.';
    if (patch.phone.trim() && !/^\d{9}$/.test(patch.phone.replace(/\s/g, ''))) errors.phone = 'Introduce nueve dígitos; puedes separarlos con espacios.';
    if (patch.email.trim() && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(patch.email.trim()) || patch.email.trim().length > 254)) errors.email = 'Introduce un correo válido o deja el campo vacío.';
    if (patch.description.trim().length > 300) errors.description = 'La descripción admite hasta 300 caracteres.';
    return errors;
  }
  function updateProfile(patch) {
    var errors = validateProfile(patch); if (Object.keys(errors).length) return { errors: errors };
    var next = JSON.parse(JSON.stringify(state));
    ['business', 'name', 'businessType', 'email', 'description'].forEach(function (key) { next.user[key] = patch[key].trim(); });
    next.user.phone = patch.phone.replace(/\s/g, '');
    if (!saveNext(next, false)) return { error: storageError || 'No se pudo guardar el perfil. La sesión anterior se conserva.' };
    announce('profile'); return { saved: true };
  }
  // RUC y horario son opcionales: se guardan aparte para no tocar updateProfile.
  function updateProfileCompleto(patch) {
    var r = updateProfile(patch); if (r.errors || r.error) return r;
    if (patch.ruc === undefined && patch.horario === undefined) return r;
    var next = JSON.parse(JSON.stringify(state));
    if (patch.ruc !== undefined) next.user.ruc = patch.ruc.replace(/\s/g, '');
    if (patch.horario !== undefined) next.user.horario = patch.horario.trim();
    if (!saveNext(next, false)) return { error: storageError || 'No se pudo guardar el perfil. La sesión anterior se conserva.' };
    announce('profile'); return { saved: true };
  }
  function buyerActivity() {
    var counts = ownParticipationCounts();
    return { needs: state.needs.filter(function (n) { return ['Registrada', 'Con coincidencia'].indexOf(n.status) !== -1; }).length, confirmed: counts.confirmed, withdrawn: counts.withdrawn, conversations: ownConversations().length, opportunities: state.opps.filter(function (o) { return opportunityStatus(o) === 'abierta' && compatibleNeeds(o).length > 0; }).length };
  }
  // ── Precio por tramos y mínimo ──────────────────────────────────────────────────────────────
  // Cantidad total = participantes simulados + participaciones confirmadas (la mía, si me uní).
  // `extra` suma unidades hipotéticas (por ejemplo, mi pedido antes de unirme).
  function cantidadTotal(o, extra) { return compra.cantidadTotal(o, state.participations, extra); }
  function negociosUnidos(o) { return o ? compra.negocios(o, state.participations) : 0; }
  function tramos(o) { return compra.tramos(o); }
  function tramoActual(o, extra) { var r = compra.resumen(o, state.participations, extra); return r ? Object.assign({ indice: r.tramo }, o.tramos[r.tramo]) : null; }
  function precioTramo(o, extra) { var t = tramoActual(o, extra); return t ? t.precio : null; }
  function precioNormal(o) { var lista = tramos(o); return lista ? lista[0].precio : null; }
  function faltaSiguienteTramo(o, extra) { var r = compra.resumen(o, state.participations, extra); return r ? r.siguienteTramo : null; }
  function alcanzaMinimo(o, extra) { return !!o && Number.isFinite(o.minimo) && cantidadTotal(o, extra) >= o.minimo; }
  function faltaMinimo(o, extra) { return o && Number.isFinite(o.minimo) ? Math.max(0, o.minimo - cantidadTotal(o, extra)) : null; }
  // Todo en una lectura: total, tramo, precio, mínimo y lo que falta.
  function resumenCompra(o, extra) { return compra.resumen(o, state.participations, extra); }
  // 7 estados internos (tesis) → 4 visibles, los mismos en los 3 perfiles.
  var ESTADOS = compra.estados;
  function proveedorSuspendido(o) { var cuentas = window.NexoraAccounts; return !!(cuentas && o && o.providerId && cuentas.proveedorSuspendido(o.providerId)); }
  function estadoCompra(o) { return compra.estadoCompra(o, state.participations, opportunityStatus(o) === 'abierta', proveedorSuspendido(o)); }
  function estadoVisible(o) { return compra.estadoVisible(o, state.participations, opportunityStatus(o) === 'abierta', proveedorSuspendido(o)); }
  // Pedido propio de esta compra que no llega a tiempo: mismo producto y zona, abierta, pero la entrega es posterior.
  function pedidoTardio(o) {
    if (!o || opportunityStatus(o) !== 'abierta') return null;
    return state.needs.filter(function (n) { return ['Registrada', 'Con coincidencia'].includes(n.status) && n.productId === o.product && zonasCompatibles(n.zoneId, o.zoneId) && !n.loAntesPosible && !compra.llegaATiempo(o, n.requiredDate); })[0] || null;
  }
  function fechaPedido(n) { return n && n.loAntesPosible ? 'Lo antes posible' : n ? dayMonth(n.requiredDate) : ''; }
  // Retiro con recálculo: el total, el tramo, el precio y el ahorro de todos se derivan del estado, así que se recalculan solos.
  // Si el retiro baja de tramo, se guarda un aviso interno en la compra y una notificación.
  function confirmWithdrawalConRecalculo(reviewed) {
    var p = reviewed && reviewed.participation, o = p && state.opps.find(function (x) { return x.id === p.opportunityId; }), antes = tramoActual(o);
    var result = confirmWithdrawal(reviewed);
    if (result.error || !antes) return result;
    var despues = tramoActual(state.opps.find(function (x) { return x.id === o.id; }));
    if (despues.precio === antes.precio) return result;
    var aviso = { id: uid('AVI'), date: today(), tipo: 'precio', text: 'El precio cambió porque un negocio se retiró', precioAntes: antes.precio, precioDespues: despues.precio };
    var next = JSON.parse(JSON.stringify(state)), target = next.opps.find(function (x) { return x.id === o.id; });
    target.avisosInternos = (target.avisosInternos || []).concat([aviso]);
    next.notifs.unshift({ text: aviso.text + ': ' + catalog[o.product].name.toLowerCase() + ' pasa de S/ ' + antes.precio.toFixed(2) + ' a S/ ' + despues.precio.toFixed(2) + '.', when: 'Ahora', read: false, href: 'detalle-oportunidad.html?id=' + o.id });
    if (saveNext(next, false)) announce('price-change');
    return Object.assign({ aviso: aviso }, result);
  }
  // ── «No me interesa» ───────────────────────────────────────────────────────────────────────
  // Guarda que el bodeguero descartó una compra en grupo para un pedido. Se puede deshacer. No cambia las reglas de compatibilidad.
  function descartada(opportunityId, needId) { return (state.descartes || []).some(function (d) { return d.opportunityId === opportunityId && d.needId === needId; }); }
  function noMeInteresa(opportunityId, needId) {
    var o = state.opps.find(function (x) { return x.id === opportunityId; }), n = state.needs.find(function (x) { return x.id === needId; });
    if (!o || !n) return { error: 'No encontramos esta compra en grupo o este pedido.' };
    if (activeParticipations(opportunityId).some(function (p) { return p.needId === needId; })) return { error: 'Ya te uniste con este pedido. Para descartarla, primero retírate.' };
    if (descartada(opportunityId, needId)) return { descarte: (state.descartes.find(function (d) { return d.opportunityId === opportunityId && d.needId === needId; })) };
    var next = JSON.parse(JSON.stringify(state)), descarte = { opportunityId: opportunityId, needId: needId, at: new Date().toISOString() };
    next.descartes = (next.descartes || []).concat([descarte]);
    if (!saveNext(next, false)) return { error: storageError || 'No se pudo guardar. Inténtalo de nuevo.' };
    announce('discard'); return { descarte: descarte };
  }
  function deshacerNoMeInteresa(opportunityId, needId) {
    if (!descartada(opportunityId, needId)) return {};
    var next = JSON.parse(JSON.stringify(state));
    next.descartes = next.descartes.filter(function (d) { return !(d.opportunityId === opportunityId && d.needId === needId); });
    if (!saveNext(next, false)) return { error: storageError || 'No se pudo deshacer. Inténtalo de nuevo.' };
    announce('discard-undo'); return {};
  }
  function avisosInternos(o) { return newestFirst(o && o.avisosInternos); }
  // ── Ahorro neto estimado (fórmula de la tesis) ─────────────────────────────────────────────
  // (precio individual comparable − precio del tramo alcanzado) × cantidad − costos adicionales conocidos.
  // Precio comparable: el «precio de hoy» del pedido; si no lo puso, el precio normal del proveedor (referencial).
  // Si no se conoce el transporte, el ahorro es preliminar. Es «estimado» hasta que el proveedor confirma el precio.
  function round2(n) { return Math.round(n * 100) / 100; }
  function ahorroEstimado(need, o) {
    if (!need || !tramos(o) || !Number.isFinite(need.qty) || need.qty <= 0) return null;
    var propio = activeParticipations(o.id).some(function (p) { return p.needId === need.id; });
    var extra = propio ? 0 : need.qty, precio = precioTramo(o, extra);
    var referencial = !(Number.isFinite(need.priceIndividual) && need.priceIndividual > 0);
    var comparable = referencial ? precioNormal(o) : need.priceIndividual;
    var preliminar = !Number.isFinite(o.costoTransporte), costos = preliminar ? 0 : o.costoTransporte;
    var bruto = round2((comparable - precio) * need.qty);
    return { precioComparable: comparable, referencial: referencial, precioTramo: precio, tramo: tramoActual(o, extra).indice, cantidad: need.qty, bruto: bruto, costos: costos, neto: round2(bruto - costos), preliminar: preliminar, estado: estadoCompra(o) === 'confirmada' ? 'confirmado' : 'estimado' };
  }
  // Ahorro de todos los negocios de la compra (simulados + participaciones confirmadas), con el tramo alcanzado.
  function ahorroGrupo(o) {
    if (!tramos(o)) return null;
    var precio = precioTramo(o), normal = precioNormal(o), total = 0;
    (o.participantesDemo || []).forEach(function (p) { total += ((Number.isFinite(p.precioHoy) && p.precioHoy > 0 ? p.precioHoy : normal) - precio) * p.qty; });
    activeParticipations(o.id).forEach(function (p) { var s = p.snapshot || {}; total += ((Number.isFinite(s.priceIndividual) && s.priceIndividual > 0 ? s.priceIndividual : normal) - precio) * (s.qty || 0); });
    return round2(total);
  }
  window.NexoraStore = { proveedorSuspendido: proveedorSuspendido, negociosUnidos: negociosUnidos, pedidoTardio: pedidoTardio, fechaPedido: fechaPedido, entregaTexto: compra.entregaTexto, puntualidad: compra.puntualidad, finDeSemana: function () { return compra.finDeSemana(today()); }, finProximaSemana: function () { return compra.finProximaSemana(today()); }, zonasPorDistrito: zonasPorDistrito, zonasCompatibles: zonasCompatibles, zonaPorDefecto: zonaPorDefecto, marcaCompatible: marcaCompatible, marcaTexto: marcaTexto, descartada: descartada, noMeInteresa: noMeInteresa, deshacerNoMeInteresa: deshacerNoMeInteresa, avisosInternos: avisosInternos, estadosInternos: ESTADOS.slice(), estadoCompra: estadoCompra, estadoVisible: estadoVisible, ahorroEstimado: ahorroEstimado, ahorroGrupo: ahorroGrupo, cantidadTotal: cantidadTotal, tramoActual: tramoActual, precioTramo: precioTramo, precioNormal: precioNormal, faltaSiguienteTramo: faltaSiguienteTramo, alcanzaMinimo: alcanzaMinimo, faltaMinimo: faltaMinimo, resumenCompra: resumenCompra, opportunityNotices: opportunityNotices, opportunityQuestions: opportunityQuestions, askQuestion: askQuestion, updateNeed: updateNeed, noMatchReason: noMatchReason, markNotificationsRead: markNotificationsRead, profileVersion: 1, validateProfile: validateProfile, updateProfile: updateProfileCompleto, buyerActivity: buyerActivity, messagingVersion: 1, ownConversations: ownConversations, conversationById: conversationById, conversationMessages: conversationMessages, unreadConversations: unreadConversations, conversationOpportunity: conversationOpportunity, conversationEligibility: conversationEligibility, openConversation: openConversation, markConversationRead: markConversationRead, saveMessageDraft: saveMessageDraft, sendDemoMessage: sendDemoMessage, get: function () { return state; }, products: catalog, productById: productById, categories: window.NexoraData.categories, zones: zones, today: today, after: after, persist: persist, error: function () { return storageError; }, matches: matches, compatible: compatible, compatibleNeeds: compatibleNeeds, opportunityStatus: opportunityStatus, selectedNeed: selectedNeed, selectNeed: selectNeed, activeParticipations: activeParticipations, participationForNeed: participationForNeed, participationCounts: participationCounts, ownParticipations: ownParticipations, participationById: participationById, participationHistoryForNeed: participationHistoryForNeed, participationHistoryForOpportunity: participationHistoryForOpportunity, ownParticipationCounts: ownParticipationCounts, prepareWithdrawal: prepareWithdrawal, confirmWithdrawal: confirmWithdrawalConRecalculo, canModifyNeed: canModifyNeed, prepareParticipation: prepareParticipation, confirmParticipation: confirmParticipation, validate: validate, register: register, reset: reset, saving: saving, zoneName: function (id) { var z = zones.find(function (z) { return z.id === id; }); return z ? z.name : 'Zona no disponible'; } };
  // Restablecer de esta cuenta: solo lo suyo; lo de los demás negocios sigue.
  function reiniciarCuenta(empty) {
    if (!enCompartido()) return reset(empty);
    if (!shared.reiniciarNegocio(state.user.id, empty)) { storageError = 'No se pudo restablecer. Inténtalo de nuevo.'; return false; }
    state = shared.estado(state.user.id); storageError = '';
    try { sessionStorage.removeItem('nexora.comprador.opportunityFilters'); sessionStorage.removeItem('nexora.comprador.trackingFilters'); sessionStorage.removeItem('nexora.comprador.catalogFilters'); } catch (error) { /* el aviso de abajo repinta igual */ }
    announce('reset'); return true;
  }
  window.NexoraStore.reset = reiniciarCuenta;
  // Lo compartido puede haber cambiado en otra pestaña: cada operación parte de lo último y se repite si hubo choque.
  function refrescar() { if (enCompartido()) state = shared.estado(state.user.id); }
  if (shared && shared.alCambiar) shared.alCambiar(refrescar);
  function transaccional(operacion) {
    return function () {
      var resultado;
      for (var intento = 0; intento < 4; intento++) { conflicto = false; refrescar(); resultado = operacion.apply(this, arguments); if (!conflicto) break; }
      return resultado;
    };
  }
  ['register', 'updateNeed', 'askQuestion', 'selectNeed', 'markNotificationsRead', 'prepareParticipation', 'confirmParticipation', 'prepareWithdrawal', 'confirmWithdrawal', 'noMeInteresa', 'deshacerNoMeInteresa', 'openConversation', 'markConversationRead', 'saveMessageDraft', 'sendDemoMessage', 'updateProfile', 'canModifyNeed'].forEach(function (nombre) {
    if (window.NexoraStore[nombre]) window.NexoraStore[nombre] = transaccional(window.NexoraStore[nombre]);
  });
  if (!storageError && !(access&&access.enabled())) persist();
})();
