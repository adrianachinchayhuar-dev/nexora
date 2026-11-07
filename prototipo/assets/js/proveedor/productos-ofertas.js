(function () {
  'use strict';
  if (new URLSearchParams(location.search).get('vista') !== 'precios') return;
  var ui = window.NexoraProviderUI, store = window.NexoraProviderState, dirty = false;
  window.addEventListener('beforeunload', function (e) { if (dirty) { e.preventDefault(); e.returnValue = ''; } });
  var pictures = { aceite:'producto-aceite.png', vasos:'producto-vasos.png', arroz:'producto-arroz.png', leche:'producto-leche.png', detergente:'producto-detergente.png', fideos:'producto-fideos.png' };
  function picture(g) { var file = pictures[g.product.id]; return file ? '<img src="../../assets/images/' + file + '" alt="' + ui.esc(g.product.name) + '" width="140" height="140">' : ui.media(g); }
  ui.start(function (source) {
    var root = document.getElementById('provider-content');
    if (!source.ok) { ui.error(root, source.message); return; }
    var saved = store.drafts();
    if (saved.error) { ui.error(root, saved.error); return; }
    root.innerHTML = '<a class="cat-back-link" href="' + ui.href('productos-ofertas.html') + '">← Mi catálogo</a><h2>Precios para compras existentes</h2><p class="po-private">' + ui.icon('user') + '<span>Borrador privado: los compradores aún no lo ven.</span></p><p id="offer-status" role="status"></p><div id="offer-products"></div><section id="offer-dialog" data-edicion class="nx-card provider-editor po-editor" aria-labelledby="offer-title" hidden><form id="offer-form" novalidate><div class="po-editor-head"><span class="po-eyebrow">BORRADOR PRIVADO</span><h2 id="offer-title">Borrador privado</h2></div><aside class="po-reference"><span class="po-eyebrow">DATOS DE REFERENCIA</span><h3 id="offer-context"></h3><p id="offer-reference"></p><p>Estos datos corresponden a la compra en grupo.</p></aside><div class="po-fields"><label for="offer-price">Tu precio por unidad (S/)</label><input id="offer-price" name="price" type="text" inputmode="decimal" required aria-describedby="offer-price-help offer-error"><small id="offer-price-help">Usa un precio mayor a cero, con hasta dos decimales.</small><label for="offer-observation">Nota (opcional)</label><textarea id="offer-observation" name="observation" maxlength="500" rows="3" aria-describedby="offer-error"></textarea><small>Máximo 500 caracteres.</small><p id="offer-error" role="alert"></p><div class="provider-actions"><button type="button" class="nx-btn nx-btn--secondary" id="offer-cancel">Cancelar</button><button type="submit" class="nx-btn nx-btn--primary">Guardar borrador</button></div></div></form></section><div class="po-next">' + ui.next(['Elige un producto','Prepara tu borrador','Guárdalo para ti']) + '</div>';
    if (typeof document.querySelector === 'function') {
      var role = document.querySelector('#provider-side .provider-role'); if (role) role.textContent = 'Portal del proveedor';
      var title = document.querySelector('.provider-top .hello h1'); if (title) title.textContent = 'Precios por compra';
      var description = document.querySelector('.provider-top .hello p'); if (description) description.textContent = 'Guarda tu precio para cada compra en grupo';
      var business = document.querySelector('#provider-side .biz');
      if (business && !document.getElementById('po-sidebar-art')) business.insertAdjacentHTML('beforebegin','<div class="po-sidebar-art" id="po-sidebar-art"><img src="../../assets/images/sidebar-proveedor.png" width="1106" height="1422" alt=""><p>Tu negocio, conectado<br>con más posibilidades.</p></div>');
    }
    var dialog = document.getElementById('offer-dialog'), form = document.getElementById('offer-form'), price = document.getElementById('offer-price'), note = document.getElementById('offer-observation'), error = document.getElementById('offer-error'), selected, opener, initial;
    function cards() {
      var groups = [];
      source.opportunities.forEach(function (o) { var group = groups.find(function (g) { return g.product.id === o.product.id; }); if (!group) { group = { product: o.product, opportunities: [] }; groups.push(group); } group.opportunities.push(o); });
      document.getElementById('offer-products').innerHTML = groups.length ? '<div class="po-grid">' + groups.map(function (g) { return '<article class="po-card"><div class="po-product-head"><div class="po-photo">' + picture(g) + '</div><div><span class="po-eyebrow">TU PRODUCTO</span><h2>' + ui.esc(g.product.name) + '</h2></div></div>' + g.opportunities.map(function (o) {
        var draft = saved.items.find(function (d) { return d.opportunityId === o.id; });
        var unit = ({botellas:'botella',paquetes:'paquete',bolsas:'bolsa'})[o.unit] || o.unit;
        return '<section class="po-option"><div class="po-option-head"><div><h3>' + ui.esc(o.presentation) + '</h3><p>' + ui.icon('home') + ui.esc(o.zone) + '</p></div><span class="nx-status' + (o.status === 'cerrada' ? ' nx-status--cerrada' : '') + '">' + ui.stateLabel(o) + '</span></div><div class="po-prices"><div class="po-group-price"><span>Precio en grupo</span><strong>' + ui.esc(ui.money(o.priceJoint)) + '</strong><small>Por ' + ui.esc(unit) + '</small></div><div class="po-draft-price' + (draft ? ' is-saved' : '') + '"><span>' + (draft ? 'Borrador privado' : 'Aún no pones tu precio') + '</span>' + (draft ? '<strong>' + ui.esc(ui.money(draft.price)) + '</strong><small>Tu precio por ' + ui.esc(unit) + '</small>' : '<p>Escríbelo y guárdalo para ti.</p>') + '</div></div>' + (draft && draft.observation ? '<p class="po-draft-note">' + ui.esc(draft.observation) + '</p>' : '') + '<div class="provider-actions po-card-actions">' + (o.status === 'abierta' ? '<button class="nx-btn nx-btn--primary" type="button" data-offer="' + ui.esc(o.id) + '">' + (draft ? 'Cambiar mi precio' : 'Poner mi precio') + '</button>' : '<p class="po-closed">Cerró. Puedes consultar tu borrador.</p>') + '<a class="nx-btn nx-btn--secondary" href="' + ui.esc(ui.href('detalle-oportunidad.html?id=' + encodeURIComponent(o.id))) + '">Ver compra en grupo</a></div></section>';
      }).join('') + '</article>'; }).join('') + '</div>' : '<section class="provider-panel"><h2>No tienes productos para ofrecer</h2><p>Aquí verás tus productos cuando tengas compras en grupo.</p></section>';
      document.getElementById('offer-products').querySelectorAll('[data-offer]').forEach(function (button) { button.addEventListener('click', function () {
        if (dirty && !window.confirm('¿Descartar los cambios sin guardar? Tu borrador anterior se conservará.')) return;
        selected = button.dataset.offer; opener = button;
        var o = source.opportunities.find(function (item) { return item.id === selected; }), d = saved.items.find(function (item) { return item.opportunityId === selected; });
        document.getElementById('offer-title').textContent = d ? 'Editar borrador privado' : 'Crear borrador privado';
        document.getElementById('offer-context').textContent = o.product.name + ' · ' + o.presentation ;
        document.getElementById('offer-reference').textContent = o.zone.replace(/\s*\(demo\)/gi, '') + ' · Precio en grupo: ' + ui.money(o.priceJoint);
        price.value = d ? String(d.price) : ''; note.value = d ? d.observation : ''; initial = [price.value, note.value].join('\n'); error.textContent = ''; dirty = false; dialog.hidden = false; price.focus();
      }); });
    }
    function cancel() { if (dirty && !window.confirm('¿Descartar los cambios sin guardar de este borrador? La versión guardada se conservará.')) return; dirty = false; dialog.hidden = true; if (opener && opener.isConnected) opener.focus(); }
    form.addEventListener('input', function () { dirty = [price.value, note.value].join('\n') !== initial; });
    document.getElementById('offer-cancel').addEventListener('click', cancel);
    form.addEventListener('submit', function (e) {
      e.preventDefault(); var result = store.saveDraft(selected, price.value, note.value);
      if (result.error) { error.textContent = result.error; price.focus(); return; }
      dirty = false; dialog.hidden = true; saved = store.drafts(); cards(); document.getElementById('offer-status').textContent = 'Borrador privado guardado.'; ui.toast('✓ Borrador guardado. Los compradores aún no lo ven.');
      var button = document.getElementById('offer-products').querySelector('[data-offer="' + selected + '"]'); if (button) button.focus();
    });
    cards();
  });
})();
