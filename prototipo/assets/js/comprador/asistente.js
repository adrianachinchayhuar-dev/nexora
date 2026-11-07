/* Nexi: interfaz independiente. responder(mensaje, contexto) es de solo lectura y devuelve
   {texto, tarjetas, acciones}. Puede sustituirse por una API LLM sin cambiar el panel.
   Las escrituras quedan fuera del respondedor: requieren una confirmación explícita. */
(function () {
  'use strict';
  var CHIPS = ['Registrar un pedido', '¿Cómo van mis compras?', '¿Por qué no tengo compra en grupo?', '¿Cuánto puedo ahorrar?', '¿Qué es un tramo?'];
  function normal(s) { return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
  function respuesta(texto, tarjetas, acciones) { return { texto: texto, tarjetas: tarjetas || [], acciones: acciones || [] }; }
  function link(label, href) { return { label: label, href: href }; }
  function contexto(store, flow) { return { store: store, flow: flow }; }
  function identidad(store) {
    var s = store.get();
    return JSON.stringify([s.user.id, s.scenarioId || '', s.baseDate, s.scenarioDate, s.opps.map(function (o) { return [o.id, o.from, o.until, o.closeDate]; })]);
  }
  function preparar(texto, c) {
    if (!c.flow || !c.flow.interpretarPedido) return null;
    var store = c.store, filas = c.flow.interpretarPedido(texto);
    if (!filas.length || filas.every(function (i) { return !i.k; })) return null;
    var items = filas.map(function (i) {
      var p = store.productById(i.k);
      return Object.assign({}, i, { presentation: p ? p.detail : '', price: null, brand: '', marca: '', soloEstaMarca: false });
    });
    var date = store.finDeSemana(), zone = store.zonaPorDefecto();
    return { texto: texto, items: items, date: date, zone: zone, contexto: identidad(store),
      error: items.some(function (i) { return !!i.warning; }) ? 'Revisa las cantidades y unidades en el formulario.' : store.validate(items, date, zone) };
  }
  function responder(mensaje, c) {
    var m = normal(mensaje), store = c.store, s = store.get();
    if (/por que|sin coincidencia|no tengo.*grupo/.test(m)) {
      var motivos = s.needs.map(function (n) { var r = store.noMatchReason(n); return r ? { titulo: n.product, texto: n.qty + ' ' + n.unit + ' · ' + r.text, acciones: [link('Revisar pedido', 'necesidad.html?id=' + encodeURIComponent(n.id))] } : null; }).filter(Boolean);
      return respuesta(motivos.length ? 'Estos son los motivos de tus pedidos guardados:' : 'No hay pedidos sin coincidencia que pueda explicar ahora.', motivos);
    }
    if (/como van|mis compras|mis participaciones/.test(m)) {
      var compras = store.ownParticipations().map(function (p) {
        var snap = p.snapshot || {}, o = s.opps.find(function (x) { return x.id === p.opportunityId; });
        var n = s.needs.find(function (x) { return x.id === p.needId; }), estado = o && store.estadoVisible(o);
        var ahorro = p.status === 'Confirmada' && n && o ? store.ahorroEstimado(n, o) : null;
        return { titulo: snap.product || 'Participación', texto: snap.qty + ' ' + snap.unit + ' · ' + (p.status === 'Retirada' ? 'Te retiraste' : estado ? estado.texto : p.status) + (ahorro && Number.isFinite(ahorro.neto) ? ' · Ahorro estimado S/ ' + ahorro.neto.toFixed(2) + (ahorro.referencial ? ' · referencial' : '') + (ahorro.preliminar ? ' · preliminar' : '') : ''), acciones: [link('Ver seguimiento', 'participacion.html?id=' + encodeURIComponent(p.id))] };
      });
      return respuesta(compras.length ? 'Así van tus participaciones:' : 'Todavía no tienes participaciones. Guardar un pedido no significa unirte.', compras, [link('Explorar compras en grupo', 'oportunidades.html')]);
    }
    if (/cuanto.*ahorr|puedo ahorrar|mi ahorro/.test(m)) {
      var total = 0, count = 0, referencial = false, preliminar = false;
      // Una referencia por pedido; nunca suma una participación y su pedido dos veces.
      s.needs.forEach(function (n) {
        var p = store.participationForNeed(n.id);
        var o = p ? s.opps.find(function (x) { return x.id === p.opportunityId; }) : s.opps.find(function (x) { return store.compatible(n, x) && !(store.descartada && store.descartada(x.id, n.id)); });
        if (!o || (!p && store.opportunityStatus(o) !== 'abierta')) return;
        var a = store.ahorroEstimado(n, o);
        if (a && Number.isFinite(a.neto) && a.neto > 0) { total += a.neto; count++; referencial = referencial || a.referencial; preliminar = preliminar || a.preliminar; }
      });
      return respuesta(count ? 'Ahorro estimado: S/ ' + total.toFixed(2) + '. Cada pedido se cuenta una vez. No es ahorro obtenido.' + (referencial ? ' Incluye referencias del proveedor cuando no indicaste tu precio.' : '') + (preliminar ? ' Es preliminar: pueden faltar costos de transporte.' : '') : 'Todavía no tengo datos para sumar un ahorro estimado positivo.');
    }
    var conceptos = [
      [/tramo/, 'Un tramo es un precio según la cantidad reunida. Al alcanzar otra cantidad, puede bajar el precio.'],
      [/minimo/, 'Es la cantidad que necesita reunir el grupo. No significa que debas comprarla tú solo.'],
      [/referencial/, 'Comparamos con el precio normal del proveedor porque no indicaste cuánto pagas hoy. No es tu ahorro real.'],
      [/preliminar/, 'Aún pueden faltar costos, como el transporte. El ahorro final podría ser menor.'],
      [/ahorro estimado|ahorro confirmado/, 'El ahorro estimado compara precios con los datos disponibles. Confirmado indica que el proveedor confirmó el precio; no significa una compra real.'],
      [/no me interesa/, 'Oculta esa compra para tu pedido. No borra el pedido ni retira una participación.'],
      [/estados|reuniendo|esperando precio|no se concreto|confirmada/, 'Reuniendo negocios: aún se suman pedidos; Esperando precio del proveedor: se alcanzó el mínimo. Confirmada: confirmó el precio; No se concretó: no se reunió lo necesario a tiempo.']
    ];
    for (var i = 0; i < conceptos.length; i++) if (conceptos[i][0].test(m)) return respuesta(conceptos[i][1]);
    if (/registrar un pedido|hacer un pedido/.test(m)) return respuesta('Dime productos y cantidades. Por ejemplo: 12 botellas de aceite y 8 bolsas de detergente. No compartas datos personales.');
    var pedido = preparar(mensaje, c);
    if (pedido) return Object.assign(respuesta(pedido.error || 'Revisa tu pedido. Solo lo guardaremos cuando confirmes.', pedido.items.map(function (i) {
      var p = store.productById(i.k);
      return { titulo: p ? p.name : 'Producto por revisar', texto: i.presentation + ' · ' + (i.qty === null ? 'Cantidad pendiente' : i.qty + ' ' + (p ? p.unit : '')) + ' · Cualquier marca' };
    }), [link('Editar en el formulario', 'necesidad-nueva.html#pedido=' + encodeURIComponent(mensaje))]), { pedido: pedido });
    return respuesta('Aún no sé responder eso. Prueba con:', [], CHIPS.map(function (t) { return { label: t, mensaje: t }; }));
  }
  function confirmar(pedido, c) {
    if (!pedido || pedido.consumido || pedido.contexto !== identidad(c.store)) return { error: 'El pedido ya se procesó o cambió la sesión. Revísalo de nuevo.' };
    if (pedido.error) return { error: pedido.error };
    var error = c.store.validate(pedido.items, pedido.date, pedido.zone);
    if (error) return { error: error };
    pedido.consumido = true; // Bloquea doble clic y reintentos si el resultado es incierto.
    try { return c.store.register(pedido.texto, pedido.items, pedido.date, pedido.zone); }
    catch (e) { return { error: 'No pude comprobar el guardado. Revisa Mis necesidades antes de repetirlo.' }; }
  }
  window.NexoraAsistente = { responder: responder, confirmar: confirmar, contexto: contexto };
  if (!window.NexoraStore || !window.NexoraUI || !document.body || document.getElementById('nexi-panel')) return;
  var store = window.NexoraStore, ui = window.NexoraUI;
  if (window.NexoraRoleAccess && window.NexoraRoleAccess.enabled()) {
    var active = window.NexoraRoleAccess.current(); if (!active || active.role !== 'comprador') return;
  }
  var ownScript = document.currentScript, assetRoot = new URL('../../', ownScript.src), version = new URL(ownScript.src).search;
  var img = new URL('images/nexi-chatbot.png', assetRoot).href;
  var c = contexto(store, window.NexoraFlow), scope = identidad(store), key = 'nexora.nexi.conversacion.v1:' + encodeURIComponent(scope);
  var storage = { getItem: function (k) { return (window.NexoraScenario ? window.NexoraScenario.storage : window.sessionStorage).getItem(k); }, setItem: function (k, v) { return (window.NexoraScenario ? window.NexoraScenario.storage : window.sessionStorage).setItem(k, v); } };
  var history = [], queue = Promise.resolve(), warning = '';
  try { var saved = JSON.parse(storage.getItem(key) || 'null'); if (saved) { if (!Array.isArray(saved.messages) || saved.messages.some(function (x) { return !x || !['user','nexi'].includes(x.role) || typeof x.texto !== 'string'; })) throw Error('Conversación incompatible'); history = saved.messages.slice(-60); } }
  catch (e) { warning = 'No pude recuperar la conversación. No sobrescribiré su copia.'; }
  var launcher = document.createElement('button'); launcher.id = 'nexi-launcher'; launcher.type = 'button'; launcher.setAttribute('aria-label', 'Abrir asistente Nexi'); launcher.setAttribute('aria-controls', 'nexi-panel'); launcher.setAttribute('aria-expanded', 'false');
  launcher.innerHTML = '<img src="' + img + '" alt=""><span>Pregúntale a Nexi</span>';
  var panel = document.createElement('dialog'); panel.id = 'nexi-panel'; panel.setAttribute('aria-labelledby', 'nexi-title');
  panel.innerHTML = '<header class="nexi-head"><img src="' + img + '" alt=""><div><h2 id="nexi-title">Nexi · tu asistente de compras</h2><small>Demo · respuestas simuladas</small></div><button type="button" id="nexi-close" aria-label="Cerrar asistente Nexi">×</button></header><div id="nexi-history" role="log" aria-live="polite" aria-relevant="additions"></div><p id="nexi-status" role="status"></p><form id="nexi-form"><label for="nexi-input">Tu mensaje</label><div><textarea id="nexi-input" rows="2" maxlength="1000" placeholder="Escribe tu consulta…" required></textarea><button type="submit" aria-label="Enviar mensaje a Nexi">Enviar</button></div></form>';
  document.body.append(launcher, panel);
  var log = document.getElementById('nexi-history'), input = document.getElementById('nexi-input'), status = document.getElementById('nexi-status');
  function persist() { if (warning) return; try { storage.setItem(key, JSON.stringify({ messages: history.slice(-60), draft: input.value })); } catch (e) { status.textContent = 'No se pudo conservar la conversación. Puedes seguir consultando.'; } }
  function sameContext() {
    try { if (window.NexoraScenario) window.NexoraScenario.assertCurrent();
      if (window.NexoraRoleAccess && window.NexoraRoleAccess.enabled()) { var role = window.NexoraRoleAccess.current(); if (!role || role.role !== 'comprador') return false; }
      return scope === identidad(store);
    } catch (e) { return false; }
  }
  function actions(root, list) { (Array.isArray(list) ? list : []).forEach(function (a) {
    var el = document.createElement(a.href ? 'a' : 'button'); el.textContent = a.label;
    if (a.href) { if (!/^(necesidad|necesidades|necesidad-nueva|participacion|oportunidades|detalle-oportunidad)\.html(?:[?#]|$)/.test(a.href)) return; el.href = ui.buyerHref(a.href); }
    else { el.type = 'button'; el.addEventListener('click', function () { send(a.mensaje); }); }
    root.append(el);
  }); }
  function render(message, recovering) {
    var row = document.createElement('article'); row.className = 'nexi-message nexi-' + message.role;
    if (message.role === 'nexi') { var avatar = document.createElement('img'); avatar.src = img; avatar.alt = ''; row.append(avatar); }
    var body = document.createElement('div'), text = document.createElement('p'); text.textContent = message.texto; body.append(text);
    (Array.isArray(message.tarjetas) ? message.tarjetas : []).forEach(function (card) { var section = document.createElement('section'), title = document.createElement('b'), desc = document.createElement('p'); title.textContent = card.titulo; desc.textContent = card.texto; section.append(title, desc); actions(section, card.acciones); body.append(section); });
    actions(body, message.acciones);
    if (message.pedido && !recovering) {
      var p = message.pedido, info = document.createElement('p'); info.textContent = 'Esta semana · ' + p.date + ' · ' + store.zoneName(p.zone); body.append(info);
      var confirm = document.createElement('button'); confirm.type = 'button'; confirm.textContent = 'Confirmar y guardar'; confirm.disabled = !!p.error;
      confirm.addEventListener('click', function () {
        if (!sameContext()) { status.textContent = 'Cambió la sesión. Recarga antes de guardar.'; return; }
        confirm.disabled = true; var result = confirmar(p, c);
        if (result.error) { respondLater(function () { return respuesta(result.error); }); return; }
        window.dispatchEvent(new Event('nexora-demo-change'));
        var cards = result.needs.map(function (n) {
          var found = store.get().opps.filter(function (o) { return store.compatible(n, o); });
          return { titulo: n.product, texto: found.length ? 'Guardado. Hay compra en grupo para esto.' : 'Guardado. ' + ((store.noMatchReason(n) || {}).text || 'Aún no hay compra en grupo.'), acciones: found.map(function (o) { return link('Ver compra en grupo', 'detalle-oportunidad.html?id=' + encodeURIComponent(o.id) + '&necesidad=' + encodeURIComponent(n.id)); }) };
        });
        respondLater(function () { return respuesta('Tu pedido quedó guardado. No confirmaste ninguna compra ni participación.', cards, [link('Mis necesidades', 'necesidades.html')]); });
      }); body.append(confirm);
    } else if (recovering && message.pedido) { var note = document.createElement('p'); note.textContent = 'Confirma el estado en Mis necesidades antes de volver a registrar.'; body.append(note); }
    row.append(body); log.append(row); log.scrollTop = log.scrollHeight;
  }
  function append(role, data) { var msg = Object.assign({ role: role }, data); history.push(msg); history = history.slice(-60); render(msg, false); persist(); }
  function respondLater(fn) { queue = queue.then(function () {
    if (!sameContext()) return;
    var typing = document.createElement('p'); typing.className = 'nexi-typing'; typing.textContent = 'Nexi está escribiendo…'; log.append(typing); log.scrollTop = log.scrollHeight;
    return new Promise(function (resolve) { setTimeout(resolve, 600); }).then(function () { typing.remove(); if (sameContext()) append('nexi', fn()); });
  }).catch(function () { status.textContent = 'No pude completar la consulta. Tus registros no cambiaron.'; }); }
  var dependency;
  function interpreter() {
    if (window.NexoraFlow && window.NexoraFlow.interpretarPedido) { c.flow = window.NexoraFlow; return Promise.resolve(); }
    if (!dependency) dependency = new Promise(function (resolve, reject) {
      var script = document.createElement('script'); script.src = new URL('js/comprador/flujo-necesidad.js' + (version ? version + '&nexi=1' : '?nexi=1'), assetRoot).href;
      script.onload = function () { c.flow = window.NexoraFlow; resolve(); }; script.onerror = reject; document.head.append(script);
    }); return dependency;
  }
  function send(value) { value = String(value || '').trim(); if (!value || value.length > 1000) return;
    if (!sameContext()) { status.textContent = 'Cambió la sesión. Recarga para continuar.'; return; }
    input.value = ''; append('user', { texto: value });
    interpreter().then(function () { respondLater(function () { return responder(value, c); }); }).catch(function () { respondLater(function () { return respuesta('No pude cargar el intérprete. Puedes usar el formulario.', [], [link('Abrir formulario', 'necesidad-nueva.html')]); }); });
  }
  history.forEach(function (m) { render(m, true); });
  try { var recovered = JSON.parse(storage.getItem(key) || 'null'); if (recovered && typeof recovered.draft === 'string') input.value = recovered.draft.slice(0, 1000); } catch (e) { /* Solo lectura; no borrar. */ }
  status.textContent = warning;
  launcher.addEventListener('click', function () { if (panel.open) return; panel.showModal(); log.scrollTop = log.scrollHeight; launcher.setAttribute('aria-expanded', 'true'); input.focus();
    if (!history.length) respondLater(function () { return respuesta('¡Hola, ' + store.get().user.name + '! Soy Nexi. ¿En qué te ayudo?', [], CHIPS.map(function (t) { return { label: t, mensaje: t }; })); });
  });
  document.getElementById('nexi-close').addEventListener('click', function () { panel.close(); });
  panel.addEventListener('close', function () { launcher.setAttribute('aria-expanded', 'false'); launcher.focus(); persist(); });
  panel.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { e.preventDefault(); panel.close(); }
    if (e.key === 'Tab') { var controls = Array.from(panel.querySelectorAll('button:not(:disabled),a[href],textarea')); var first = controls[0], last = controls[controls.length - 1]; if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } }
  });
  input.addEventListener('input', persist);
  input.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(input.value); } });
  document.getElementById('nexi-form').addEventListener('submit', function (e) { e.preventDefault(); send(input.value); });
})();
