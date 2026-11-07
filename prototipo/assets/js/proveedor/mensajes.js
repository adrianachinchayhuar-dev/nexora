(function () {
  'use strict';
  var ui = window.NexoraProviderUI, selected = new URLSearchParams(location.search).get('conversacion'), owner = null, drafts = {};
  function date(value) {
    if (!value || !Number.isFinite(Date.parse(value))) return 'Fecha no disponible';
    return new Intl.DateTimeFormat('es-PE', { timeZone:'America/Lima', day:'numeric', month:'short' }).format(new Date(value));
  }
  function time(value) { return '<time' + (value && Number.isFinite(Date.parse(value)) ? ' datetime="' + ui.esc(value) + '"' : '') + '>' + ui.esc(date(value)) + '</time>'; }
  ui.start(function (source, providerId) {
    var root = document.getElementById('provider-content');
    if (!source.ok) { ui.error(root, source.message); return; }
    if (typeof document.querySelector === 'function') {
      var role = document.querySelector('#provider-side .provider-role'); if (role) role.textContent = 'Portal del proveedor';
      var business = document.querySelector('#provider-side .biz');
      if (business && !document.getElementById('ms-sidebar-art')) business.insertAdjacentHTML('beforebegin', '<div class="ms-sidebar-art" id="ms-sidebar-art"><img src="../../assets/images/sidebar-proveedor.png" width="1106" height="1422" alt=""><p>Tu negocio, conectado<br>con más posibilidades.</p></div>');
    }
    var history = window.NexoraScenarioRead.conversations(providerId);
    if (!history.ok) { ui.error(root, history.message); return; }
    var store = window.NexoraProviderMessages, local = store.list();
    function messages(c) { return c.messages.concat((local.items || []).filter(function (m) { return m.conversationId === c.id; }).map(function (m) { return { text: m.text, createdAt: m.createdAt, author: 'Proveedor', local: true }; })); }
    if (owner && owner !== providerId) selected = null;
    owner = providerId;
    if (!history.items.length) {
      root.innerHTML = '<p class="nx-note">Mensajes de la demo · conectados con el comprador</p><section class="provider-panel provider-empty"><h2>No tienes conversaciones</h2><p>Aquí verás los mensajes de tus compras en grupo.</p><a class="nx-btn nx-btn--primary" href="' + ui.esc(ui.href('oportunidades.html')) + '">Ver compras en grupo</a></section>' + ui.next(['Aún no tienes mensajes','Revisa tus compras en grupo','Consulta sus condiciones']); return;
    }
    if (!history.items.some(function (c) { return c.id === selected; })) selected = history.items[0].id;
    window.NexoraScenarioRead.markRead(providerId, selected);
    function context(c) { return history.opportunities.find(function (o) { return o.id === c.opportunityId; }); }
    function thread(c) {
      var opportunity = context(c), items = messages(c);
      return '<header class="provider-thread-header"><button type="button" class="ms-back" data-messages-back>← Conversaciones</button><div class="ms-thread-person"><span class="ms-avatar" aria-hidden="true">C</span><div><h2 id="provider-thread-heading" tabindex="-1">Comprador</h2><p>' + ui.esc(opportunity.product.name) + ' · ' + ui.esc(opportunity.presentation) + '</p></div></div><a class="nx-btn nx-btn--primary" href="' + ui.esc(ui.href('detalle-oportunidad.html?id=' + encodeURIComponent(c.opportunityId))) + '">Ver compra en grupo</a></header><p class="ms-readonly">Mensajes de la demo · conectados con el comprador</p><div class="provider-thread-body">' + (items.length ? '<ol class="provider-message-list">' + items.map(function (m) {
        var own = m.author.indexOf('Proveedor') === 0;
        return '<li class="' + (own ? 'ms-message-own' : 'ms-message-buyer') + '"><div class="provider-message-meta"><strong>' + (own ? 'Tu negocio' : 'Comprador') + '</strong>' + (m.local ? '<time datetime="' + ui.esc(m.createdAt) + '">' + ui.esc(date(m.createdAt) + ' · ' + new Intl.DateTimeFormat('es-PE', {timeZone:'America/Lima',hour:'2-digit',minute:'2-digit'}).format(new Date(m.createdAt))) + '</time>' : time(m.createdAt)) + '</div><p class="provider-message-text">' + ui.esc(m.text) + '</p></li>';
      }).join('') + '</ol>' : '<div class="provider-thread-empty"><h3>Aún no hay mensajes</h3><p>Puedes consultar otra conversación.</p></div>') + '</div><form class="ms-compose" id="ms-compose" novalidate><label class="ms-compose-label" for="ms-message">Escribe un mensaje...</label><div class="ms-compose-row"><textarea id="ms-message" name="message" rows="2" maxlength="1000" placeholder="Escribe un mensaje..." aria-describedby="ms-help ms-error">' + ui.esc(drafts[c.id] || '') + '</textarea><button class="nx-btn nx-btn--primary" type="submit" id="ms-send" disabled>Enviar <span aria-hidden="true">➤</span></button></div><small id="ms-help">Hasta 1000 caracteres.</small><p id="ms-error" role="alert">' + ui.esc(local.error || '') + '</p><p class="ms-status" id="ms-status" role="status"></p></form>';
    }
    function inbox() { return history.items.map(function (c) {
      var opportunity = context(c), items = messages(c), last = items[items.length - 1];
      return '<li><button type="button" class="provider-conversation" data-provider-conversation="' + ui.esc(c.id) + '" aria-pressed="' + (selected === c.id) + '" aria-controls="provider-thread"><span class="ms-avatar" aria-hidden="true">C</span><span class="ms-conversation-copy"><span class="provider-conversation-title">Comprador</span><span class="provider-conversation-ref">' + ui.esc(opportunity.product.name) + '</span><span class="provider-conversation-preview">' + ui.esc(last ? last.text : 'Aún no hay mensajes') + '</span>' + time(last ? last.createdAt : c.createdAt) + '</span></button></li>';
    }).join(''); }
    root.innerHTML = '<div class="provider-mailbox"><aside class="provider-inbox" aria-labelledby="provider-inbox-heading"><div class="provider-inbox-header"><span class="ms-eyebrow">TU BANDEJA</span><h2 id="provider-inbox-heading" tabindex="-1">Conversaciones</h2><p>' + history.items.length + (history.items.length === 1 ? ' conversación asociada' : ' conversaciones asociadas') + '</p></div><nav aria-label="Conversaciones existentes"><ul class="provider-conversation-list" id="provider-conversation-list">' + inbox() + '</ul></nav></aside><section class="provider-thread" id="provider-thread" aria-labelledby="provider-thread-heading" aria-live="polite">' + thread(history.items.find(function (c) { return c.id === selected; })) + '</section></div><div class="ms-next">' + ui.next(['Elige una conversación','Lee los mensajes','Revisa la compra en grupo']) + '</div>';
    function composer() {
      var input = document.getElementById('ms-message'), button = document.getElementById('ms-send');
      button.disabled = !input.value || !input.value.trim() || input.value.trim().length > store.limit;
    }
    composer();
    root.oninput = function (e) {
      if (e.target.id !== 'ms-message') return;
      drafts[selected] = e.target.value; composer();
      document.getElementById('ms-error').textContent = e.target.value.trim().length > store.limit ? 'El mensaje puede tener como máximo 1000 caracteres.' : '';
      document.getElementById('ms-status').textContent = '';
    };
    root.onsubmit = function (e) {
      if (e.target.id !== 'ms-compose') return;
      e.preventDefault();
      var input = document.getElementById('ms-message'), result = store.send(selected, input.value);
      if (result.error) { document.getElementById('ms-error').textContent = result.error; return; }
      if (window.NexoraShared && window.NexoraShared.activo()) history = window.NexoraScenarioRead.conversations(providerId);
      else local.items = (local.items || []).concat([result.message]); local.error = ''; drafts[selected] = '';
      document.getElementById('provider-thread').innerHTML = thread(history.items.find(function (c) { return c.id === selected; }));
      document.getElementById('provider-conversation-list').innerHTML = inbox();
      document.getElementById('ms-status').textContent = 'Mensaje guardado en esta demo.'; ui.toast('✓ Mensaje enviado');
      var body = document.getElementById('provider-thread').querySelector('.provider-thread-body');
      if (body) body.scrollTop = body.scrollHeight;
      document.getElementById('ms-message').focus();
    };
    // One local handler per render; selection never touches sessionStorage or shared records.
    root.onclick = function (e) {
      var back = e.target.closest('[data-messages-back]');
      if (back && back.dataset.messagesBack !== undefined && root.classList && typeof root.classList.remove === 'function') { root.classList.remove('ms-thread-view'); document.getElementById('provider-inbox-heading').focus(); return; }
      var button = e.target.closest('[data-provider-conversation]'); if (!button) return;
      var conversation = history.items.find(function (c) { return c.id === button.dataset.providerConversation; }); if (!conversation) return;
      if (root.classList && typeof root.classList.add === 'function') root.classList.add('ms-thread-view');
      window.NexoraScenarioRead.markRead(providerId, conversation.id);
      if (selected === conversation.id) { if (typeof window.matchMedia === 'function' && window.matchMedia('(max-width:760px)').matches) document.getElementById('provider-thread-heading').focus(); return; }
      selected = conversation.id;
      window.NexoraScenarioRead.markRead(providerId, selected);
      document.getElementById('provider-conversation-list').innerHTML = inbox();
      document.getElementById('provider-thread').innerHTML = thread(conversation);
      composer();
      document.getElementById('provider-thread-heading').focus();
    };
  });
})();
