(function () {
  if (!window.NexoraDemo.requireSession()) return;
  var store = window.NexoraStore, ui = window.NexoraUI, summary = window.NexoraParticipationSummary, esc = ui.esc;
  var $ = function (id) { return document.getElementById(id); }, chipGroups = [
    { key: 'tracking-status', box: 'tracking-status-chips', options: [['', 'Todos'], ['Confirmada', 'Te uniste'], ['Retirada', 'Te retiraste']] },
    { key: 'tracking-op-status', box: 'tracking-op-chips', options: [['', 'Todas'], ['abierta', 'Abierta'], ['cerrada', 'Cerrada']] }
  ], vals = { 'tracking-status': '', 'tracking-op-status': '' }, filters = ['tracking-search', 'tracking-status', 'tracking-op-status'];
  function getF(id) { return id === 'tracking-search' ? $(id).value : vals[id]; }
  function setF(id, v) { if (id === 'tracking-search') $(id).value = v; else vals[id] = v; }
  var filterKey = 'nexora.comprador.trackingFilters', params = new URLSearchParams(location.search), target = params.get('participacion');
  try { var saved = JSON.parse(sessionStorage.getItem(filterKey) || '{}'); filters.forEach(function (id) { if (typeof saved[id] === 'string') setF(id, saved[id]); }); } catch (error) { /* Invalid filters do not change participation history. */ }
  if (params.get('necesidad')) { $('tracking-search').value = params.get('necesidad'); params.delete('necesidad'); history.replaceState(null, '', location.pathname + (params.toString() ? '?' + params.toString() : '')); }
  function render() {
    try { var saved = {}; filters.forEach(function (id) { saved[id] = getF(id); }); sessionStorage.setItem(filterKey, JSON.stringify(saved)); } catch (error) { /* Filtering remains usable. */ }
    var all = store.ownParticipations(), counts = store.ownParticipationCounts(), query = $('tracking-search').value.trim().toLowerCase();
    var shown = all.filter(function (p) {
      var s = p.snapshot || {}, o = summary.opportunity(p);
      return (!query || [s.product, s.provider, p.id, p.needId, p.opportunityId, p.orderId].join(' ').toLowerCase().includes(query)) && (!vals['tracking-status'] || p.status === vals['tracking-status']) && (!vals['tracking-op-status'] || (o && store.opportunityStatus(o) === vals['tracking-op-status']));
    });
    chipGroups.forEach(function (g) { $(g.box).innerHTML = g.options.map(function (o) { return '<button type="button" class="nx-chip" data-chip="' + esc(o[0]) + '" aria-pressed="' + (vals[g.key] === o[0]) + '">' + esc(o[1]) + '</button>'; }).join(''); });
    $('tracking-summary').innerHTML = [[counts.confirmed, 'Te uniste'], [counts.withdrawn, 'Te retiraste'], [counts.historical, 'Registros históricos']].map(function (x) { return '<div><b>' + x[0] + '</b><span>' + x[1] + '</span></div>'; }).join('');
    $('tracking-count').textContent = shown.length + ' de ' + all.length + ' participaciones de tu negocio';
    var notice = target && !store.participationById(target) ? 'Participación no encontrada. El identificador no existe para el negocio de esta sesión.' : target && !shown.some(function (p) { return p.id === target; }) ? 'Tus filtros ocultan la participación solicitada. Usa Limpiar filtros para localizarla.' : '';
    if (store.error()) notice += (notice ? ' ' : '') + store.error();
    $('tracking-notice').hidden = !notice; $('tracking-notice').textContent = notice;
    $('tracking-list').innerHTML = shown.length ? shown.map(function (p) {
      return '<article class="tracking-card' + (p.id === target ? ' op-target' : '') + '" tabindex="-1" data-participation-card="' + esc(p.id || '') + '">' + summary.record(p, { hideFollow: true, includeMedia: true }) + (p.id ? '<button class="btn o" type="button" data-participation="' + esc(p.id) + '">Ver detalle de participación</button>' : '<p>Identificador histórico no disponible.</p>') + '</article>';
    }).join('') : '<div class="tracking-empty"><h2>' + (all.length ? 'Sin resultados para estos filtros' : 'Todavía no tienes participaciones') + '</h2><p>' + (all.length ? 'Limpia los filtros para consultar el historial completo de tu negocio.' : 'Registrar una necesidad no confirma una participación. Revisa una oportunidad compatible y decide voluntariamente.') + '</p><a class="btn o" href="oportunidades.html">Consultar Oportunidades</a></div>';
    ui.bindImages($('tracking-list')); ui.renderIdentity();
  }
  function clearFilters() { filters.forEach(function (id) { setF(id, ''); }); render(); }
  $('tracking-search').addEventListener('input', render);
  chipGroups.forEach(function (g) { $(g.box).addEventListener('click', function (e) { var b = e.target.closest('[data-chip]'); if (!b) return; vals[g.key] = b.dataset.chip; render(); }); });
  $('tracking-clear').addEventListener('click', clearFilters);
  // El detalle y el retiro viven en su propia página (participacion.html).
  function detailPage(id) { return ui.buyerHref('participacion.html?id=' + encodeURIComponent(id)); }
  $('tracking-list').addEventListener('click', function (e) { var button = e.target.closest('[data-participation]'); if (button) location.assign(detailPage(button.dataset.participation)); });
  window.addEventListener('nexora-demo-change', function (e) { if (e.detail && e.detail.reason === 'reset') filters.forEach(function (id) { setF(id, ''); }); render(); });
  if (target && store.participationById(target)) { location.replace(detailPage(target)); return; }
  render();
})();
