(function () {
  if (!window.NexoraDemo.requireSession()) return;
  var store = window.NexoraStore, ui = window.NexoraUI, S = store.get(), hl = {};
  var $ = function (id) { return document.getElementById(id); }, esc = ui.esc, ic = ui.ic, money = ui.money;
  function renderKpis() {
    var act = S.needs.filter(function (n) { return ['Registrada', 'Con coincidencia'].includes(n.status); }).length;
    var ab = S.opps.filter(function (o) { return store.opportunityStatus(o) === 'abierta'; });
    var pot = ab.reduce(function (a, o) { var n = store.selectedNeed(o), v = n ? store.saving(n, o) : null; return a + (v ? Math.max(0, v.total) : 0); }, 0);
    var cur = store.ownParticipationCounts().confirmed;
    var k = [
      [act, 'Necesidades activas', 'Registradas por ti. No incluye borradores.', 'clip', 'l'],
      [ab.length, 'Oportunidades abiertas', 'Incluye oportunidades con participación demo.', 'spark', 'pe'],
      [money(pot), 'Ahorro potencial estimado', 'Solo referencias elegidas con precio válido. Precios demo.', 'coin', 'l'],
      [cur, 'Participaciones confirmadas', 'Registros demostrativos activos; no son compras.', 'users', 'pe']
    ];
    $('kpis').innerHTML = k.map(function (x) { return (x[3] === 'users' ? '<a class="kpi" href="seguimiento.html" aria-label="Ver mi seguimiento">' : '<div class="kpi">') + '<i class="' + x[4] + '">' + ic(x[3]) + '</i><b>' + x[0] + '</b><span>' + x[1] + '</span><small>' + x[2] + '</small>' + (x[3] === 'users' ? '</a>' : '</div>'); }).join('');
    $('sub').textContent = ab.length ? 'Hay ' + ab.length + ' oportunidades de compra conjunta abiertas cerca de ti.' : 'Por ahora no hay oportunidades abiertas. Registra una necesidad y te avisamos.';
  }
  function renderOps() {
    window.NexoraOpportunityCards.render($('ops'), S.opps.filter(function (o) { return store.opportunityStatus(o) === 'abierta'; }), { compact: true });
  }
  function renderLow() {
    $('needs').innerHTML = S.needs.slice(0, 5).map(function (n) { return '<li><div><b>' + esc(n.qty + ' ' + n.unit + ' de ' + n.product.toLowerCase()) + '</b><small>' + esc(n.requiredDate) + ' · ' + (n.priceIndividual === null ? 'Ahorro no calculable: falta precio individual' : 'Precio de referencia ' + money(n.priceIndividual)) + '</small></div><span class="st s-' + n.status.replace(/\s+/g, '-') + '">' + esc(n.status) + '</span></li>'; }).join('');
    var messaging = window.NexoraMessaging;
    $('msgs').innerHTML = messaging ? store.ownConversations().slice().sort(function (a, b) { return ((messaging.preview(b) || b).createdAt || '').localeCompare((messaging.preview(a) || a).createdAt || ''); }).slice(0, 3).map(function (c) { var m = messaging.preview(c), context = messaging.context(c); return '<li><div><a href="mensajes.html?conversacion=' + encodeURIComponent(c.id) + '"><b>' + esc(context.product) + ' · ' + esc(c.interlocutorName) + '</b></a><small>Proveedor sugerido (demo) · ' + (messaging.unread(c) ? 'Sin leer' : 'Sin mensajes pendientes de lectura') + '</small><small>' + esc(m ? m.text : 'Conversación sin mensajes') + '</small></div></li>'; }).join('') || '<li>Todavía no hay conversaciones. Puedes abrir una desde una oportunidad.</li>' : '<li>Mensajería no disponible. Recarga para cargar los archivos actualizados.</li>';

  }
  function renderAll() { S = store.get(); ui.renderIdentity(); renderKpis(); renderOps(); renderLow(); }
  window.NexoraOpportunityCards.bind($('ops'));
  window.addEventListener('nexora-demo-change', function () { hl = {}; renderAll(); });
  window.addEventListener('nexora-demo-matches', function (e) { hl = e.detail; renderOps(); });
  window.NexoraFlow.init({ onSave: renderAll, onClose: function () { $('tx').focus(); }, onOpportunities: function () { location.assign(ui.buyerHref('oportunidades.html')); } });
  renderAll();
})();
