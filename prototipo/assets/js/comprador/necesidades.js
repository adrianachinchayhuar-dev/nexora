/* Mis necesidades: lista con búsqueda y filtro por estado. El detalle es la página necesidad.html;
   el registro y sus reglas pertenecen al flujo compartido (flujo-necesidad.js). */
(function () {
  if (!window.NexoraDemo.requireSession()) return;
  var store = window.NexoraStore, ui = window.NexoraUI, view = window.NexoraNeedView, esc = ui.esc;
  var $ = function (id) { return document.getElementById(id); };
  var STATUSES = ['Registrada', 'Con coincidencia', 'Borrador'];
  var filter = '';
  $('sub').textContent = 'Revisa qué necesitas y encuentra oportunidades para tu negocio.';

  // Enlaces antiguos: el detalle y el registro son ahora páginas propias.
  var params = new URLSearchParams(location.search), requested = params.get('necesidad'), product = params.get('producto');
  if (requested) { location.replace(ui.buyerHref('necesidad.html?id=' + encodeURIComponent(requested))); return; }
  if (product && store.productById(product)) { location.replace(ui.buyerHref('necesidad-nueva.html?producto=' + encodeURIComponent(product))); return; }
  if (params.get('nueva') === '1') { location.replace(ui.buyerHref('necesidad-nueva.html')); return; }

  function start() { location.assign(ui.buyerHref('necesidad-nueva.html')); }
  function chips(needs) {
    return [''].concat(STATUSES).map(function (s) {
      var count = s ? needs.filter(function (n) { return n.status === s; }).length : needs.length;
      return '<button type="button" class="nx-chip" data-status="' + esc(s) + '" aria-pressed="' + (s === filter) + '">' + esc(s ? view.label(s) : 'Todas') + ' <span class="nx-chip__count">' + count + '</span></button>';
    }).join('');
  }
  function row(n) {
    var found = view.matches(n).length;
    return '<li><a class="nx-row" href="' + esc(view.detailHref(n)) + '">' + view.thumb(n) +
      '<span class="nx-row__body"><span class="nx-row__title">' + esc(n.product) + '</span><span class="nx-row__meta">' + esc(n.presentation) + ' · Para el ' + esc(view.shortDate(n.requiredDate)) + (view.twin(n) ? ' · ' + esc(view.twin(n)) : '') + '</span>' +
      (found ? '<span class="nx-row__hint">' + ui.ic('spark') + (found === 1 ? 'Hay una compra en grupo' : 'Hay ' + found + ' compras en grupo') + '</span>' : '') + '</span>' +
      '<span class="nx-row__figure"><strong>' + esc(view.quantity(n)) + '</strong><small>' + esc(n.unit) + '</small></span>' +
      view.status(n) + '<svg class="ic nx-row__chev" aria-hidden="true"><use href="#chev"/></svg></a></li>';
  }
  function empty(hasNeeds) {
    return '<li class="nx-empty"><span class="nx-empty__icon">' + ui.ic('clip') + '</span><h3 class="nx-h3">' + (hasNeeds ? 'No encontramos resultados' : 'Tu lista está vacía') + '</h3>' +
      '<p>' + (hasNeeds ? 'Prueba otro producto o cambia el estado.' : 'Guarda lo que necesita tu negocio y buscamos compras en grupo.') + '</p>' +
      '<button id="empty-action" type="button" class="nx-btn ' + (hasNeeds ? 'nx-btn--secondary' : 'nx-btn--primary') + '">' + (hasNeeds ? 'Limpiar filtros' : 'Registrar necesidad') + '</button></li>';
  }
  function render() {
    var needs = store.get().needs, query = $('needs-search').value.trim().toLocaleLowerCase('es');
    var list = needs.filter(function (n) { return (!query || [n.product, n.presentation, n.brand].join(' ').toLocaleLowerCase('es').includes(query)) && (!filter || filter === n.status); });
    $('needs-status').innerHTML = chips(needs);
    $('needs-count').textContent = list.length === needs.length ? needs.length + (needs.length === 1 ? ' necesidad' : ' necesidades') : list.length + ' de ' + needs.length;
    $('needs-list').innerHTML = list.length ? list.map(row).join('') : empty(needs.length > 0);
    view.bindThumbs($('needs-list')); ui.renderIdentity();
  }
  $('needs-search').addEventListener('input', render);
  $('needs-status').addEventListener('click', function (e) { var b = e.target.closest('[data-status]'); if (!b) return; filter = b.dataset.status; render(); });
  $('needs-list').addEventListener('click', function (e) {
    if (!e.target.closest('#empty-action')) return;
    if (store.get().needs.length) { $('needs-search').value = ''; filter = ''; render(); } else start();
  });
  window.addEventListener('nexora-demo-change', render);
  render();
})();
