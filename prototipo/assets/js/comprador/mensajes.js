/* Mensajes. Textos: docs/INVENTARIO_CLARIDAD.md, sección 11. Lecturas, borradores y envíos son los del estado
   (markConversationRead, saveMessageDraft, sendDemoMessage); aquí solo cambia qué se muestra y cómo. */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  function failure(error) {
    $('conversation-list').innerHTML = '<li class="ms-empty" role="alert"><p>No se pudo iniciar Mensajes. Recarga la página. Tus datos se conservan.</p><a class="nx-btn nx-btn--secondary" href="mensajes.html?revision=mensajes-20261016">Recargar Mensajes</a></li>';
    console.error('NEXORA: Mensajes no disponible.', error);
  }
  try {
    if (!window.NexoraDemo || !window.NexoraDemo.requireSession()) return;
    var store = window.NexoraStore, ui = window.NexoraUI, messaging = window.NexoraMessaging;
    if (!store || store.messagingVersion !== 1 || !ui || !messaging) throw new Error('Dependencias incompatibles');
    var esc = ui.esc, current = new URLSearchParams(location.search).get('conversacion'), drafts = {}, busy = false, chip = 'todas', tab = 'conversaciones', currentNotice = null;
    var norm = window.NexoraUtils.normalizar, photos = window.NexoraProductImages || {}, LIMIT = 1000;
    var desktop = window.matchMedia ? window.matchMedia('(min-width:901px)') : { matches: true };
    function url(id) { return ui.buyerHref('mensajes.html' + (id ? '?conversacion=' + encodeURIComponent(id) : '')); }
    function setCurrent(id) { current = id; history.replaceState(null, '', url(id)); }
    function feedback(text) { var field = $('message-feedback') || $('messages-status'); field.textContent = text; field.hidden = !text; }
    function shortDate(value) { return value && !Number.isNaN(Date.parse(value)) ? new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', day: 'numeric', month: 'short' }).format(new Date(value)) : ''; }
    function initials(name) { return ui.plain(name).split(/\s+/).slice(0, 2).map(function (w) { return w[0] || ''; }).join('').toUpperCase(); }
    function sorted() { return store.ownConversations().slice().sort(function (a, b) { return ((messaging.preview(b) || b).createdAt || '').localeCompare((messaging.preview(a) || a).createdAt || ''); }); }
    // Avisos del proveedor: un ítem por compra en grupo a la que te uniste; solo lectura.
    function joinedOpps() {
      var seen = {}; return store.ownParticipations().filter(function (p) { return p.status === 'Confirmada'; }).map(function (p) { return store.get().opps.find(function (o) { return o.id === p.opportunityId; }); }).filter(function (o) { if (!o || seen[o.id]) return false; seen[o.id] = true; return true; });
    }
    function noticeUrl(id) { return ui.buyerHref('mensajes.html' + (id ? '?aviso=' + encodeURIComponent(id) : '')); }
    function renderNotices() {
      var opps = joinedOpps();
      $('conversation-list').innerHTML = opps.length ? opps.map(function (o) {
        var list = store.opportunityNotices(o), last = list[0], product = store.products[o.product].name;
        return '<li><a class="ms-row' + (currentNotice === o.id ? '' : '') + '" href="' + esc(noticeUrl(o.id)) + '" data-notice="' + esc(o.id) + '"' + (currentNotice === o.id ? ' aria-current="true"' : '') + '><span class="ms-avatar ms-avatar--notice" aria-hidden="true">' + ui.ic('megaphone') + '</span>' +
          '<span class="ms-row__body"><span class="ms-row__top"><strong>' + esc(product) + '</strong><time>' + (last ? esc(shortDate(last.date + 'T12:00:00-05:00')) : '') + '</time></span><span class="ms-row__preview">' + esc(last ? last.text : 'Aún no hay avisos.') + '</span></span></a></li>';
      }).join('') : '<li class="ms-empty"><p>Aún no tienes avisos. Únete a una compra en grupo para recibirlos.</p><a class="nx-btn nx-btn--secondary" href="' + esc(ui.buyerHref('oportunidades.html')) + '">Ver compras en grupo</a></li>';
    }
    function renderNoticePanel() {
      $('messages-layout').classList.toggle('is-selected', !!currentNotice);
      var o = joinedOpps().find(function (x) { return x.id === currentNotice; });
      if (!o) { $('conversation-panel').innerHTML = '<button type="button" class="nx-btn nx-btn--tertiary nx-btn--sm ms-back" id="messages-back">← Avisos</button><div class="ms-thread__empty"><h2 class="nx-h3" tabindex="-1" id="conversation-title">Elige un aviso</h2><p class="nx-detail">Aquí verás lo que el proveedor comunica a todos los que se unieron.</p></div>'; return; }
      var product = store.products[o.product].name, list = store.opportunityNotices(o);
      $('conversation-panel').innerHTML = '<button type="button" class="nx-btn nx-btn--tertiary nx-btn--sm ms-back" id="messages-back">← Avisos</button>' +
        '<header class="ms-thread__head"><span class="ms-avatar ms-avatar--notice" aria-hidden="true">' + ui.ic('megaphone') + '</span><div><h2 class="nx-h3" tabindex="-1" id="conversation-title">Avisos de ' + esc(product) + '</h2><p class="nx-detail">' + esc(ui.plain(o.provider)) + ' · para los negocios unidos</p></div></header>' +
        '<ol class="ms-history ms-notices" aria-label="Avisos">' + list.map(function (n) { return '<li class="ms-bubble is-received"><strong>Aviso</strong><p>' + esc(n.text) + '</p><small>' + esc(shortDate(n.date + 'T12:00:00-05:00')) + '</small></li>'; }).join('') + '</ol>' +
        '<p class="nx-detail ms-readonly">Solo lectura. Para dudas de todos, usa Preguntas de la compra.</p><a class="nx-btn nx-btn--secondary" href="' + esc(ui.buyerHref('detalle-oportunidad.html?id=' + encodeURIComponent(o.id))) + '">Ver compra en grupo</a>';
    }
    function setTab(next) {
      tab = next; if ($('tab-avisos')) { $('tab-avisos').setAttribute('aria-selected', String(tab === 'avisos')); $('tab-conversaciones').setAttribute('aria-selected', String(tab === 'conversaciones')); }
      if ($('messages-tools')) $('messages-tools').hidden = tab === 'avisos';
      render();
    }
    function renderList() {
      if (tab === 'avisos') return renderNotices();
      var all = sorted(), query = norm($('messages-search').value.trim());
      var searched = all.filter(function (c) { return !query || norm([messaging.context(c).product, ui.plain(c.interlocutorName)].join(' ')).includes(query); });
      var shown = searched.filter(function (c) { return chip === 'todas' || messaging.unread(c); });
      $('messages-chips').innerHTML = [['todas', 'Todas', searched.length], ['sin-leer', 'Sin leer', searched.filter(messaging.unread).length]].map(function (c) { return '<button type="button" class="nx-chip" data-chip="' + c[0] + '" aria-pressed="' + (c[0] === chip) + '">' + c[1] + ' <span class="nx-chip__count">' + c[2] + '</span></button>'; }).join('');
      $('conversation-list').innerHTML = shown.length ? shown.map(function (c) {
        var context = messaging.context(c), last = messaging.preview(c), unread = messaging.unread(c);
        return '<li><a class="ms-row' + (unread ? ' is-unread' : '') + '" href="' + esc(url(c.id)) + '" data-conversation="' + esc(c.id) + '"' + (current === c.id ? ' aria-current="true"' : '') + '><span class="ms-avatar" aria-hidden="true">' + esc(initials(c.interlocutorName)) + '</span>' +
          '<span class="ms-row__body"><span class="ms-row__top"><strong>' + esc(ui.plain(c.interlocutorName)) + '</strong><time>' + esc(shortDate(last ? last.createdAt : c.createdAt)) + '</time></span><span class="ms-row__product">' + esc(context.product) + '</span><span class="ms-row__preview">' + esc(last ? last.text : 'Aún no hay mensajes.') + '</span></span>' +
          (unread ? '<span class="ms-dot"><span class="sr">Sin leer</span></span>' : '') + '</a></li>';
      }).join('') : '<li class="ms-empty"><p>' + (all.length ? (chip === 'sin-leer' && !query ? 'No tienes mensajes sin leer.' : 'No encontramos conversaciones.') : 'Aún no tienes conversaciones. Ábrelas desde una compra en grupo con «Escribir al proveedor».') + '</p>' + (all.length ? '<button class="nx-btn nx-btn--secondary nx-btn--sm" type="button" data-chip="todas" id="messages-clear">Ver todas</button>' : '<a class="nx-btn nx-btn--secondary nx-btn--sm" href="' + esc(ui.buyerHref('oportunidades.html')) + '">Ver compras en grupo</a>') + '</li>';
    }
    function thread(c) {
      var context = messaging.context(c), o = context.opportunity, error = store.conversationEligibility(c.id), messages = store.conversationMessages(c.id), name = ui.plain(c.interlocutorName);
      var joined = store.ownParticipations().filter(function (p) { return p.opportunityId === c.opportunityId && p.status === 'Confirmada'; })[0];
      var draft = Object.prototype.hasOwnProperty.call(drafts, c.id) ? drafts[c.id] : store.get().messaging.drafts[c.id] || '';
      var file = o && photos[o.product];
      return '<button type="button" class="nx-btn nx-btn--tertiary nx-btn--sm ms-back" id="messages-back">← Conversaciones</button>' +
        '<header class="ms-thread__head"><span class="ms-avatar" aria-hidden="true">' + esc(initials(c.interlocutorName)) + '</span><div><h2 class="nx-h3" tabindex="-1" id="conversation-title">' + esc(name) + '</h2><p class="nx-detail">Proveedor</p></div></header>' +
        '<p class="nx-detail ms-private">Chat privado con ' + esc(name) + '. Para dudas de todos, usa Preguntas de la compra.</p>' +
        '<div class="ms-context"><span class="nx-thumb" aria-hidden="true">' + (file ? '<img src="../../assets/images/' + esc(file) + '" alt="">' : ui.ic(o ? store.products[o.product].icon : 'box')) + '</span><div><strong>' + esc(context.product) + '</strong><small>' + esc((o ? o.presentation + ' · ' : '') + (context.status === 'abierta' ? 'Abierta' : context.status === 'cerrada' ? 'Cerrada' : 'Ya no está disponible')) + '</small>' + (o && window.NexoraTesis ? '<span class="tx-seg">' + window.NexoraTesis.chipEstado(o) + (joined ? (function () { var nd = store.get().needs.find(function (x) { return x.id === joined.needId; }), a = nd ? window.NexoraTesis.ahorro(nd, o, { focusable: false }) : null; return a && a.hay ? ' ' + a.html : ''; })() : '') + '</span>' : '') +
        '<span class="ms-context__links">' + (o ? '<a href="' + esc(ui.buyerHref('detalle-oportunidad.html?id=' + encodeURIComponent(c.opportunityId))) + '">Ver compra en grupo</a>' : '') + (joined ? '<a href="' + esc(ui.buyerHref('participacion.html?id=' + encodeURIComponent(joined.id))) + '">Te uniste</a>' : '') + '</span></div></div>' +
        '<ol class="ms-history" aria-label="Mensajes">' + (messages.length ? messages.map(function (m) { var sent = m.direction === 'sent'; return '<li class="ms-bubble ' + (sent ? 'is-sent' : 'is-received') + '"><strong>' + (sent ? 'Tú' : esc(name)) + '</strong><p>' + esc(m.text) + '</p><small>' + esc(shortDate(m.createdAt)) + '</small></li>'; }).join('') : '<li class="ms-history__empty">Aún no hay mensajes. Escribe el primero.</li>') + '</ol>' +
        (error ? '<p class="nx-note">' + ui.ic('shield') + '<span>' + esc(error) + '</span></p>' : '<form id="message-compose" class="ms-compose" novalidate><label for="message-text">Escribe tu mensaje</label><textarea id="message-text" rows="2" aria-describedby="message-limit">' + esc(draft) + '</textarea><small class="ms-limit" id="message-limit" role="status"></small><button type="submit" class="nx-btn nx-btn--primary">Enviar ' + ui.ic('arr') + '</button></form>') +
        '<p class="ms-feedback" id="message-feedback" role="status" aria-live="polite" hidden></p>';
    }
    function renderPanel() {
      if (tab === 'avisos') return renderNoticePanel();
      $('messages-layout').classList.toggle('is-selected', !!current);
      var c = store.conversationById(current);
      if (!c) { $('conversation-panel').innerHTML = '<button type="button" class="nx-btn nx-btn--tertiary nx-btn--sm ms-back" id="messages-back">← Conversaciones</button><div class="ms-thread__empty"><h2 class="nx-h3" tabindex="-1" id="conversation-title">' + (current ? 'No encontramos esta conversación' : 'Elige una conversación') + '</h2><p class="nx-detail">' + (current ? 'Pudo haberse reiniciado la demo.' : 'También puedes escribir desde una compra en grupo.') + '</p></div>'; return; }
      $('conversation-panel').innerHTML = thread(c);
      var log = $('conversation-panel').querySelector('.ms-history'); log.scrollTop = log.scrollHeight;
      $('conversation-panel').querySelectorAll('.nx-thumb img').forEach(function (img) { img.addEventListener('error', function () { var box = img.parentElement; img.remove(); box.innerHTML = ui.ic('box'); }); });
    }
    function render() { try { renderList(); renderPanel(); if (store.error()) feedback(store.error()); } catch (error) { failure(error); } }
    function select(id) {
      setCurrent(id); render();
      if (store.conversationById(id)) { var result = store.markConversationRead(id); if (result.error) feedback(result.error); else renderList(); }
      var title = $('conversation-title'); if (title) title.focus();
    }
    function choose(e) { var b = e.target.closest('[data-chip]'); if (!b) return; chip = b.dataset.chip; if (b.id === 'messages-clear') $('messages-search').value = ''; renderList(); }
    $('conversation-list').addEventListener('click', function (e) {
      var notice = e.target.closest('[data-notice]');
      if (notice && !(e.metaKey || e.ctrlKey || e.shiftKey)) { e.preventDefault(); currentNotice = notice.dataset.notice; history.replaceState(null, '', noticeUrl(currentNotice)); render(); var heading = $('conversation-title'); if (heading) heading.focus(); return; }
      var link = e.target.closest('[data-conversation]'); if (link && !(e.metaKey || e.ctrlKey || e.shiftKey)) { e.preventDefault(); select(link.dataset.conversation); return; } choose(e); });
    $('messages-chips').addEventListener('click', choose);
    $('messages-search').addEventListener('input', renderList);
    $('conversation-panel').addEventListener('click', function (e) { if (e.target.closest('#messages-back')) { if (tab === 'avisos') { currentNotice = null; history.replaceState(null, '', noticeUrl(null)); } else setCurrent(null); render(); $('inbox-title').focus(); } });
    ['tab-avisos', 'tab-conversaciones'].forEach(function (id) { if ($(id)) $(id).addEventListener('click', function () { if (tab !== this.dataset.tab) setTab(this.dataset.tab); }); });
    $('conversation-panel').addEventListener('input', function (e) {
      if (e.target.id !== 'message-text') return; drafts[current] = e.target.value;
      $('message-limit').textContent = e.target.value.length > LIMIT ? 'Máximo 1.000 caracteres. Llevas ' + e.target.value.length.toLocaleString('es-PE') + '.' : '';
      var result = store.saveMessageDraft(current, e.target.value); feedback(result.error ? 'No pudimos guardar tu borrador. Sigue aquí; no salgas antes de reintentar. ' + result.error : '');
    });
    $('conversation-panel').addEventListener('submit', function (e) {
      if (e.target.id !== 'message-compose') return; e.preventDefault(); if (busy) return;
      busy = true; var text = $('message-text').value; drafts[current] = text;
      var result = store.sendDemoMessage(current, text); busy = false;
      if (result.error) { feedback(result.error); $('message-text').focus(); return; }
      delete drafts[current]; render(); feedback('Listo. Mensaje enviado al proveedor de la demo.'); if (ui.toast) ui.toast('✓ Mensaje enviado'); $('message-text').focus();
    });
    window.addEventListener('nexora-demo-change', function (e) { if (e.detail && e.detail.reason === 'reset') { drafts = {}; chip = 'todas'; setCurrent(null); $('messages-search').value = ''; } render(); });
    var wanted = new URLSearchParams(location.search).get('aviso');
    if (wanted) { currentNotice = wanted; tab = 'avisos'; if ($('tab-avisos')) { $('tab-avisos').setAttribute('aria-selected', 'true'); $('tab-conversaciones').setAttribute('aria-selected', 'false'); } if ($('messages-tools')) $('messages-tools').hidden = true; }
    render();
    if (tab === 'avisos') return;
    if (current && store.conversationById(current)) select(current);
    // Abrir la conversación más reciente también registra su lectura.
    else if (!current && desktop.matches) { var first = sorted()[0]; if (first) { select(first.id); } }
  } catch (error) { failure(error); }
})();
