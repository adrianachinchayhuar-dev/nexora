/* Compras en grupo (lista). Textos: docs/INVENTARIO_CLARIDAD.md, sección 7. Solo lectura del estado. */
(function () {
  if (!window.NexoraDemo.requireSession()) return;
  var store = window.NexoraStore, ui = window.NexoraUI, tx = window.NexoraTesis, esc = ui.esc, money = ui.money;
  var $ = function (id) { return document.getElementById(id); };
  var target = new URLSearchParams(location.search).get('oportunidad'), photos = window.NexoraProductImages || {};
  var UNIT_ONE = { botellas: 'botella', bolsas: 'bolsa', paquetes: 'paquete', latas: 'lata', kg: 'kilo' };
  var CHIPS = [['para-ti', 'Para ti'], ['abiertas', 'Abiertas'], ['cerradas', 'Cerradas'], ['todas', 'Todas'], ['ocultadas', 'Ocultadas']];
  var filterKey = 'nexora.comprador.opportunityFilters', chip = 'todas';
  try { var saved = JSON.parse(sessionStorage.getItem(filterKey) || '{}'); if (typeof saved.search === 'string') $('op-search').value = saved.search; if (CHIPS.some(function (c) { return c[0] === saved.chip; })) chip = saved.chip; } catch (error) { /* Los filtros no afectan los datos. */ }

  function shortDate(iso) { var d = new Date(String(iso) + 'T12:00:00Z'); return Number.isFinite(d.getTime()) ? new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(d) : ''; }
  function isOpen(o) { return store.opportunityStatus(o) === 'abierta'; }
  function forYou(o) { return isOpen(o) && store.compatibleNeeds(o).length > 0; }
  function hidden(o) { var n = isOpen(o) ? store.selectedNeed(o) : null; return !!n && store.descartada(o.id, n.id); }
  function matches(o, key) { if (key === 'ocultadas') return hidden(o); if (hidden(o)) return false; return key === 'para-ti' ? forYou(o) : key === 'abiertas' ? isOpen(o) : key === 'cerradas' ? !isOpen(o) : true; }
  // Un número clave por idea: precio del tramo y, si hay pedido, el ahorro estimado.
  function saving(o, need) {
    var a = need ? tx.ahorro(need, o, { focusable: false }) : null;
    return a && a.hay ? a.html : 'Precio en grupo hoy: ' + money(tx.precio(o)) + ' por ' + tx.unitOne(o);
  }
  function discardButton(o, need) {
    if (!need || !isOpen(o) || store.participationForNeed(need.id)) return '';
    var off = store.descartada(o.id, need.id);
    return '<div class="tx-item__acciones"><button type="button" class="nx-btn nx-btn--tertiary nx-btn--sm" data-' + (off ? 'mostrar' : 'descartar') + '="' + esc(o.id) + '" data-need="' + esc(need.id) + '">' + (off ? 'Volver a mostrar' : 'No me interesa') + '</button></div>';
  }
  function card(o) {
    var p = store.products[o.product], open = isOpen(o), need = open ? store.selectedNeed(o) : null, candidates = open ? store.compatibleNeeds(o) : [], file = photos[o.product];
    var href = ui.buyerHref('detalle-oportunidad.html?id=' + encodeURIComponent(o.id) + (need ? '&necesidad=' + encodeURIComponent(need.id) : ''));
    var mine = need ? 'Tu pedido: ' + need.qty + ' ' + need.unit : candidates.length ? 'Tienes ' + candidates.length + ' pedidos para esto' : open ? 'No tienes un pedido para este producto' : '';
    return '<li class="tx-item' + (discardButton(o, need) ? ' tx-item--acc' : '') + '"><a class="nx-card cg-card' + (o.id === target ? ' cg-card--target' : '') + '" id="op-' + esc(o.id) + '" tabindex="-1" href="' + esc(href) + '">' +
      '<span class="nx-thumb" aria-hidden="true">' + (file ? '<img src="../../assets/images/' + esc(file) + '" alt="">' : ui.ic(p.icon)) + '</span>' +
      '<span class="cg-card__body">' + (open ? tx.linea(o) : '') + '<span class="cg-card__top"><span class="nx-row__title">' + esc(p.name) + '</span><span class="nx-status ' + (open ? 'nx-status--cierre' : 'nx-status--cerrada') + '">' + (open ? 'Cierra el ' + esc(shortDate(o.closeDate)) : 'Cerró el ' + esc(shortDate(o.closeDate))) + '</span></span>' +
      '<span class="nx-row__meta">' + esc(o.presentation + ' · ' + ui.plain(o.provider)) + '</span><span>' + tx.chipEstado(o) + ' ' + (open ? tx.chipLlega(o, need) : '') + '</span><span class="cg-card__people">' + ui.ic('users') + esc(store.negociosUnidos(o)) + ' negocios</span>' +
      (open ? tx.mini(o) : '') + '<span class="cg-card__saving">' + saving(o, need) + '</span>' + (mine ? '<span class="nx-row__meta">' + esc(mine) + '</span>' : '') + '</span>' +
      '<svg class="ic nx-row__chev" aria-hidden="true"><use href="#chev"/></svg></a>' + discardButton(o, need) + '</li>';
  }
  function render() {
    try { sessionStorage.setItem(filterKey, JSON.stringify({ search: $('op-search').value, chip: chip })); } catch (error) { /* Los filtros siguen funcionando sin guardarse. */ }
    var all = store.get().opps, query = $('op-search').value.trim().toLocaleLowerCase('es');
    var searched = all.filter(function (o) { return !query || (store.products[o.product].name + ' ' + o.provider + ' ' + o.presentation).toLocaleLowerCase('es').includes(query); });
    var shown = searched.filter(function (o) { return matches(o, chip); });
    $('op-chips').innerHTML = CHIPS.map(function (c) { return '<button type="button" class="nx-chip" data-chip="' + c[0] + '" aria-pressed="' + (c[0] === chip) + '">' + c[1] + ' <span class="nx-chip__count">' + searched.filter(function (o) { return matches(o, c[0]); }).length + '</span></button>'; }).join('');
    $('op-count').textContent = shown.length + (shown.length === 1 ? ' compra en grupo' : ' compras en grupo');
    $('op-notice').hidden = !(target && !shown.some(function (o) { return o.id === target; }));
    $('op-notice').textContent = target && !all.some(function (o) { return o.id === target; }) ? 'Esa compra en grupo ya no existe.' : 'Tus filtros ocultan la compra que buscabas. Toca «Todas».';
    $('op-list').innerHTML = shown.length ? shown.map(card).join('') : '<li class="nx-card nx-empty"><span class="nx-empty__icon">' + ui.ic('spark') + '</span><h2 class="nx-h3">' + (chip === 'ocultadas' ? 'No ocultaste ninguna compra' : chip === 'para-ti' ? 'Aún no hay compras en grupo para tus pedidos' : 'No encontramos compras en grupo') + '</h2><p>' + (chip === 'ocultadas' ? 'Las que ocultes con «No me interesa» aparecen aquí.' : chip === 'para-ti' ? 'Guarda un pedido y te mostramos las que coincidan.' : 'Prueba otra palabra o toca «Todas».') + '</p>' + (chip === 'para-ti' ? '<a class="nx-btn nx-btn--primary" href="' + esc(ui.buyerHref('necesidad-nueva.html')) + '">Registrar necesidad</a>' : '<button class="nx-btn nx-btn--secondary" type="button" data-chip="todas" id="op-clear">Ver todas</button>') + '</li>';
    $('op-list').querySelectorAll('.nx-thumb img').forEach(function (img) { img.addEventListener('error', function () { var box = img.parentElement; img.remove(); box.innerHTML = ui.ic('box'); }); });
    ui.renderIdentity();
  }
  function choose(e) { var b = e.target.closest('[data-chip]'); if (!b) return; chip = b.dataset.chip; if (b.id === 'op-clear') $('op-search').value = ''; render(); }
  function off(e) {
    var d = e.target.closest('[data-descartar]'), m = e.target.closest('[data-mostrar]');
    if (d) tx.descartar(d.dataset.descartar, d.dataset.need, render);
    if (m) { var r = store.deshacerNoMeInteresa(m.dataset.mostrar, m.dataset.need); ui.toast(r.error || 'Volvimos a mostrar esta compra.'); render(); }
  }
  $('op-list').addEventListener('click', off);
  $('op-chips').addEventListener('click', choose); $('op-list').addEventListener('click', choose);
  $('op-search').addEventListener('input', render);
  window.addEventListener('nexora-demo-change', function (e) { if (e.detail && e.detail.reason === 'reset') { $('op-search').value = ''; chip = 'todas'; } render(); });
  render();
  if (target) { var element = $('op-' + target); if (element) { element.scrollIntoView({ block: 'start' }); element.focus({ preventScroll: true }); } }
})();
