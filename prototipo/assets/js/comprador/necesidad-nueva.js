/* Registrar necesidad (nivel 2 de Mis necesidades): el flujo compartido en modo página.
   Entradas: ?producto=ID (desde Catálogo) y #pedido=texto (desde Inicio). */
(function () {
  if (!window.NexoraDemo.requireSession()) return;
  var store = window.NexoraStore, ui = window.NexoraUI, flow = window.NexoraFlow;
  document.querySelector('.hello h1').textContent = 'Registrar necesidad';
  document.getElementById('sub').textContent = 'Escribe, revisa y guarda tu pedido.';
  flow.init({});
  // Lista del Catálogo: mismo borrador temporal y mismos controles que antes tenía el modal.
  function openCatalogList() {
    if (!window.NexoraCatalogDraft) return false;
    var draft = window.NexoraCatalogDraft.create(sessionStorage, store), state = draft.get();
    if (state.status !== 'editing' || !state.items.length || draft.error().includes('recuperar')) { ui.toast(draft.error() || 'Tu lista del Catálogo está vacía o ya se guardó.'); return false; }
    return flow.openProducts(state, {
      onDraft: function (value) { return draft.update(value); },
      beforeRegister: function (value) { return draft.begin(value); },
      onFailure: function (value) { return draft.failed(value); },
      onRegistered: function (needs) { draft.complete(needs); if (draft.error()) ui.toast(draft.error()); }
    });
  }
  var params = new URLSearchParams(location.search), product = params.get('producto'), editId = params.get('editar');
  var text = new URLSearchParams(location.hash.slice(1)).get('pedido') || '';
  // El texto del pedido no queda en la barra de direcciones.
  if (location.hash) history.replaceState(null, '', location.pathname + location.search);
  if (editId) {
    var edited = store.get().needs.find(function (n) { return n.id === editId; });
    document.querySelector('.hello h1').textContent = 'Editar pedido';
    document.getElementById('sub').textContent = edited ? edited.product + ' · ' + edited.presentation : 'Cambia tu pedido guardado.';
    document.title = 'NEXORA · Editar pedido';
    if (flow.openEdit(editId)) return ui.renderIdentity();
  }
  if (params.get('lista') === 'catalogo' && openCatalogList()) return ui.renderIdentity();
  if (product && store.productById(product)) flow.openProduct(product); else flow.open(text);
  ui.renderIdentity();
})();
