/* Detalle de una necesidad (nivel 2 de Mis necesidades). Solo consulta: no modifica el estado.
   Textos: docs/GUIA_CLARIDAD.md y docs/INVENTARIO_CLARIDAD.md (sección 6). */
(function () {
  if (!window.NexoraDemo.requireSession()) return;
  var store = window.NexoraStore, ui = window.NexoraUI, tx = window.NexoraTesis, view = window.NexoraNeedView, esc = ui.esc;
  var $ = function (id) { return document.getElementById(id); };
  var id = new URLSearchParams(location.search).get('id');
  var UNIT_ONE = { botellas: 'botella', bolsas: 'bolsa', paquetes: 'paquete', latas: 'lata', kg: 'kilo' };

  // Dato clave del banner (justo debajo del título).
  function setKey(html) { var el = document.getElementById('dt-key'); if (!el) { el = document.createElement('p'); el.id = 'dt-key'; el.className = 'dt-key'; $('sub').insertAdjacentElement('afterend', el); } el.innerHTML = html; }
  function closeLabel(o) { var d = new Date(String(o.closeDate) + 'T12:00:00Z'); return Number.isFinite(d.getTime()) ? new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(d) : ''; }
  // «¿Qué pasa ahora?»: tres pasos con el actual marcado.
  function next(n, found, joined) {
    if (n.status === 'Borrador') return '<p class="nx-note">' + ui.ic('shield') + '<span>Es un borrador de ejemplo. No buscamos compras en grupo con él.</span></p>';
    var o = found[0];
    if (joined && joined.o || o) return tx.pasos(joined && joined.o || o);
    var steps = joined && joined.o
      ? [['Guardaste tu pedido', 'done', 'clip', 'Ya está guardado'], ['Te uniste', 'done', 'users', 'Estás en la compra'], ['Cierra el ' + closeLabel(joined.o), 'current', 'track', 'Puedes retirarte antes']]
      : o ? [['Guardaste tu pedido', 'done', 'clip', 'Ya está guardado'], ['Hay una compra en grupo', 'done', 'users', 'Mira si te conviene'], ['Únete antes del ' + closeLabel(o), 'current', 'track', 'Tú decides si te unes']]
        : [['Guardaste tu pedido', 'done', 'clip', 'Ya está guardado'], ['Buscamos compras en grupo', 'current', 'search', 'Te avisamos si aparece'], ['Tú decides si te unes', '', 'users', 'Nada se compra sin ti']];
    return '<ol class="nx-steps" aria-label="¿Qué pasa ahora?">' + steps.map(function (s) {
      var cls = s[1] === 'done' ? 'is-done' : s[1] === 'current' ? 'is-current' : '';
      return '<li class="' + cls + '"' + (s[1] === 'current' ? ' aria-current="step"' : '') + '><span class="nx-steps__dot">' + ui.ic(s[2] || 'check') + '</span><span class="nx-steps__t"><b>' + esc(s[0]) + '</b><small>' + esc(s[3] || '') + '</small></span></li>';
    }).join('') + '</ol>';
  }
  function facts(n) {
    var items = [['Cantidad', view.quantity(n) + ' ' + n.unit], ['Lo necesitas para', n.loAntesPosible ? 'Lo antes posible' : view.shortDate(n.requiredDate)], ['Zona', ui.plain(store.zoneName(n.zoneId))],
      ['Hoy pagas', n.priceIndividual == null ? 'Sin indicar' : ui.money(n.priceIndividual)]];
    return '<dl class="dt-facts">' + items.map(function (f) { return '<div><dt>' + esc(f[0]) + '</dt><dd>' + esc(f[1]) + '</dd></div>'; }).join('') + '</dl>';
  }
  // Un número clave por idea.
  function savingLine(n, o) {
    var a = tx.ahorro(n, o);
    return a.html || (Number.isFinite(tx.precio(o)) ? 'Pagarías ' + ui.money(tx.precio(o)) + ' por ' + tx.unitOne(o) + '.' : '');
  }
  function action(n, found, joined) {
    if (joined) return '<section class="nx-card nx-card--raised nd-action"><p class="nx-label">Tu compra en grupo</p><h2 class="nx-h3">Ya te uniste</h2>' +
      '<a class="nx-btn nx-btn--primary nx-btn--block" href="' + esc(ui.buyerHref('participacion.html?id=' + encodeURIComponent(joined.p.id))) + '">Ver mi seguimiento</a></section>';
    var why = found.length ? null : store.noMatchReason(n);
    if (!found.length) return '<section class="nx-card nx-card--raised nd-action nd-empty"><span class="nx-empty__icon" aria-hidden="true">' + ui.ic('search') + '</span><h2 class="nx-h3">Aún no hay compras en grupo para esto</h2><p class="nx-detail">' + esc(why ? why.text : 'Sigue guardado. Te avisamos si aparece.') + '</p>' +
      (why && why.kind === 'date' ? '<a class="nx-btn nx-btn--primary nx-btn--block" href="' + esc(ui.buyerHref('necesidad-nueva.html?editar=' + encodeURIComponent(n.id))) + '">Cambiar mi fecha</a><a class="nx-btn nx-btn--secondary nx-btn--block" href="' + esc(ui.buyerHref('oportunidades.html')) + '">Ver compras en grupo</a>'
        : '<a class="nx-btn nx-btn--primary nx-btn--block" href="' + esc(ui.buyerHref('oportunidades.html')) + '">Ver compras en grupo</a><a class="nx-btn nx-btn--secondary nx-btn--block" href="' + esc(ui.buyerHref('necesidad-nueva.html?editar=' + encodeURIComponent(n.id))) + '">Editar pedido</a>') + '</section>';
    return '<section class="nx-card nx-card--raised nd-action"><p class="nx-label">Qué puedes hacer</p><h2 class="nx-h3">' + (found.length === 1 ? 'Hay una compra en grupo' : 'Hay ' + found.length + ' compras en grupo') + '</h2>' +
      found.map(function (o, i) {
        return '<div class="nd-match"><p>' + tx.linea(o) + '</p><p>' + tx.chipEstado(o) + ' ' + tx.chipLlega(o, n) + '</p>' + tx.mini(o) + '<p class="nd-saving">' + savingLine(n, o) + '</p><p class="nx-detail">Te vende: ' + esc(ui.plain(o.provider) || 'Proveedor') + '</p><p class="nx-detail dt-trust">' + esc(store.negociosUnidos(o)) + ' negocios ya se unieron</p>' +
          '<a class="nx-btn ' + (i ? 'nx-btn--secondary' : 'nx-btn--primary') + ' nx-btn--block" href="' + esc(ui.buyerHref('detalle-oportunidad.html?id=' + encodeURIComponent(o.id) + '&necesidad=' + encodeURIComponent(n.id))) + '">Ver compra en grupo</a></div>';
      }).join('') + '</section>';
  }
  function render() {
    var n = store.get().needs.find(function (x) { return x.id === id; });
    if (!n) {
      document.querySelector('.hello h1').textContent = 'No encontramos esta necesidad';
      $('sub').textContent = 'Pudo haberse reiniciado la demo.';
      $('need-page').innerHTML = '<section class="nx-card nx-empty"><span class="nx-empty__icon">' + ui.ic('clip') + '</span><h2 class="nx-h3">No encontramos esta necesidad</h2><p>Revisa tu lista para elegir otra.</p><a class="nx-btn nx-btn--secondary" href="' + esc(ui.buyerHref('necesidades.html')) + '">Volver a Mis necesidades</a></section>';
      return;
    }
    var found = view.matches(n), p = store.participationForNeed(n.id);
    var joined = p ? { p: p, o: store.get().opps.find(function (o) { return o.id === p.opportunityId; }) } : null;
    document.title = 'NEXORA · ' + n.product;
    document.querySelector('.hello h1').textContent = n.product;
    $('sub').innerHTML = view.status(n) + ' <span>' + esc(n.presentation + ' · ' + view.quantity(n) + ' ' + n.unit) + '</span>';
    var others = store.get().needs.filter(function (x) { return x.id !== n.id; }).slice(0, 3);
    var order = store.get().orders.find(function (o) { return o.id === n.orderId; });
    setKey(esc(view.quantity(n) + ' ' + n.unit) + ' · ' + (n.loAntesPosible ? 'lo antes posible' : 'para el ' + esc(view.shortDate(n.requiredDate))));
    var quote = order && order.text ? '<section class="nx-card dt-wide dt-quote"><h2 class="nx-h3 dt-title">' + ui.ic('chat') + 'Lo que escribiste</h2><p class="nx-quote">«' + esc(order.text) + '»</p></section>' : '';
    var rows = others.length ? '<section class="dt-wide dt-more"><div class="dt-more__head"><h2 class="nx-h3 dt-title">' + ui.ic('clip') + 'Tus otros pedidos</h2><a class="nx-btn nx-btn--tertiary nx-btn--sm" href="' + esc(ui.buyerHref('necesidades.html')) + '">Ver todos →</a></div><ul class="dt-cards">' + others.map(function (x) {
      return '<li><a class="nx-card" href="' + esc(view.detailHref(x)) + '">' + view.thumb(x) + '<span><strong>' + esc(x.product) + '</strong><small>' + esc(view.quantity(x) + ' ' + x.unit) + '</small></span>' + view.status(x) + '</a></li>';
    }).join('') + '</ul></section>' : '';
    var editLink = found.length && ['Registrada', 'Con coincidencia'].includes(n.status) ? '<a class="nx-btn nx-btn--tertiary nx-btn--sm dt-edit" href="' + esc(ui.buyerHref('necesidad-nueva.html?editar=' + encodeURIComponent(n.id))) + '">Editar pedido</a>' : '';
    var saved = new URLSearchParams(location.search).get('guardado') === '1';
    if (saved) { var q = new URLSearchParams(location.search); q.delete('guardado'); history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q.toString() : '')); }
    $('need-page').innerHTML = '<div class="nx-layout dt-grid"><div class="dt-main"><div class="dt-top">' +
      '<section class="nx-card dt-product"><div class="dt-product__top">' + view.thumb(n, true) + '<div><p class="nx-label">Tu pedido</p><h2 class="nx-h2">' + esc(n.product) + '</h2><p class="nx-detail">' + esc(n.presentation + (n.brand ? ' · ' + n.brand : '')) + '</p></div></div>' + facts(n) + editLink + '</section>' +
      '<section class="nx-card dt-steps"><div class="nx-card__head"><h2 class="nx-h3 dt-title">' + ui.ic('track') + '¿Qué pasa ahora?</h2></div>' + next(n, found, joined) + '</section></div>' + quote + rows + '</div>' +
      '<aside class="nx-aside">' + action(n, found, joined) + '</aside></div>';
    view.bindThumbs($('need-page')); ui.renderIdentity();
    if (saved) ui.toast('✓ Cambios guardados');
  }
  window.addEventListener('nexora-demo-change', render);
  render();
})();
