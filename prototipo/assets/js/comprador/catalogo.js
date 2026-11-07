/* Catálogo. Textos: docs/INVENTARIO_CLARIDAD.md, sección 10. Solo lectura del estado; la lista es catalogo-seleccion.js. */
(function () {
  function loadError(error) {
    var list = document.getElementById('catalog-list');
    if (list) { list.innerHTML = '<li class="nx-card nx-empty" role="alert"><h2 class="nx-h3">No se pudo cargar el catálogo</h2><p>Recarga la página. Tus datos se conservan.</p><button type="button" class="nx-btn nx-btn--secondary" id="catalog-reload">Recargar</button></li>'; document.getElementById('catalog-reload').addEventListener('click', function () { location.reload(); }); }
    console.error('NEXORA: no se pudo cargar el catálogo.', error);
  }
  try {
  if (!window.NexoraDemo || !window.NexoraDemo.requireSession) throw new Error('Sesión demostrativa no disponible');
  if (!window.NexoraDemo.requireSession()) return;
  if (!window.NexoraStore || !window.NexoraStore.categories || !window.NexoraStore.products || typeof window.NexoraStore.productById !== 'function' || !window.NexoraUI) throw new Error('Dependencias del catálogo incompletas o desactualizadas');
  var store = window.NexoraStore, ui = window.NexoraUI, esc = ui.esc, money = ui.money;
  var $ = function (id) { return document.getElementById(id); }, target = new URLSearchParams(location.search).get('producto');
  var filterKey = 'nexora.comprador.catalogFilters', norm = window.NexoraUtils.normalizar, photos = window.NexoraProductImages || {};
  var UNIT_ONE = { botellas: 'botella', bolsas: 'bolsa', paquetes: 'paquete', latas: 'lata', kg: 'kilo' };
  var ICONS = { abarrotes: 'box', limpieza: 'drop', descartables: 'cup' };
  var category = '';
  try { var saved = JSON.parse(sessionStorage.getItem(filterKey) || '{}'); if (typeof saved.search === 'string') $('catalog-search').value = saved.search; if (Object.prototype.hasOwnProperty.call(store.categories, saved.category)) category = saved.category; } catch (error) { /* Los filtros no afectan los datos. */ }

  // Compra en grupo abierta del mismo producto: un número clave y un enlace.
  function group(id) {
    var o = store.get().opps.find(function (item) { return item.product === id && store.opportunityStatus(item) === 'abierta'; });
    if (!o) return '<p class="cp-card__group cp-card__group--none">Aún no hay compra en grupo.</p>';
    var need = store.selectedNeed(o), s = need ? window.NexoraTesis.ahorro(need, o) : null, mine = store.compatibleNeeds(o).length > 0;
    var line = s && s.hay ? 'Compra en grupo · ' + s.html : 'Compra en grupo: ' + money(window.NexoraTesis.precio(o)) + ' por ' + (UNIT_ONE[o.unit] || o.unit);
    var href = ui.buyerHref('detalle-oportunidad.html?id=' + encodeURIComponent(o.id) + (need ? '&necesidad=' + encodeURIComponent(need.id) : ''));
    return '<p class="cp-card__group">' + line + (mine ? '<small>Tienes un pedido para esto.</small>' : '') + '</p><a class="nx-btn nx-btn--tertiary nx-btn--sm" href="' + esc(href) + '">Ver compra en grupo</a>';
  }
  function card(id) {
    var p = store.productById(id), file = photos[id];
    return '<li class="nx-card cp-card' + (id === target ? ' cp-card--target' : '') + '" data-catalog-card="' + esc(id) + '" id="cp-' + esc(id) + '" tabindex="-1">' +
      '<span class="cp-photo" aria-hidden="true">' + (file ? '<img src="../../assets/images/' + esc(file) + '" alt="">' : ui.ic(p.icon)) + '</span>' +
      '<h3 class="nx-h3">' + esc(p.name) + '</h3><p class="nx-detail">' + esc(p.detail) + '</p>' + group(id) +
      '<button type="button" class="nx-btn nx-btn--secondary nx-btn--block" data-list-product="' + esc(id) + '" aria-pressed="false">Añadir a mi lista</button></li>';
  }
  function renderProducts() {
    try { sessionStorage.setItem(filterKey, JSON.stringify({ search: $('catalog-search').value, category: category })); } catch (error) { /* La búsqueda funciona sin guardarse. */ }
    var ids = Object.keys(store.products), query = norm($('catalog-search').value.trim());
    var searched = ids.filter(function (id) { return !query || norm(store.productById(id).name).includes(query); });
    var shown = searched.filter(function (id) { return !category || store.productById(id).categoryId === category; });
    var chips = [['', 'Todos', 'store']].concat(Object.keys(store.categories).map(function (k) { return [k, store.categories[k].name, ICONS[k] || 'box']; }));
    $('cp-categories').innerHTML = chips.map(function (c) { return '<button type="button" class="nx-chip" data-category="' + c[0] + '" aria-pressed="' + (c[0] === category) + '">' + ui.ic(c[2]) + c[1] + ' <span class="nx-chip__count">' + searched.filter(function (id) { return !c[0] || store.productById(id).categoryId === c[0]; }).length + '</span></button>'; }).join('');
    $('catalog-count').textContent = shown.length + (shown.length === 1 ? ' producto' : ' productos');
    var message = target && !store.productById(target) ? 'Ese producto ya no está en el catálogo.' : target && !shown.includes(target) ? 'Tus filtros ocultan el producto que buscabas. Toca «Todos».' : '';
    $('catalog-notice').hidden = !message; $('catalog-notice').textContent = message;
    $('catalog-list').innerHTML = shown.length ? shown.map(card).join('') : '<li class="nx-card nx-empty"><span class="nx-empty__icon">' + ui.ic('search') + '</span><h2 class="nx-h3">No encontramos productos</h2><p>Prueba otra palabra o toca «Todos».</p><button class="nx-btn nx-btn--secondary" type="button" data-category="" id="catalog-clear">Ver todos</button></li>';
    $('catalog-list').querySelectorAll('.cp-photo img').forEach(function (img) { img.addEventListener('error', function () { var box = img.parentElement, id = box.parentElement.dataset.catalogCard; img.remove(); box.innerHTML = ui.ic(store.productById(id).icon); }); });
    ui.renderIdentity();
  }
  function render() { try { renderProducts(); } catch (error) { loadError(error); } }
  function choose(e) { var b = e.target.closest('[data-category]'); if (!b) return; category = b.dataset.category; if (b.id === 'catalog-clear') $('catalog-search').value = ''; render(); }
  $('cp-categories').addEventListener('click', choose); $('catalog-list').addEventListener('click', choose);
  $('catalog-search').addEventListener('input', render);
  window.addEventListener('nexora-demo-change', function (e) { if (e.detail && e.detail.reason === 'reset') { $('catalog-search').value = ''; category = ''; } render(); });
  render();
  if (target) { var element = $('cp-' + target); if (element) { element.scrollIntoView({ block: 'center' }); element.focus({ preventScroll: true }); } }
  } catch (error) { loadError(error); }
})();
