(function () {
  var store = window.NexoraStore, ui = window.NexoraUI, esc = ui.esc;
  function text(value) { return typeof value === 'string' && value.trim() ? value : 'No registrado'; }
  function price(value) { return Number.isFinite(value) && value >= 0 ? ui.money(value) : 'No registrado'; }
  function realDate(value) {
    if (typeof value !== 'string' || !value || Number.isNaN(Date.parse(value))) return 'Fecha histórica no disponible';
    return new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) + ' · hora de Lima';
  }
  function savingLabel(p) {
    var s = p.savingSnapshot;
    if (s === null) return 'Ahorro no calculable: no hubo un precio individual válido al confirmar.';
    if (!s || !Number.isFinite(s.unit) || !Number.isFinite(s.total) || !Number.isFinite(s.pct) || typeof s.hasSaving !== 'boolean') return 'Información histórica de ahorro no disponible';
    return s.hasSaving === false ? 'Sin ahorro estimado al confirmar' : ui.money(s.total) + ' total · ' + ui.money(s.unit) + ' por unidad · ' + s.pct + '%';
  }
  function participationLabel(p) { return p.status === 'Confirmada' ? 'Te uniste' : p.status === 'Retirada' ? 'Te retiraste' : 'Información de estado no disponible'; }
  function opportunity(p) { return store.get().opps.find(function (o) { return o.id === p.opportunityId; }) || null; }
  function opportunityLabel(p) { var o = opportunity(p), status = o ? store.opportunityStatus(o) : null; return status === 'abierta' ? 'Abierta' : status === 'cerrada' ? 'Cerrada' : 'Información de oportunidad no disponible'; }
  function quantity(p) { var s = p.snapshot || {}; return Number.isFinite(s.qty) && typeof s.unit === 'string' && s.unit ? s.qty + ' ' + s.unit : 'Cantidad histórica no disponible'; }
  function zone(p) { var s = p.snapshot || {}; return s.zoneId ? store.zoneName(s.zoneId) : 'Zona histórica no disponible'; }
  function media(p) { var s = p.snapshot || {}; return store.products[s.productId] ? ui.media(s.productId) : '<span class="product-media l">' + ui.ic('box') + '</span>'; }
  function labels(p) {
    return '<div class="participation-statuses"><span class="chip">Participación: ' + esc(participationLabel(p)) + '</span><span class="chip">Oportunidad: ' + esc(opportunityLabel(p)) + '</span></div>';
  }
  function links(p) {
    var html = opportunity(p) ? '<a class="btn o" href="detalle-oportunidad.html?id=' + encodeURIComponent(p.opportunityId) + '">Ver oportunidad</a>' : '<p>La oportunidad vinculada no está disponible.</p>';
    html += store.get().needs.some(function (n) { return n.id === p.needId; }) ? '<a class="btn o" href="necesidades.html?necesidad=' + encodeURIComponent(p.needId) + '">Consultar necesidad</a>' : '<p>La necesidad vinculada no está disponible; se conserva el registro histórico.</p>';
    return html;
  }
  function record(p, options) {
    var s = p.snapshot || {};
    return '<div class="participation-record">' + labels(p) + '<div class="need-card-heading">' + (options && options.includeMedia ? media(p) : '') + '<div><strong>' + esc(text(s.product) + ' · ' + quantity(p)) + '</strong><p>' + esc(text(s.presentation)) + '</p></div></div><p>Proveedor: ' + esc(text(s.provider)) + ' · ' + esc(zone(p)) + '</p><p>Confirmación real: ' + esc(realDate(p.confirmedAt)) + '</p><p>' + esc(text(p.id) + ' · Necesidad ' + text(p.needId)) + '</p><p>Precio conjunto al confirmar: ' + esc(price(s.priceJoint)) + ' por unidad.</p><p><strong>Ahorro potencial al confirmar:</strong> ' + esc(savingLabel(p)) + '</p>' + (p.status === 'Retirada' ? '<p>Retirada real: ' + esc(realDate(p.withdrawnAt)) + '</p>' : '') + '<p>No representa compra, contrato, pago, entrega ni compromiso comercial real.</p>' + (p.id && !(options && options.hideFollow) ? '<a class="link" href="seguimiento.html?participacion=' + encodeURIComponent(p.id) + '">Ver mi seguimiento</a>' : '') + '</div>';
  }
  function detail(p) {
    var s = p.snapshot || {}, o = opportunity(p);
    var fields = [['Participación', text(p.id)], ['Negocio al confirmar', text(p.business)], ['Oportunidad vinculada', text(p.opportunityId)], ['Necesidad vinculada', text(p.needId)], ['Pedido original', text(p.orderId)], ['Producto al confirmar', text(s.product)], ['Marca al confirmar', typeof s.brand === 'string' ? s.brand || 'Sin especificar' : 'No registrada'], ['Presentación al confirmar', text(s.presentation)], ['Cantidad confirmada', quantity(p)], ['Proveedor al confirmar', text(s.provider)], ['Zona al confirmar', zone(p)], ['Fecha requerida demo', text(s.requiredDate)], ['Confirmación real', realDate(p.confirmedAt)], ['Fecha del escenario al confirmar', text(p.scenarioDateAtConfirmation)], ['Precio individual al confirmar', s.priceIndividual === null ? 'No indicado' : price(s.priceIndividual)], ['Precio conjunto al confirmar', price(s.priceJoint) + ' por unidad'], ['Ahorro potencial al confirmar', savingLabel(p)], ['Cierre actual de oportunidad (demo)', o ? text(o.closeDate) : 'No disponible']];
    if (p.status === 'Retirada') fields.push(['Retirada real', realDate(p.withdrawnAt)], ['Fecha del escenario al retirar', text(p.scenarioDateAtWithdrawal)]);
    return labels(p) + '<div class="need-card-heading">' + media(p) + '<h3>' + esc(text(s.product) + ' · ' + quantity(p)) + '</h3></div><dl class="need-detail-data">' + fields.map(function (f) { return '<dt>' + esc(f[0]) + '</dt><dd>' + esc(f[1]) + '</dd>'; }).join('') + '<p class="need-detail-note">Datos históricos conservados al confirmar. El ahorro no se recalcula con precios actuales. Una oportunidad cerrada no significa compra completada.</p><div class="tracking-actions">' + links(p) + '</div>';
  }
  window.NexoraParticipationSummary = { record: record, detail: detail, labels: labels, media: media, quantity: quantity, zone: zone, savingLabel: savingLabel, participationLabel: participationLabel, opportunityLabel: opportunityLabel, opportunity: opportunity, realDate: realDate };
})();
