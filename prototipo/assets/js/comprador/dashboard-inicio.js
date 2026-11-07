/* Inicio. Textos: docs/INVENTARIO_CLARIDAD.md, sección 5. Solo lectura del estado;
   el formulario «¿Qué necesitas comprar?» es el del flujo compartido y lleva a Registrar necesidad. */
(function () {
  'use strict';
  if (!window.NexoraDemo.requireSession()) return;
  var store = window.NexoraStore, ui = window.NexoraUI, tx = window.NexoraTesis, view = window.NexoraNeedView, messaging = window.NexoraMessaging;
  var $ = function (id) { return document.getElementById(id); }, esc = ui.esc, money = ui.money;
  var photos = window.NexoraProductImages || {};
  var UNIT_ONE = { botellas: 'botella', bolsas: 'bolsa', paquetes: 'paquete', latas: 'lata', kg: 'kilo' };
  // El formulario compartido con los botones de la página; sus nodos y manejadores no cambian.
  var submit = $('ask').querySelector('button[type="submit"]');
  submit.className = 'nx-btn nx-btn--primary nx-btn--block';
  var decoration = $('ask').querySelector('.note'); if (decoration) decoration.remove();

  function shortDate(iso) { var d = new Date(String(iso) + 'T12:00:00Z'); return Number.isFinite(d.getTime()) ? new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(d) : ''; }
  function thumb(product) { var file = photos[product]; return '<span class="nx-thumb" aria-hidden="true">' + (file ? '<img src="../../assets/images/' + esc(file) + '" alt="">' : ui.ic(store.products[product].icon)) + '</span>'; }
  // Un número clave por tarjeta: el ahorro si hay pedido con precio; si no, el precio en grupo.
  function renderOpportunities(open) {
    $('ops').innerHTML = open.slice(0, 3).map(function (o) {
      var p = store.products[o.product], need = store.selectedNeed(o), saving = need ? tx.ahorro(need, o, { focusable: false }) : null;
      var line = saving && saving.hay ? saving.html : 'Precio en grupo: ' + money(tx.precio(o)) + ' por ' + tx.unitOne(o);
      var href = ui.buyerHref('detalle-oportunidad.html?id=' + encodeURIComponent(o.id) + (need ? '&necesidad=' + encodeURIComponent(need.id) : ''));
      return '<li><a class="nx-card cg-card" href="' + esc(href) + '" aria-label="Ver compra en grupo de ' + esc(p.name) + '">' + thumb(o.product) +
        '<span class="cg-card__body">' + tx.linea(o) + '<span class="cg-card__top"><span class="nx-row__title">' + esc(p.name) + '</span><span class="nx-status nx-status--cierre">Cierra el ' + esc(shortDate(o.closeDate)) + '</span></span>' +
        '<span class="nx-row__meta">' + esc(o.presentation) + '</span><span>' + tx.chipEstado(o) + ' ' + tx.chipLlega(o, need) + '</span>' + tx.mini(o) + '<span class="cg-card__people">' + ui.ic('users') + esc(store.negociosUnidos(o)) + ' negocios</span><span class="cg-card__saving">' + line + '</span></span>' +
        '<svg class="ic nx-row__chev" aria-hidden="true"><use href="#chev"/></svg></a></li>';
    }).join('') || '<li class="nx-empty"><p>Por ahora no hay compras en grupo abiertas. Guarda un pedido y te avisamos.</p></li>';
    $('ops').querySelectorAll('.nx-thumb img').forEach(function (img) { img.addEventListener('error', function () { var box = img.parentElement; img.remove(); box.innerHTML = ui.ic('box'); }); });
  }
  function renderNeeds(state) {
    $('needs').innerHTML = state.needs.slice(0, 4).map(function (n) {
      return '<li><a class="nx-row in-need" href="' + esc(view.detailHref(n)) + '">' + view.thumb(n) + '<span class="nx-row__body"><span class="nx-row__title">' + esc(n.product) + '</span><span class="nx-row__meta">' + esc(view.quantity(n) + ' ' + n.unit + ' · Para el ' + view.shortDate(n.requiredDate)) + '</span></span>' + view.status(n) + '<svg class="ic nx-row__chev" aria-hidden="true"><use href="#chev"/></svg></a></li>';
    }).join('') || '<li class="nx-empty"><p>Aún no guardas pedidos. Escribe el primero aquí al lado.</p></li>';
    ui.bindImages($('needs'));
  }
  function renderMessages() {
    if (!messaging) { $('msgs').innerHTML = '<li>Mensajes no disponibles. Recarga la página.</li>'; return; }
    $('msgs').innerHTML = store.ownConversations().slice().sort(function (a, b) { return ((messaging.preview(b) || b).createdAt || '').localeCompare((messaging.preview(a) || a).createdAt || ''); }).slice(0, 3).map(function (c) {
      var m = messaging.preview(c), context = messaging.context(c), unread = messaging.unread(c);
      return '<li><a href="' + esc(ui.buyerHref('mensajes.html?conversacion=' + encodeURIComponent(c.id))) + '"><span class="in-msgs__who">' + esc(ui.plain(c.interlocutorName)) + (unread ? ' <span class="nx-status nx-status--con-coincidencia">Sin leer</span>' : '') + '</span><small>' + esc(context.product) + '</small><span class="in-msgs__text">' + esc(m ? m.text : 'Aún no hay mensajes.') + '</span></a></li>';
    }).join('') || '<li class="in-msgs__empty">Aún no tienes conversaciones.</li>';
  }
  function render() {
    var state = store.get(), activity = store.buyerActivity();
    var open = state.opps.filter(function (o) { var n = store.selectedNeed(o); return store.opportunityStatus(o) === 'abierta' && !(n && store.descartada(o.id, n.id)); });
    // Solo suma para mostrar; cada ahorro y la elegibilidad vienen del estado.
    var total = open.reduce(function (sum, o) { var need = store.selectedNeed(o), saving = need ? tx.ahorro(need, o) : null; return sum + (saving && saving.hay ? saving.neto : 0); }, 0);
    $('sub').textContent = open.length ? (open.length === 1 ? 'Hay 1 compra en grupo cerca de ti.' : 'Hay ' + open.length + ' compras en grupo cerca de ti.') : 'Por ahora no hay compras en grupo. Guarda un pedido y te avisamos.';
    $('in-saving').textContent = total > 0 ? 'Podrías ahorrar ' + money(total) : 'Aún no calculamos tu ahorro';
    $('in-saving-text').textContent = total > 0 ? 'Ahorro estimado con los pedidos que ya guardaste.' : 'Guarda un pedido con tu precio de hoy y te lo mostramos.';
    var stats = [['<strong>' + esc(activity.needs) + '</strong> ' + (activity.needs === 1 ? 'pedido guardado' : 'pedidos guardados'), 'necesidades.html', 'necesidades', 'clip'],
      ['<strong>' + esc(open.length) + '</strong> ' + (open.length === 1 ? 'compra en grupo abierta' : 'compras en grupo abiertas'), 'oportunidades.html', 'oportunidades', 'spark'],
      [activity.confirmed ? 'Te uniste a <strong>' + esc(activity.confirmed) + '</strong>' : 'Aún no te unes a ninguna', 'seguimiento.html', 'seguimiento', 'users']];
    $('kpis').innerHTML = stats.map(function (s) { return '<a class="nx-card in-stat" href="' + esc(ui.buyerHref(s[1])) + '" data-k="' + s[2] + '"><span class="in-stat__icon" aria-hidden="true">' + ui.ic(s[3]) + '</span><span>' + s[0] + '</span></a>'; }).join('');
    $('preview-business-name').textContent = state.user.business;
    ui.renderIdentity();
    renderOpportunities(open); renderNeeds(state); renderMessages();
  }
  window.addEventListener('nexora-demo-change', render);
  window.addEventListener('nexora-demo-matches', render);
  window.NexoraFlow.init({ registrationPage: 'necesidad-nueva.html', onClose: function () { $('tx').focus(); }, onOpportunities: function () { location.assign(ui.buyerHref('oportunidades.html')); } });
  render();
})();
