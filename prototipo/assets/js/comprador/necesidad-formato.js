/* Presentación común de necesidades (lista y detalle). Solo lee el estado; no guarda nada. */
(function () {
  'use strict';
  var store = window.NexoraStore, ui = window.NexoraUI;
  if (!store || !ui) return;
  var esc = ui.esc, photos = window.NexoraProductImages || {};

  function date(value, time) {
    if (!value) return 'No disponible';
    var d = new Date(time ? value : value + 'T12:00:00-05:00');
    if (!Number.isFinite(d.getTime())) return 'No disponible';
    return new Intl.DateTimeFormat('es-PE', Object.assign({ timeZone: 'America/Lima', day: '2-digit', month: 'short', year: 'numeric' }, time ? { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false } : {})).format(d);
  }
  // Distingue registros idénticos creados en el mismo pedido («Registro 1 de 2»).
  function twin(n) {
    var twins = store.get().needs.filter(function (x) { return x.productId === n.productId && x.presentation === n.presentation && x.qty === n.qty && x.unit === n.unit && x.createdAt === n.createdAt; });
    return twins.length > 1 ? 'Registro ' + (twins.findIndex(function (x) { return x.id === n.id; }) + 1) + ' de ' + twins.length : '';
  }
  function registered(n) { return date(n.createdAt, true) + ' · Lima' + (twin(n) ? ' · ' + twin(n) : ''); }
  function matches(n) { return store.get().opps.filter(function (o) { return store.compatible(n, o); }); }
  function quantity(n) { return n.qty == null ? 'Por completar' : String(n.qty); }
  // Nombres claros para el comprador; el estado guardado no cambia.
  var LABELS = { 'Registrada': 'Guardada', 'Con coincidencia': 'Con compra en grupo', 'Borrador': 'Borrador' };
  function label(status) { return LABELS[status] || status; }
  function shortDate(value) {
    var d = new Date(String(value) + 'T12:00:00-05:00');
    return Number.isFinite(d.getTime()) ? new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', weekday: 'short', day: 'numeric', month: 'short' }).format(d) : 'Sin fecha';
  }
  function statusSlug(status) { return String(status).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-'); }
  function status(n) { return '<span class="nx-status nx-status--' + esc(statusSlug(n.status)) + '">' + esc(label(n.status)) + '</span>'; }
  function thumb(n, large) {
    var p = store.productById(n.productId), file = photos[n.productId];
    return '<span class="nx-thumb' + (large ? ' nx-thumb--lg' : '') + '" aria-hidden="true">' + (file ? '<img src="../../assets/images/' + esc(file) + '" alt="">' : ui.ic(p ? p.icon : 'box')) + '</span>';
  }
  // Si la foto falla, vuelve al icono del producto.
  function bindThumbs(root) {
    root.querySelectorAll('.nx-thumb img').forEach(function (img) {
      img.addEventListener('error', function () { var box = img.parentElement; img.remove(); box.innerHTML = ui.ic('box'); });
    });
  }
  function detailHref(n) { return ui.buyerHref('necesidad.html?id=' + encodeURIComponent(n.id)); }

  window.NexoraNeedView = { label: label, shortDate: shortDate, date: date, registered: registered, twin: twin, matches: matches, quantity: quantity, status: status, statusSlug: statusSlug, thumb: thumb, bindThumbs: bindThumbs, detailHref: detailHref };
})();
