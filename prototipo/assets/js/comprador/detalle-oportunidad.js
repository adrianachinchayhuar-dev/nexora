/* Detalle de compra en grupo (nivel 2 de Compras en grupo). Textos: docs/INVENTARIO_CLARIDAD.md, sección 8.
   Unirse usa las mismas reglas del estado (prepareParticipation → confirmParticipation) tras una confirmación corta. */
(function () {
  if (!window.NexoraDemo.requireSession()) return;
  var store = window.NexoraStore, ui = window.NexoraUI, tx = window.NexoraTesis, esc = ui.esc, money = ui.money;
  var $ = function (id) { return document.getElementById(id); };
  var params = new URLSearchParams(location.search), root = $('op-detail'), id = params.get('id'), linkNotice = '';
  var photos = window.NexoraProductImages || {}, reviewed = null, busy = false, pinned = false;
  var UNIT_ONE = { botellas: 'botella', bolsas: 'bolsa', paquetes: 'paquete', latas: 'lata', kg: 'kilo' };

  function shortDate(iso) { var d = new Date(String(iso) + 'T12:00:00Z'); return Number.isFinite(d.getTime()) ? new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(d) : ''; }
  // La necesidad del enlace se aplica una sola vez; si ya no coincide, se dice y no se elige otra.
  function useLinkedNeed() {
    if (!params.has('necesidad')) return;
    var requested = params.getAll('necesidad'), o = store.get().opps.find(function (item) { return item.id === id; });
    params.delete('necesidad');
    try { history.replaceState(null, '', location.pathname + (params.toString() ? '?' + params.toString() : '') + location.hash); }
    catch (error) { linkNotice = 'No pudimos usar el pedido del enlace. Elige tu pedido abajo.'; return; }
    var exact = o && requested.length === 1 && requested[0] ? store.compatibleNeeds(o).filter(function (n) { return n.id === requested[0]; }) : [];
    if (!exact || exact.length !== 1) { linkNotice = 'Tu pedido del enlace ya no coincide con esta compra. No elegimos otro por ti.'; return; }
    if (!store.selectNeed(o.id, exact[0].id)) linkNotice = store.error() || 'No pudimos guardar tu pedido. Se mantiene el anterior.'; else pinned = true;
  }
  // Dato clave del banner (justo debajo del título).
  function setKey(html) { var el = document.getElementById('dt-key'); if (!el) { el = document.createElement('p'); el.id = 'dt-key'; el.className = 'dt-key'; $('sub').insertAdjacentElement('afterend', el); } el.innerHTML = html; }
  var showAllNotices = false, showAllQuestions = false, communityTab = null;
  function zoneLabel(zoneId) { var z = (store.zones || []).find(function (x) { return x.id === zoneId; }); return z ? z.name.replace(/\s*\(demo\)/, '').split(' · ')[0] : 'tu zona'; }
  // Tiempo relativo: «hoy», «ayer», «hace N días» y la fecha si pasaron más de 7 días.
  function ago(iso) {
    var a = new Date(String(iso) + 'T12:00:00Z'), b = new Date(store.today() + 'T12:00:00Z'), days = Math.round((b - a) / 86400000);
    if (!Number.isFinite(days)) return '';
    return days <= 0 ? 'hoy' : days === 1 ? 'ayer' : days <= 7 ? 'hace ' + days + ' días' : shortDate(iso);
  }
  function steps(list) {
    return '<ol class="nx-steps" aria-label="¿Qué pasa ahora?">' + list.map(function (s) {
      var cls = s[1] === 'done' ? 'is-done' : s[1] === 'current' ? 'is-current' : '';
      return '<li class="' + cls + '"' + (s[1] === 'current' ? ' aria-current="step"' : '') + '><span class="nx-steps__dot">' + ui.ic(s[2] || 'check') + '</span><span class="nx-steps__t"><b>' + esc(s[0]) + '</b><small>' + esc(s[3] || '') + '</small></span></li>';
    }).join('') + '</ol>';
  }
  // «Registrado hoy, 12:30» / «Registrado el 3 nov.» (hora de Lima).
  function registeredLabel(n) {
    var d = new Date(n.createdAt); if (!Number.isFinite(d.getTime())) return '';
    var day = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(d), realToday = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date());
    if (day === store.today() || day === realToday) return 'Registrado hoy, ' + new Intl.DateTimeFormat('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Lima' }).format(d);
    return 'Registrado el ' + shortDate(day);
  }
  function needChoice(o, candidates, need) {
    if (!candidates.length) return '<p class="nx-detail">No tienes un pedido para este producto.</p><a class="nx-btn nx-btn--tertiary nx-btn--sm" href="' + esc(ui.buyerHref('necesidad-nueva.html?producto=' + encodeURIComponent(o.product))) + '">Registrar este pedido</a>';
    if (need && (candidates.length === 1 || pinned)) return '<p class="nx-detail">Con tu pedido de <strong>' + esc(need.qty + ' ' + need.unit) + '</strong> para el ' + esc(shortDate(need.requiredDate).replace(/\.$/, '')) + '.</p>' + (candidates.length > 1 ? '<button class="nx-btn nx-btn--tertiary nx-btn--sm" id="change-need" type="button">Cambiar pedido</button>' : '');
    // Se diferencian por cuándo se registraron y, si cambian, por marca y zona.
    var marcas = candidates.some(function (n) { return (n.marca || '') !== (candidates[0].marca || ''); }), zonas = candidates.some(function (n) { return n.zoneId !== candidates[0].zoneId; });
    function label(n) {
      return n.qty + ' ' + n.unit + ' · para el ' + shortDate(n.requiredDate) + (registeredLabel(n) ? ' · ' + registeredLabel(n) : '') + (marcas ? ' · ' + store.marcaTexto(n) : '') + (zonas ? ' · ' + zoneLabel(n.zoneId) : '') + (Number.isFinite(n.priceIndividual) ? ' · tu precio ' + money(n.priceIndividual) : '');
    }
    // Pedidos idénticos se distinguen como «Registro 1 de 2»; nunca se suman.
    return '<fieldset class="cg-needs"><legend class="nx-detail">¿Con qué pedido te unes?</legend>' + candidates.map(function (n) {
      var twins = candidates.filter(function (x) { return label(x) === label(n); });
      return '<label class="cg-need"><input type="radio" name="detail-reference" value="' + esc(n.id) + '"' + (need && need.id === n.id ? ' checked' : '') + '><span>' + esc((twins.length > 1 ? 'Registro ' + (twins.indexOf(n) + 1) + ' de ' + twins.length + ' · ' : '') + label(n)) + '</span></label>';
    }).join('') + '</fieldset>';
  }
  function render() {
    var o = store.get().opps.find(function (item) { return item.id === id; });
    if (!o) {
      document.querySelector('.hello h1').textContent = 'No encontramos esta compra en grupo';
      $('sub').textContent = 'Pudo haberse reiniciado la demo.';
      root.innerHTML = '<section class="nx-card nx-empty"><span class="nx-empty__icon">' + ui.ic('spark') + '</span><h2 class="nx-h3">No encontramos esta compra en grupo</h2><p>Vuelve a la lista para elegir otra.</p><a class="nx-btn nx-btn--secondary" href="' + esc(ui.buyerHref('oportunidades.html')) + '">Volver a Compras en grupo</a></section>';
      return;
    }
    var p = store.products[o.product], open = store.opportunityStatus(o) === 'abierta', close = shortDate(o.closeDate);
    var candidates = store.compatibleNeeds(o);
    // Varios pedidos compatibles y ninguno elegido: se preselecciona el más reciente.
    if (candidates.length > 1 && !store.selectedNeed(o) && !store.participationForNeed(candidates[0].id)) {
      var newest = candidates.slice().sort(function (a, b) { return String(b.createdAt).localeCompare(String(a.createdAt)); })[0];
      if (store.selectNeed(o.id, newest.id)) return;
    }
    var need = store.selectedNeed(o), saving = need ? tx.ahorro(need, o, { modo: 'detalle' }) : null;
    var mine = need ? store.participationForNeed(need.id) : null, joinedHere = mine && mine.opportunityId === o.id;
    var file = photos[o.product];
    document.title = 'NEXORA · ' + p.name + ' en grupo';
    document.querySelector('.hello h1').textContent = p.name;
    var mineNeed = store.get().needs.find(function (n) { var q = store.participationForNeed(n.id); return q && q.opportunityId === o.id; }) || null, late = !need && !mineNeed ? store.pedidoTardio(o) : null;
    $('sub').innerHTML = '<span class="nx-status ' + (joinedHere ? 'nx-status--confirmada' : open ? 'nx-status--cierre' : 'nx-status--cerrada') + '">' + (joinedHere ? 'Ya te uniste' : open ? 'Abierta · cierra el ' + esc(close) : 'Cerró el ' + esc(close)) + '</span> ' + tx.chipEstado(o) + ' ' + tx.chipLlega(o, need || mineNeed) + ' <span>' + esc(o.presentation) + '</span>';
    var next = joinedHere ? [['Te uniste', 'done', 'users', 'Tu pedido está dentro'], ['Cierra el ' + close, 'current', 'track', 'Puedes retirarte antes'], ['Resultado', '', 'chat', 'En la versión real, te avisaríamos el resultado']]
      : open ? [['Únete antes del ' + close, 'current', 'users', 'Tú decides si te unes'], ['Cierra el ' + close, '', 'track', 'Se junta el pedido de todos'], ['Contacto', '', 'chat', 'En la versión real, el proveedor te contactaría']]
        : [['Cerró el ' + close, 'done', 'track', 'La compra terminó'], ['Sin nuevas uniones', 'current', 'shield', 'Mira otras compras en grupo']];
    var action;
    if (joinedHere) action = '<a class="nx-btn nx-btn--primary nx-btn--block" href="' + esc(ui.buyerHref('participacion.html?id=' + encodeURIComponent(mine.id))) + '">Ver mi seguimiento</a>';
    else if (mine) action = '<p class="nx-note">' + ui.ic('shield') + '<span>Este pedido ya está en otra compra en grupo.</span></p>';
    else if (open && store.estadoCompra(o) === 'confirmada') action = '<p class="nx-note">' + ui.ic('check') + '<span>Esta compra ya está confirmada.</span></p>' + (need || candidates.length ? '<a class="nx-btn nx-btn--secondary nx-btn--block" href="' + esc(ui.buyerHref('oportunidades.html')) + '">Ver otras compras en grupo</a>' : '');
    else if (open && store.estadoCompra(o) === 'cancelada') action = '<p class="nx-note">' + ui.ic('shield') + '<span>Esta compra no se concretó.</span></p>' + (need || candidates.length ? '<a class="nx-btn nx-btn--secondary nx-btn--block" href="' + esc(ui.buyerHref('oportunidades.html')) + '">Ver otras compras en grupo</a>' : '');
    else if (open && need) action = '<button class="nx-btn nx-btn--primary nx-btn--block" id="participate" type="button">Unirme con ' + esc(need.qty + ' ' + need.unit) + '</button>';
    else if (open && candidates.length) action = '<p class="nx-detail">Elige tu pedido para unirte.</p>';
    else action = '';
    var hidden = need && store.descartada(o.id, need.id);
    if (open && need && !mine) action += hidden ? '<p class="nx-note tx-oculta-aviso">' + ui.ic('shield') + '<span>Ocultaste esta compra. Ya no te la proponemos.</span><button class="nx-btn nx-btn--tertiary nx-btn--sm" id="mostrar-otra-vez" type="button" data-need="' + esc(need.id) + '">Deshacer</button></p>' : '<button class="nx-btn nx-btn--secondary nx-btn--block" id="no-interesa" type="button" data-need="' + esc(need.id) + '">No me interesa</button>';
    var provider = ui.plain(o.provider) || 'Proveedor', initials = provider.split(/\s+/).slice(0, 2).map(function (w) { return w.charAt(0); }).join('').toUpperCase();
    var mineInitials = ($('ini2') && $('ini2').textContent) || '';
    setKey(saving && saving.hay ? saving.html : 'Precio en grupo <strong>' + money(tx.precio(o)) + '</strong>');
    var others = store.get().opps.filter(function (x) { return x.id !== o.id && store.opportunityStatus(x) === 'abierta'; }).slice(0, 3);
    var talk = open || (store.ownConversations && store.ownConversations().some(function (c) { return c.opportunityId === o.id; }));
    var facts = [['Precio en grupo hoy', money(tx.precio(o)), saving && saving.hay && !saving.datos.unido && saving.datos.conTu !== saving.datos.hoy ? 'Con tu pedido: ' + money(saving.datos.conTu) : ''], ['Hoy pagas', need && Number.isFinite(need.priceIndividual) ? money(need.priceIndividual) : 'Sin indicar'], ['Cierra el', close], ['Tu pedido', need ? need.qty + ' ' + need.unit : 'Elige uno']];
    // Explicación en una línea de cada etiqueta (también para quien usa el celular y no puede pasar el mouse).
    var hint = !need || !saving ? '' : !saving.hay ? '<p class="nx-detail dt-hint">' + saving.html + '</p>' : (saving.datos.referencial ? '<p class="nx-detail dt-hint"><b>Referencial:</b> no pusiste tu precio de hoy; comparamos con el precio normal del proveedor.</p>' : '') + (saving.datos.preliminar ? '<p class="nx-detail dt-hint"><b>Preliminar:</b> falta el costo de transporte.</p>' : '');
    var unidos = store.negociosUnidos(o), shown = Math.min(unidos, 4), avs = '';
    for (var k = 0; k < shown; k++) avs += '<span class="dt-av">' + (k === 0 && joinedHere ? esc(mineInitials) : ui.ic('store')) + '</span>';
    if (unidos > shown) avs += '<span class="dt-av dt-av--more">+' + (unidos - shown) + '</span>';
    var tardio = late ? '<section class="nx-card dt-wide tx-tarde"><p>Esta compra entrega ' + esc(store.entregaTexto(o)) + ' y tú lo necesitas para el ' + esc(shortDate(late.requiredDate)) + '.</p><a class="nx-btn nx-btn--secondary" href="' + esc(ui.buyerHref('necesidad-nueva.html?editar=' + encodeURIComponent(late.id))) + '">Cambiar mi fecha</a></section>' : '';
    var tramosCard = '<section class="nx-card dt-wide dt-tramos"><h2 class="nx-h3 dt-title">' + ui.ic('spark') + 'Precio por cantidad</h2>' + tx.barra(o, { extra: open && need && !mine ? need.qty : 0 }) + '</section>';
    var interest = '<section class="nx-card dt-wide dt-interest"><h2 class="nx-h3 dt-title">' + ui.ic('users') + 'Negocios unidos</h2><div class="dt-interest__body"><p class="dt-interest__num"><strong>' + esc(unidos) + '</strong> negocios unidos</p><span class="dt-meter__bar" aria-hidden="true">' + new Array(Math.min(unidos, 20) + 1).join('<i></i>') + '</span><span class="dt-avs" aria-hidden="true">' + avs + '</span></div></section>';
    // Comunidad de esta compra (avisos y preguntas): solo para quien ya se unió. Los demás negocios se muestran solo como cifra.
    var notices = store.opportunityNotices(o), questions = store.opportunityQuestions(o), community;
    var initialsOf = initials, mine = function (q) { return !/^PRE-op\d+-\d+$/.test(q.id); }; // las de ejemplo vienen con ID fijo; en la demo solo tú publicas las demás
    if (joinedHere) {
      var tabNow = communityTab || (questions.some(function (q) { return mine(q) && q.answer && q.answeredAt === store.today(); }) ? 'preguntas' : 'avisos');
      var LIMIT = 5, me = mineInitials || 'TÚ';
      var meta = function (extra) { return '<div class="dt-timeline__meta"><strong>' + esc(provider) + '</strong><span class="dt-seal">Proveedor</span>' + (extra || '') + '</div>'; };
      var avisos = notices.length ? '<ol class="dt-timeline">' + (showAllNotices ? notices : notices.slice(0, LIMIT)).map(function (n, i) {
        return '<li' + (i === 0 ? ' class="is-latest"' : '') + '><span class="dt-pav" aria-hidden="true">' + esc(initialsOf) + '</span><div class="dt-timeline__body">' + meta((i === 0 ? '<span class="dt-seal dt-seal--new">Nuevo</span>' : '') + '<span class="dt-ago">' + esc(ago(n.date)) + '</span>') + '<p class="dt-bubble">' + esc(n.text) + '</p></div></li>';
      }).join('') + '</ol>' + (notices.length > LIMIT ? '<button type="button" class="nx-btn nx-btn--tertiary nx-btn--sm dt-more-btn" id="notices-more">' + (showAllNotices ? 'Ver menos' : 'Ver más') + '</button>' : '') : '<p class="dt-empty">El proveedor aún no ha publicado avisos.</p>';
      var foro = '<form class="dt-compose" id="q-form" novalidate><span class="dt-pav" aria-hidden="true">' + esc(me) + '</span><div class="dt-compose__box"><textarea id="q-text" rows="1" maxlength="200" placeholder="Haz una pregunta para todos…" aria-label="Haz una pregunta para todos"></textarea><p class="cg-error" id="q-error" role="alert"></p></div><button type="button" class="dt-send" id="q-publish" aria-label="Publicar pregunta" disabled>' + ui.ic('arr') + '</button></form>' +
        (questions.length ? '<ul class="dt-forum">' + (showAllQuestions ? questions : questions.slice(0, LIMIT)).map(function (q) {
          return '<li><div class="dt-q"><span class="dt-q__av" aria-hidden="true">' + ui.ic('store') + '</span><div class="dt-q__main"><p class="dt-qa__who">Una bodega de ' + esc(zoneLabel(q.zoneId)) + ' · ' + esc(ago(q.date)) + (mine(q) ? '<span class="dt-mine">Tu pregunta</span>' : '') + '</p><p class="dt-qa__q">' + esc(q.text) + '</p></div>' + (q.answer ? '<span class="dt-state is-answered">✓ Respondida</span>' : '<span class="dt-state is-waiting">⏱ Esperando respuesta</span>') + '</div>' +
            (q.answer ? '<div class="dt-reply"><span class="dt-pav" aria-hidden="true">' + esc(initialsOf) + '</span><div><p><strong>' + esc(provider) + '</strong> <span class="dt-seal">Proveedor</span></p><p>' + esc(q.answer) + '</p></div></div>' : '') + '</li>';
        }).join('') + '</ul>' + (questions.length > LIMIT ? '<button type="button" class="nx-btn nx-btn--tertiary nx-btn--sm dt-more-btn" id="questions-more">' + (showAllQuestions ? 'Ver menos' : 'Ver más') + '</button>' : '') : '<p class="dt-empty">Todavía no hay preguntas. Haz la primera.</p>');
      community = '<section class="nx-card dt-community"><div class="dt-community__head"><h2 class="nx-h3 dt-title">' + ui.ic('users') + 'Comunidad de esta compra</h2><p class="dt-privacy">' + ui.ic('shield') + '<span>Los demás negocios no ven tu nombre ni tu cantidad</span></p></div>' +
        '<div class="dt-tabs" role="tablist" aria-label="Comunidad de esta compra"><button type="button" role="tab" class="dt-tab" data-ctab="avisos" aria-selected="' + (tabNow === 'avisos') + '">Avisos (' + notices.length + ')</button><button type="button" role="tab" class="dt-tab" data-ctab="preguntas" aria-selected="' + (tabNow === 'preguntas') + '">Preguntas (' + questions.length + ')</button></div>' +
        '<div class="dt-tabpanel" role="tabpanel">' + (tabNow === 'avisos' ? avisos : foro) + '</div></section>';
    } else {
      community = '<section class="nx-card dt-locked"><span class="dt-notice__ic" aria-hidden="true">' + ui.ic('megaphone') + '</span><p>Únete para ver los avisos y preguntas de esta compra</p>' + (open && need && store.estadoCompra(o) !== 'confirmada' && store.estadoCompra(o) !== 'cancelada' ? '<button class="nx-btn nx-btn--primary" type="button" data-participate>Unirme con ' + esc(need.qty + ' ' + need.unit) + '</button>' : '') + '</section>';
    }
    var nearby = others.length ? '<section class="dt-wide dt-more"><h2 class="nx-h3 dt-title">' + ui.ic('spark') + 'Otras compras en grupo cerca</h2><ul class="dt-cards">' + others.map(function (x) {
      var xp = store.products[x.product] || {}, xf = photos[x.product];
      return '<li><a class="nx-card" href="' + esc(ui.buyerHref('detalle-oportunidad.html?id=' + encodeURIComponent(x.id))) + '"><span class="nx-thumb" aria-hidden="true">' + (xf ? '<img src="../../assets/images/' + esc(xf) + '" alt="">' : ui.ic(xp.icon || 'box')) + '</span><span><strong>' + esc(xp.name || x.product) + '</strong><small>' + esc(money(x.priceJoint) + ' · cierra el ' + shortDate(x.closeDate)) + '</small></span></a></li>';
    }).join('') + '</ul></section>' : '';
    root.innerHTML = (linkNotice ? '<p class="nx-note cg-notice" role="status">' + ui.ic('shield') + '<span>' + esc(linkNotice) + '</span></p>' : '') + tx.fechas(o, need || mineNeed) +
      '<div class="nx-layout dt-grid"><div class="dt-main"><div class="dt-top">' +
      '<section class="nx-card dt-product"><div class="dt-product__top"><span class="nx-thumb nx-thumb--lg" aria-hidden="true">' + (file ? '<img src="../../assets/images/' + esc(file) + '" alt="">' : ui.ic(p.icon)) + '</span><div><p class="nx-label">Compra en grupo</p><h2 class="nx-h2">' + esc(p.name) + '</h2><p class="nx-detail">' + esc(o.presentation) + '</p></div></div><dl class="dt-facts">' + facts.map(function (x) { return '<div><dt>' + esc(x[0]) + '</dt><dd>' + esc(x[1]) + (x[2] ? '<small class="tx-sub">' + esc(x[2]) + '</small>' : '') + '</dd></div>'; }).join('') + '</dl>' + hint + '</section>' +
      '<section class="nx-card dt-steps"><div class="nx-card__head"><h2 class="nx-h3 dt-title">' + ui.ic('track') + '¿Qué pasa ahora?</h2></div>' + tx.pasos(o) + '</section></div>' + tardio + tramosCard + interest + community + nearby + '</div>' +
      '<aside class="nx-aside"><section class="nx-card nx-card--raised cg-actions"><h2 class="nx-h3 dt-title">' + ui.ic('check') + 'Qué puedes hacer</h2>' + (joinedHere ? '' : needChoice(o, candidates, need)) + action + '</section>' +
      '<section class="nx-card dt-provider"><span class="dt-provider__av" aria-hidden="true">' + esc(initials) + '</span><div><p class="nx-label">Te vende</p><strong>' + esc(provider) + '</strong><small class="dt-trust">' + esc(unidos) + ' negocios ya se unieron</small>' + tx.puntualidad(o) + '</div>' +
      (talk ? '<button class="nx-btn nx-btn--secondary nx-btn--block" id="conversation-open" type="button">' + ui.ic('chat') + 'Escribir al proveedor</button><p class="cg-error" id="conversation-error" role="alert"></p>' : '') + '</section></aside>' +
      '</div>';

    root.querySelectorAll('.nx-thumb img').forEach(function (img) { img.addEventListener('error', function () { var box = img.parentElement; img.remove(); box.innerHTML = ui.ic(p.icon); }); });
    ui.renderIdentity();
  }
  root.addEventListener('click', function (e) {
    var tabButton = e.target.closest('[data-ctab]');
    if (tabButton) { communityTab = tabButton.dataset.ctab; render(); return; }
    if (e.target.closest('#notices-more')) { showAllNotices = !showAllNotices; render(); return; }
    if (e.target.closest('#questions-more')) { showAllQuestions = !showAllQuestions; render(); return; }
    if (e.target.closest('#q-publish')) {
      var field = root.querySelector('#q-text'), result = store.askQuestion(id, field ? field.value : '');
      if (result.error) { var box = root.querySelector('#q-error'); if (box) box.textContent = result.error; return; }
      communityTab = 'preguntas'; ui.toast('✓ Pregunta publicada'); return;
    }
    if (e.target.closest('#conversation-open')) {
      var result = store.openConversation ? store.openConversation(id) : { error: 'Mensajes no disponibles. Recarga la página.' };
      if (result.error) { $('conversation-error').textContent = result.error; return; }
      location.assign(ui.buyerHref('mensajes.html?conversacion=' + encodeURIComponent(result.conversation.id))); return;
    }
    if (e.target.closest('#change-need')) { pinned = false; render(); return; }
    var ni = e.target.closest('#no-interesa');
    if (ni) { tx.descartar(id, ni.dataset.need, render); return; }
    var back = e.target.closest('#mostrar-otra-vez');
    if (back) { var u = store.deshacerNoMeInteresa(id, back.dataset.need); ui.toast(u.error || 'Volvimos a mostrar esta compra.'); render(); return; }
    if (!e.target.closest('#participate') && !e.target.closest('[data-participate]')) return;
    var o = store.get().opps.find(function (item) { return item.id === id; }), need = o && store.selectedNeed(o);
    var result = store.prepareParticipation(id, need && need.id);
    if (result.error) { ui.toast(result.error); render(); return; }
    reviewed = result.proposal; busy = false;
    var saving = need ? tx.ahorro(need, o) : null;
    $('join-text').textContent = 'Te unes con ' + result.proposal.snapshot.qty + ' ' + result.proposal.snapshot.unit + '.' + (saving && saving.hay ? ' ' + tx.ahorroTexto(need, o) + '.' : '') + (' Puedes retirarte antes del ' + shortDate(o.closeDate) + '.').replace('..', '.');
    $('join-error').hidden = true; $('join-yes').disabled = false;
    $('join-dialog').showModal(); $('join-no').focus();
  });
  // El botón de enviar se habilita solo cuando hay texto.
  root.addEventListener('input', function (e) { if (!e.target || e.target.id !== 'q-text') return; var send = root.querySelector('#q-publish'); if (send) send.disabled = !String(e.target.value || '').trim(); });
  root.addEventListener('change', function (e) { if (e.target.name !== 'detail-reference') return; if (!store.selectNeed(id, e.target.value)) ui.toast(store.error() || 'No pudimos guardar tu pedido. Se mantiene el anterior.'); render(); });
  $('join-no').addEventListener('click', function () { $('join-dialog').close(); });
  $('join-yes').addEventListener('click', function () {
    if (busy || !reviewed) return;
    busy = true; this.disabled = true;
    var result = store.confirmParticipation(reviewed);
    if (result.error) { $('join-error').textContent = result.error; $('join-error').hidden = false; busy = false; this.disabled = false; return; }
    $('join-dialog').close(); ui.toast('Te uniste.'); render();
  });
  $('join-dialog').addEventListener('close', function () { reviewed = null; });
  useLinkedNeed();
  window.addEventListener('nexora-demo-change', render);
  render();
})();
