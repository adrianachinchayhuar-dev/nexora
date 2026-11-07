/* Detalle de participación (nivel 2 de Seguimiento). Textos: docs/INVENTARIO_CLARIDAD.md, sección 1.
   Retirarse usa las mismas reglas del estado (prepareWithdrawal → confirmWithdrawal). */
(function () {
  if (!window.NexoraDemo.requireSession()) return;
  var store = window.NexoraStore, ui = window.NexoraUI, tx = window.NexoraTesis, summary = window.NexoraParticipationSummary, esc = ui.esc;
  var $ = function (id) { return document.getElementById(id); };
  var id = new URLSearchParams(location.search).get('id'), photos = window.NexoraProductImages || {};
  var UNIT_ONE = { botellas: 'botella', bolsas: 'bolsa', paquetes: 'paquete', latas: 'lata', kg: 'kilo' };
  var reviewed = null, busy = false, confirming = false;
  // Dato clave del banner (justo debajo del título).
  function setKey(html) { var el = document.getElementById('dt-key'); if (!el) { el = document.createElement('p'); el.id = 'dt-key'; el.className = 'dt-key'; $('sub').insertAdjacentElement('afterend', el); } el.innerHTML = html; }

  function shortDate(iso) {
    var d = new Date(String(iso) + 'T12:00:00Z');
    return Number.isFinite(d.getTime()) ? new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(d) : '';
  }
  // «¿Qué pasa ahora?»: tres pasos, el actual marcado.
  function timeline(p, o) {
    var open = o && store.opportunityStatus(o) === 'abierta', close = shortDate(o ? o.closeDate : (p.snapshot || {}).closeDate), joined = p.status === 'Confirmada';
    if (joined && o) return tx.pasos(o);
    var steps = joined
      ? [['Te uniste', 'done', 'users', 'Estás dentro de la compra'], [open ? 'Cierra el ' + close : 'Cerró el ' + close, open ? 'current' : 'done', 'track', open ? 'Puedes retirarte antes' : 'Ya no se puede retirar'], [open ? 'Resultado' : 'Contacto', open ? '' : 'current', 'chat', open ? 'En la versión real, te avisaríamos el resultado' : 'En la versión real, el proveedor te contactaría']]
      : [['Te uniste', 'done', 'users', 'Antes de retirarte'], ['Te retiraste', 'done', 'back', 'Ya no participas'], [open ? 'Volver a unirte' : 'La compra cerró', 'current', 'track', open ? 'Mientras siga abierta' : 'Ya no admite uniones']];
    return '<ol class="nx-steps" aria-label="¿Qué pasa ahora?">' + steps.map(function (s) {
      var cls = s[1] === 'done' ? 'is-done' : s[1] === 'current' ? 'is-current' : '';
      return '<li class="' + cls + '"' + (s[1] === 'current' ? ' aria-current="step"' : '') + '><span class="nx-steps__dot">' + ui.ic(s[2] || 'check') + '</span><span class="nx-steps__t"><b>' + esc(s[0]) + '</b><small>' + esc(s[3] || '') + '</small></span></li>';
    }).join('') + '</ol>';
  }
  function thumb(p) {
    var s = p.snapshot || {}, product = store.products[s.productId], file = photos[s.productId];
    return '<span class="nx-thumb nx-thumb--lg" aria-hidden="true">' + (file ? '<img src="../../assets/images/' + esc(file) + '" alt="">' : ui.ic(product ? product.icon : 'box')) + '</span>';
  }
  function render() {
    var p = store.participationById(id);
    if (!p) {
      document.querySelector('.hello h1').textContent = 'No encontramos esta compra';
      $('sub').textContent = 'Pudo haberse reiniciado la demo.';
      $('participation-page').innerHTML = '<section class="nx-card nx-empty"><span class="nx-empty__icon">' + ui.ic('track') + '</span><h2 class="nx-h3">No encontramos esta participación</h2><p>Revisa Seguimiento para elegir otra.</p><a class="nx-btn nx-btn--secondary" href="' + esc(ui.buyerHref('seguimiento.html')) + '">Volver a Seguimiento</a></section>';
      return;
    }
    var s = p.snapshot || {}, o = summary.opportunity(p), joined = p.status === 'Confirmada';
    var need = store.get().needs.find(function (n) { return n.id === p.needId; }), compatible = !!(o && need && store.compatible(need, o));
    var canLeave = !store.prepareWithdrawal(p.id).error;
    document.title = 'NEXORA · ' + (s.product || 'Participación');
    document.querySelector('.hello h1').textContent = s.product || 'Compra en grupo';
    $('sub').innerHTML = '<span class="nx-status ' + (joined ? 'nx-status--confirmada' : 'nx-status--cerrada') + '">' + (joined ? 'Te uniste' : 'Te retiraste') + '</span> ' + (o ? tx.chipEstado(o) + ' ' + tx.chipLlega(o, s) + ' ' : '') + '<span>' + esc(ui.plain(s.presentation) + ' · ' + summary.quantity(p)) + '</span>';
    var ah = joined && o && need ? tx.ahorro(need, o) : null;
    setKey(ah && ah.hay ? ah.html : o ? 'Precio en grupo ahora <strong>' + ui.money(tx.precio(o)) + '</strong>' : Number.isFinite(s.priceJoint) ? 'Pagas <strong>' + ui.money(s.priceJoint) + '</strong>' : 'Tu compra en grupo');
    var provider = ui.plain(s.provider) || 'Proveedor', initials = provider.split(/\s+/).slice(0, 2).map(function (w) { return w.charAt(0); }).join('').toUpperCase();
    // El enlace lleva siempre la necesidad original; nunca se elige otra en su lugar.
    var leave = !canLeave ? '' : confirming
      ? '<div class="pa-inline" role="group" aria-labelledby="leave-title"><p id="leave-title"><strong>¿Te retiras de esta compra en grupo?</strong></p><p>Dejarás de participar con ' + esc(summary.quantity(p)) + '. Puedes volver a unirte mientras siga abierta.</p><p class="pa-error" id="leave-error" role="alert" hidden></p><div class="pa-inline__actions"><button class="nx-btn nx-btn--secondary" id="leave-no" type="button">No, seguir dentro</button><button class="nx-btn nx-btn--danger-solid" id="leave-yes" type="button">Sí, retirarme</button></div></div>'
      : '<button class="nx-btn nx-btn--danger nx-btn--block" id="leave" type="button">Retirarme</button>';
    var actions = (o ? '<a class="nx-btn nx-btn--primary nx-btn--block" href="' + esc(ui.buyerHref('detalle-oportunidad.html?id=' + encodeURIComponent(o.id) + (need ? '&necesidad=' + encodeURIComponent(p.needId) : ''))) + '">Ver detalles de la oferta</a>' : '') +
      (o && need && !compatible && joined ? '<p class="nx-note">' + ui.ic('shield') + '<span>Tu pedido ya no coincide con esta compra en grupo. No elegimos otro por ti.</span></p>' : '') +
      leave +
      (need ? '<a class="nx-btn nx-btn--tertiary nx-btn--block" href="' + esc(ui.buyerHref('necesidad.html?id=' + encodeURIComponent(p.needId))) + '">Ver mi necesidad</a>' : '');
    var facts = [['Cantidad', summary.quantity(p)], ['Zona', ui.plain(summary.zone(p))], ['Cierra el', shortDate(o ? o.closeDate : s.closeDate)], ['Entrega estimada', store.entregaTexto(o || s)], [joined ? 'Te uniste el' : 'Te retiraste el', shortDate(joined ? p.scenarioDateAtConfirmation : p.scenarioDateAtWithdrawal) || '—']];
    var strip = [['Precio en grupo ahora', o ? ui.money(tx.precio(o)) : Number.isFinite(s.priceJoint) ? ui.money(s.priceJoint) : '—'], ['Lo que pagas hoy', Number.isFinite(s.priceIndividual) ? '<s>' + esc(ui.money(s.priceIndividual)) + '</s>' : 'Sin indicar'], ['Negocios unidos', o ? esc(store.negociosUnidos(o)) : '—']];
    var stripHtml = '<section class="nx-card dt-strip"><h2 class="sr">Precios y negocios</h2>' + strip.map(function (x) { return '<div><small>' + esc(x[0]) + '</small><strong>' + x[1] + '</strong></div>'; }).join('') + '</section>';
    $('participation-page').innerHTML = (o ? tx.fechas(o, s) : '') + '<div class="nx-layout dt-grid"><div class="dt-main"><div class="dt-top">' +
      '<section class="nx-card dt-product"><div class="dt-product__top">' + thumb(p) + '<div><p class="nx-label">Tu compra en grupo</p><h2 class="nx-h2">' + esc(s.product || 'Compra en grupo') + '</h2><p class="nx-detail">' + esc(ui.plain(s.presentation)) + '</p></div></div><dl class="dt-facts">' + facts.map(function (x) { return '<div><dt>' + esc(x[0]) + '</dt><dd>' + esc(x[1]) + '</dd></div>'; }).join('') + '</dl></section>' +
      '<section class="nx-card dt-steps"><div class="nx-card__head"><h2 class="nx-h3 dt-title">' + ui.ic('track') + '¿Qué pasa ahora?</h2></div>' + timeline(p, o) + '</section></div>' + stripHtml + '</div>' +
      '<aside class="nx-aside"><section class="nx-card nx-card--raised pa-actions"><h2 class="nx-h3 dt-title">' + ui.ic('check') + 'Qué puedes hacer</h2>' + actions + '</section>' +
      '<section class="nx-card dt-provider"><span class="dt-provider__av" aria-hidden="true">' + esc(initials) + '</span><div><p class="nx-label">Te vende</p><strong>' + esc(provider) + '</strong>' + (o ? '<small class="dt-trust">' + esc(store.negociosUnidos(o)) + ' negocios ya se unieron</small>' + tx.puntualidad(o) : '') + '</div></section></aside>' +
      '</div>';
    $('participation-page').querySelectorAll('.nx-thumb img').forEach(function (img) { img.addEventListener('error', function () { var box = img.parentElement; img.remove(); box.innerHTML = ui.ic('box'); }); });
    ui.renderIdentity();
  }
  // Confirmación corta dentro de la tarjeta de acciones: solo para la acción que quita algo.
  var page = $('participation-page');
  page.addEventListener('click', function (e) {
    if (e.target.closest('#leave')) {
      var result = store.prepareWithdrawal(id);
      if (result.error) { ui.toast(result.error); render(); return; }
      reviewed = result.proposal; busy = false; confirming = true; render();
      var no = $('leave-no'); if (no) no.focus(); return;
    }
    if (e.target.closest('#leave-no')) { confirming = false; reviewed = null; render(); var back = $('leave'); if (back) back.focus(); return; }
    if (e.target.closest('#leave-yes')) {
      if (busy || !reviewed) return;
      busy = true; e.target.closest('#leave-yes').disabled = true;
      var done = store.confirmWithdrawal(reviewed), opportunityId = reviewed.participation.opportunityId, needId = reviewed.participation.needId;
      if (done.error) { $('leave-error').textContent = done.error; $('leave-error').hidden = false; busy = false; e.target.closest('#leave-yes').disabled = false; return; }
      confirming = false; reviewed = null;
      ui.toast('Te retiraste.' + (done.aviso ? ' El precio para los demás pasó de ' + ui.money(done.aviso.precioAntes) + ' a ' + ui.money(done.aviso.precioDespues) + '. Avisamos en la campana.' : ''), { action: { label: 'Deshacer', onClick: function () {
        // Deshacer vuelve a unirte con el mismo pedido mientras la compra siga abierta.
        var again = store.prepareParticipation(opportunityId, needId); if (again.error) { ui.toast(again.error); return; }
        var joined = store.confirmParticipation(again.proposal); if (joined.error) { ui.toast(joined.error); return; }
        ui.toast('Volviste a unirte.'); location.assign(ui.buyerHref('participacion.html?id=' + encodeURIComponent(joined.participation.id)));
      } } }); render();
    }
  });
  window.addEventListener('nexora-demo-change', render);
  render();
})();
