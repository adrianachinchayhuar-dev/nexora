(function () {
  var store = window.NexoraStore;
  var componentScript = document.currentScript;
  var revision = componentScript ? new URL(componentScript.src).searchParams.get('v') : null;
  var ROUTES = { inicio: 'dashboard.html', necesidades: 'necesidades.html', oportunidades: 'oportunidades.html', catalogo: 'catalogo.html', mensajes: 'mensajes.html', perfil: 'perfil.html', seguimiento: 'seguimiento.html' };
  var filename = location.pathname.split('/').pop();
  var page = Object.keys(ROUTES).find(function (key) { return ROUTES[key] === filename; }) || document.body.dataset.page || 'inicio';
  // Nivel 2: el menú resalta la sección padre (data-parent en <body>).
  var PARENTS = { 'detalle-oportunidad': 'oportunidades', necesidad: 'necesidades', 'necesidad-nueva': 'necesidades', participacion: 'seguimiento' };
  var parentKey = document.body && document.body.dataset ? document.body.dataset.parent : null;
  var activePage = parentKey || PARENTS[page] || page;
  var MENU = [['inicio','Inicio','home'],['necesidades','Mis necesidades','clip'],['oportunidades','Compras en grupo','spark'],['catalogo','Catálogo','store'],['seguimiento','Seguimiento','track'],['mensajes','Mensajes','chat'],['perfil','Perfil','user']];
  var BOT = ['inicio','necesidades','oportunidades','mensajes'];
  function $(id) { return document.getElementById(id); }
  var esc = window.NexoraUtils.esc;
  function ic(n) { return '<svg class="ic" aria-hidden="true"><use href="#' + n + '"/></svg>'; }
  function money(n) { return 'S/ ' + n.toFixed(2); }
  // Quita «(demo)» y simplifica zonas al mostrar («Santa Anita · zona Centro (demo)» → «Santa Anita – Centro»).
  function plain(text) { return String(text || '').replace(/\s*\(demo\)/gi, '').replace(/ · zona /i, ' – ').replace(/ · /, ' – ').trim(); }
  var tt;
  // Aviso único: abajo a la derecha (abajo al centro en móvil), desaparece a los 4 s; con acción dura 5 s.
  var toastAction = null;
  function toast(m, options) {
    var t = $('toast'); toastAction = options && options.action || null;
    if (toastAction) t.innerHTML = '<span class="toast__text">' + esc(m) + '</span><button type="button" class="toast__action">' + esc(toastAction.label) + '</button>'; else t.textContent = m;
    t.classList.add('on'); clearTimeout(tt); tt = setTimeout(function () { t.classList.remove('on'); toastAction = null; }, (options && options.duration) || (toastAction ? 5000 : 4000));
  }

  function routeHref(key) {
    if (!Object.prototype.hasOwnProperty.call(ROUTES, key)) throw new Error('Error de integración: ruta de menú desconocida (' + key + ').');
    return ROUTES[key] + (revision ? '?revision=' + encodeURIComponent(revision) : '');
  }
  // Keep navigation within the same release, without changing filters, IDs or hashes.
  function buyerHref(href) {
    var url = new URL(href, location.href), folder = new URL('.', location.href);
    if (!revision || url.origin !== folder.origin || url.pathname.slice(0, url.pathname.lastIndexOf('/') + 1) !== folder.pathname) return href;
    var file = url.pathname.split('/').pop();
    if (Object.keys(ROUTES).some(function (key) { return ROUTES[key] === file; }) || ['detalle-oportunidad.html', 'necesidad.html', 'necesidad-nueva.html', 'participacion.html'].indexOf(file) !== -1) url.searchParams.set('revision', revision);
    return url.href;
  }
  function versionLink(e) {
    var link = e.target.closest('a[href]'); if (link) link.href = buyerHref(link.href);
  }
  function navigateMenu(e) {
    var a = e.target.closest('a[data-k]');
    if (a) {
      var k = a.dataset.k;
      if (k === 'salir') { e.preventDefault(); var logoutError = window.NexoraDemo.logout(); if (logoutError) toast(logoutError); return; }
      if (Object.prototype.hasOwnProperty.call(ROUTES, k)) {
        a.setAttribute('href', routeHref(k));
        if (k === page) { e.preventDefault(); drawer(false); }
        return;
      }
      e.preventDefault(); drawer(false);
      var error = 'Error de integración: el enlace del menú no tiene una ruta válida (' + k + ').';
      console.error(error); toast(error); return;
    }
    if (e.target.closest('#more')) { drawer(true); return; }
    if (!$('pop').hidden && !e.target.closest('.bw')) pop(false);
  }

  function renderNav() {
    var GROUPS = [['Comprar', ['inicio', 'necesidades', 'oportunidades', 'catalogo']], ['Mi actividad', ['seguimiento', 'mensajes']]];
    $('nav').innerHTML = GROUPS.map(function (g) {
      return '<p class="nav-label">' + g[0] + '</p>' + MENU.filter(function (m) { return g[1].indexOf(m[0]) > -1; }).map(function (m) { return '<a href="' + routeHref(m[0]) + '" data-k="' + m[0] + '"' + (m[0] === activePage ? ' class="on" aria-current="page"' : '') + ' data-tip="' + m[1] + '">' + ic(m[2]) + '<span>' + m[1] + '</span>' + ({ oportunidades: 1, mensajes: 1 }[m[0]] ? '<em class="nav-count" data-count="' + m[0] + '" hidden></em>' : '') + '</a>'; }).join('');
    }).join('');
    var botItem = function (k, label) { var m = MENU.find(function (x) { return x[0] === k; }); return '<a href="' + routeHref(k) + '" data-k="' + k + '"' + (k === activePage ? ' class="on" aria-current="page"' : '') + '>' + ic(m[2]) + '<span>' + label + '</span></a>'; };
    $('bot').innerHTML = botItem('inicio', 'Inicio') + botItem('necesidades', 'Necesidades') + '<a class="bot__new" href="' + buyerHref('necesidad-nueva.html') + '" aria-label="Nueva necesidad"><span class="bot__plus" aria-hidden="true">' + ic('plus') + '</span></a>' + botItem('oportunidades', 'En grupo') + botItem('mensajes', 'Mensajes');
  }
  function drawer(open) {
    $('side').classList.toggle('open', open); $('scrim').hidden = !open;
    $('burger').setAttribute('aria-expanded', open);
    if (open) $('nav').querySelector('a').focus(); else if (document.activeElement && $('side').contains(document.activeElement)) $('burger').focus();
  }
  // Barra lateral en 3 modos: expandida (240 px), compacta (72 px) y oculta (se abre como panel superpuesto).
  // Por debajo de 900 px siempre va oculta; entre 900 y 1200 px es compacta por defecto. La elección se recuerda.
  var MENU_KEY = 'nexora.comprador.menu', menuMode = null;
  function savedMode() { try { var v = localStorage.getItem(MENU_KEY); return v === 'expanded' || v === 'compact' || v === 'hidden' ? v : null; } catch (error) { return null; } }
  function saveMode(v) { try { localStorage.setItem(MENU_KEY, v); } catch (error) { /* sin almacenamiento: se usa la expandida */ } }
  function desiredMode() { var w = window.innerWidth; return w < 900 ? 'hidden' : savedMode() || (w <= 1200 ? 'compact' : 'expanded'); }
  function setMenuMode(mode) {
    var app = document.querySelector('.app'); if (!app || !$('side')) return;
    if (mode !== 'hidden' && $('side').classList.contains('open')) drawer(false);
    menuMode = mode; app.setAttribute('data-menu', mode); app.setAttribute('data-narrow', String(window.innerWidth < 900));
    var open = mode === 'expanded'; $('side-toggle').setAttribute('aria-expanded', String(open)); $('side-toggle').setAttribute('aria-label', open ? 'Contraer menú' : 'Expandir menú');
  }
  function trapDrawerFocus(e) {
    if (e.key !== 'Tab') return;
    var box = !$('pop').hidden ? $('pop') : $('side').classList.contains('open') ? $('side') : null; if (!box) return;
    var items = Array.from(box.querySelectorAll('a[href], button')).filter(function (el) { return !el.disabled && !el.hidden && el.offsetParent !== null; });
    if (!items.length) return;
    var first = items[0], last = items[items.length - 1];
    if (!box.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
    else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function notificationTitle(n) {
    if (/^Participación demostrativa retirada/.test(n.text)) return 'Participación demo retirada';
    if (/^Te uniste:/.test(n.text)) return 'Te uniste a una compra en grupo';
    if (/^Registraste/.test(n.text)) return 'Necesidades registradas';
    if (/^Se formó/.test(n.text)) return 'Nueva oportunidad';
    if (/actualizó su precio/.test(n.text)) return 'Precio actualizado';
    if (/interpretado/.test(n.text)) return 'Pedido para revisar';
    if (/^El precio cambió/.test(n.text)) return 'Cambió el precio';
    if (/^Bienvenida/.test(n.text)) return 'Bienvenida a NEXORA';
    return 'Aviso demostrativo';
  }
  // Avisos generados con datos existentes (compras que cierran, avisos del proveedor, respuestas, pedidos con compra en grupo)
  // más los avisos guardados en el estado. Los generados recuerdan su lectura en sessionStorage.
  var ALERTS_KEY = 'nexora.comprador.alertsRead';
  function readAlerts() { try { return JSON.parse(sessionStorage.getItem(ALERTS_KEY) || '[]'); } catch (error) { return []; } }
  function writeAlerts(list) { try { sessionStorage.setItem(ALERTS_KEY, JSON.stringify(list)); return true; } catch (error) { return false; } }
  function dayDiff(a, b) { return Math.round((new Date(a + 'T12:00:00Z') - new Date(b + 'T12:00:00Z')) / 86400000); }
  function agoDay(iso) { var d = dayDiff(store.today(), iso); return d <= 0 ? 'hoy' : d === 1 ? 'ayer' : d <= 7 ? 'hace ' + d + ' días' : new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(iso + 'T12:00:00Z')); }
  // Enlace de los avisos guardados en el estado (los de texto fijo de la demo).
  function legacyHref(n) {
    if (n.href) return n.href;
    if (/^Participación demostrativa/.test(n.text)) return 'seguimiento.html';
    if (/^Registraste|interpretado/.test(n.text)) return 'necesidades.html';
    if (/^Se formó|actualizó su precio/.test(n.text)) return 'oportunidades.html';
    return '';
  }
  function buildAlerts() {
    var today = store.today(), list = [], st = store.get(), name = function (id) { return (store.products[id] || {}).name || id; };
    var joined = (store.ownParticipations ? store.ownParticipations() : []).filter(function (p) { return p.status === 'Confirmada'; });
    joined.forEach(function (p) {
      var o = st.opps.find(function (x) { return x.id === p.opportunityId; }); if (!o) return;
      var left = dayDiff(o.closeDate, today);
      if (left >= 0 && left <= 2) list.push({ id: 'close:' + p.id, ic: 'track', text: 'Tu compra de ' + name(o.product).toLowerCase() + ' cierra ' + (left === 0 ? 'hoy' : left === 1 ? 'mañana' : 'en 2 días'), date: today, href: 'participacion.html?id=' + encodeURIComponent(p.id) });
      store.opportunityNotices(o).filter(function (n) { return dayDiff(today, n.date) <= 1; }).forEach(function (n) { list.push({ id: 'notice:' + n.id, ic: 'megaphone', text: 'Nuevo aviso del proveedor en ' + name(o.product).toLowerCase(), date: n.date, href: 'detalle-oportunidad.html?id=' + encodeURIComponent(o.id) }); });
      store.opportunityQuestions(o).filter(function (q) { return q.answer && !/^PRE-op\d+-\d+$/.test(q.id); }).forEach(function (q) { list.push({ id: 'answer:' + q.id, ic: 'chat', text: 'Respondieron tu pregunta en ' + name(o.product).toLowerCase(), date: q.answeredAt || q.date, href: 'detalle-oportunidad.html?id=' + encodeURIComponent(o.id) }); });
    });
    // Cambios de estado de las compras que te importan (te uniste o tienes un pedido compatible, sin ocultar).
    var joinedIds = joined.map(function (p) { return p.opportunityId; });
    st.opps.forEach(function (o) {
      var mine = joinedIds.indexOf(o.id) !== -1, open = store.opportunityStatus(o) === 'abierta';
      if (!mine && !store.compatibleNeeds(o).some(function (n) { return !store.descartada(o.id, n.id); })) return;
      var e = store.estadoVisible ? store.estadoVisible(o) : null, label = name(o.product).toLowerCase(), href = 'detalle-oportunidad.html?id=' + encodeURIComponent(o.id);
      if (e && e.clave === 'esperando_precio') list.push({ id: 'estado:' + o.id + ':esperando', ic: 'track', text: 'Esperando precio del proveedor: ' + label, date: e.desde || today, href: href });
      if (e && e.clave === 'confirmada') list.push({ id: 'estado:' + o.id + ':confirmada', ic: 'check', text: 'Compra confirmada: ' + label, date: e.desde || today, href: href });
      if (e && e.clave === 'no_se_concreto') list.push({ id: 'estado:' + o.id + ':fin', ic: 'users', text: store.proveedorSuspendido(o) ? 'No se concretó la compra de ' + label + ': el proveedor ya no está disponible' : 'No se concretó la compra de ' + label, date: store.proveedorSuspendido(o) ? today : e.desde || today, href: href });
      var left = dayDiff(o.closeDate, today);
      if (!mine && open && left >= 0 && left <= 2) list.push({ id: 'close:opp:' + o.id, ic: 'track', text: 'La compra de ' + label + ' cierra ' + (left === 0 ? 'hoy' : left === 1 ? 'mañana' : 'en 2 días'), date: today, href: href });
    });
    st.needs.filter(function (n) { return n.status === 'Con coincidencia' && !store.participationForNeed(n.id); }).forEach(function (n) { list.push({ id: 'match:' + n.id, ic: 'spark', text: 'Tu pedido de ' + n.product.toLowerCase() + ' ya tiene compra en grupo', date: String(n.createdAt || today).slice(0, 10), href: n.opportunityIds && n.opportunityIds[0] ? 'detalle-oportunidad.html?id=' + encodeURIComponent(n.opportunityIds[0]) + '&necesidad=' + encodeURIComponent(n.id) : 'necesidad.html?id=' + encodeURIComponent(n.id) }); });
    store.ownConversations().forEach(function (c) { if (store.conversationMessages(c.id).some(function (m) { return m.direction === 'received' && !m.readAt; })) list.push({ id: 'chat:' + c.id, chat: true, ic: 'chat', text: 'Mensaje sin leer del proveedor', date: today, href: 'mensajes.html?conversacion=' + encodeURIComponent(c.id) }); });
    return list.sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; });
  }
  function renderNotifs() {
    var legacy = store.get().notifs, read = readAlerts(), alerts = buildAlerts(), today = store.today();
    var unread = legacy.filter(function (n) { return !n.read; }).length + alerts.filter(function (a) { return (a.chat || read.indexOf(a.id) === -1); }).length;
    var groups = { Hoy: [], Antes: [] };
    alerts.forEach(function (a) {
      var isNew = (a.chat || read.indexOf(a.id) === -1);
      groups[a.date === today ? 'Hoy' : 'Antes'].push('<li class="' + (isNew ? 'un' : '') + '"><a class="notification-content alert-link" href="' + esc(buyerHref(a.href)) + '" data-alert="' + esc(a.id) + '"><span class="alert-ic" aria-hidden="true">' + ic(a.ic) + '</span><span class="alert-body"><span class="notification-title">' + esc(a.text) + '</span><small><span>' + esc(agoDay(a.date)) + '</span>' + (isNew ? '<span class="sr">No leída</span>' : '') + '</small></span></a></li>');
    });
    legacy.forEach(function (n, i) {
      groups[/^(Ahora|Hace \d+ ?(min|h))/.test(n.when) ? 'Hoy' : 'Antes'].push('<li class="' + (n.read ? '' : 'un') + '"><div class="notification-content"><strong class="notification-title">' + esc(notificationTitle(n)) + '</strong><p>' + esc(String(n.text).replace(/:?\s*(PAR|NEC|PED)-[\w-]+/g, '')) + '</p><small><span>' + esc(n.when) + '</span><span>' + (n.read ? 'Leída' : 'No leída') + '</span>' + (legacyHref(n) ? '<a class="link" href="' + esc(buyerHref(legacyHref(n))) + '">Ver</a>' : '') + (n.read ? '' : '<button class="link" type="button" data-read="' + i + '">Marcar leída</button>') + '</small></div></li>');
    });
    var html = ['Hoy', 'Antes'].filter(function (g) { return groups[g].length; }).map(function (g) { return '<li class="nl__group" role="presentation">' + g + '</li>' + groups[g].join(''); }).join('');
    $('nl').innerHTML = html || '<li class="empty"><span class="alert-ic alert-ic--ok" aria-hidden="true">' + ic('check') + '</span><strong>Estás al día</strong><span>No tienes avisos nuevos.</span></li>';
    $('badge').hidden = !unread; $('badge').textContent = unread;
    $('readall').hidden = !unread;
    $('bell').setAttribute('aria-label', unread ? 'Ver notificaciones: ' + unread + ' sin leer' : 'Ver notificaciones');
  }
  function pop(open) {
    $('pop').hidden = !open; $('bell').setAttribute('aria-expanded', open);
    if ($('pop-scrim')) $('pop-scrim').hidden = !open;
    if (open) $('pclose').focus(); else if ($('pop').contains(document.activeElement)) $('bell').focus();
  }

  // Bienvenida la primera vez (bandera en localStorage; si falla, no se muestra). Se puede volver a ver desde «¿Cómo funciona NEXORA?».
  var WELCOME_KEY = 'nexora.comprador.bienvenida';
  function welcomeSeen() {
    try { if (localStorage.getItem(WELCOME_KEY) === '1') return true; localStorage.setItem(WELCOME_KEY + '.prueba', '1'); localStorage.removeItem(WELCOME_KEY + '.prueba'); return false; } catch (error) { return true; }
  }
  function markWelcome() { try { localStorage.setItem(WELCOME_KEY, '1'); } catch (error) { /* sin almacenamiento */ } }
  function clearWelcome() { try { localStorage.removeItem(WELCOME_KEY); } catch (error) { /* sin almacenamiento */ } }
  function showWelcome() {
    if (!document.createElement) return;
    var d = document.getElementById('welcome');
    if (!d) {
      d = document.createElement('dialog'); d.id = 'welcome'; d.className = 'welcome'; d.setAttribute('aria-labelledby', 'welcome-title');
      var step = function (icon, title, text) { return '<li><span class="welcome__ic" aria-hidden="true">' + ic(icon) + '</span><div><strong>' + title + '</strong><small>' + text + '</small></div></li>'; };
      d.innerHTML = '<a class="welcome__logo" href="' + buyerHref('dashboard.html') + '" data-k="inicio" aria-label="NEXORA, ir al inicio"><img src="../../assets/images/logo-nexora-800.png" width="300" height="84" alt=""></a>' +
        '<h2 id="welcome-title">¡Hola, ' + esc(store.get().user.name) + '!</h2><p class="welcome__lead">Compra junto a otros negocios y paga menos. Así funciona:</p>' +
        '<ol class="welcome__steps">' + step('clip', 'Cuéntanos qué necesitas', 'Escríbelo como lo dirías.') + step('spark', 'Te mostramos compras en grupo', 'Con el precio y cuánto ahorras.') + step('users', 'Tú decides si te unes', 'Guardar un pedido no es comprar.') + '</ol>' +
        '<div class="welcome__actions"><a class="nx-btn nx-btn--primary" href="' + buyerHref('necesidad-nueva.html') + '" data-welcome-first>Hacer mi primer pedido</a><button class="nx-btn nx-btn--secondary" type="button" data-welcome-close>Ver la app</button></div>';
      document.body.appendChild(d);
      d.addEventListener('close', markWelcome);
      d.addEventListener('click', function (e) {
        if (e.target.closest('[data-welcome-first]')) { markWelcome(); return; }
        if (e.target.closest('[data-welcome-close]')) { markWelcome(); d.close(); return; }
        if (e.target.closest('.welcome__logo')) { markWelcome(); if (page === 'inicio') { e.preventDefault(); d.close(); } }
      });
    }
    if (!d.open) d.showModal();
  }

  function media(id) {
    var p = store.products[id];
    return '<span class="product-media ' + p.tone + '">' + ic(p.icon) + (p.image ? '<img data-product-image="' + esc(id) + '" alt="' + esc(p.name) + '">' : '') + '</span>';
  }
  function bindImages(root) {
    root.querySelectorAll('[data-product-image]').forEach(function (img) {
      var p = store.products[img.dataset.productImage];
      img.addEventListener('error', function () { var icon = img.previousElementSibling; if (icon) icon.classList.remove('image-loaded-hidden'); img.remove(); });
      img.addEventListener('load', function () { var icon = img.previousElementSibling; if (icon) icon.classList.add('image-loaded-hidden'); });
      img.src = new URL(p.image, new URL('../../../', componentScript.src)).href;
    });
  }
  function resetWarning(empty) {
    return 'Esta acción restablece únicamente los datos del escenario comprador: necesidades y pedidos; participaciones confirmadas y retiradas e historial; referencias y filtros; perfil del negocio; conversaciones, mensajes y borradores; y otros datos de sesión asociados al escenario comprador. Los estados privados del proveedor y del administrador se conservan sin cambios. ' + (empty ? 'La lista de necesidades y pedidos quedará vacía; el resto de los datos del comprador volverá a sus valores iniciales. ' : 'Se recuperará el conjunto inicial del comprador. ') + '¿Deseas continuar?';
  }
  function confirmDemo(message, labels) {
    var dialog = document.getElementById('demo-confirm'), opener = document.activeElement;
    document.getElementById('demo-confirm-text').textContent = message;
    document.getElementById('demo-confirm-cancel').textContent = labels && labels.cancel || 'Cancelar';
    document.getElementById('demo-confirm-accept').textContent = labels && labels.accept || 'Confirmar';
    return new Promise(function (resolve) {
      dialog.returnValue = '';
      dialog.addEventListener('close', function done() { dialog.removeEventListener('close', done); if (opener && document.contains(opener)) opener.focus(); resolve(dialog.returnValue === 'accept'); });
      dialog.showModal(); document.getElementById('demo-confirm-cancel').focus();
    });
  }
  function avatar(element) {
    var user = store.get().user, words = String(user.business || '').trim().split(/\s+/).filter(Boolean);
    var initials = words.length ? Array.from(words[0])[0] + (words.length > 1 ? Array.from(words[words.length - 1])[0] : '') : 'N';
    element.textContent = initials.toUpperCase(); element.setAttribute('aria-label', 'Avatar de ' + (user.business || 'negocio demostrativo'));
    if (typeof user.image === 'string' && user.image && !/^(?:[a-z]+:|\/)/i.test(user.image)) {
      var img = document.createElement('img'); img.alt = ''; img.src = new URL(user.image, new URL('../../../', componentScript.src)).href;
      img.addEventListener('error', function () { img.remove(); }); element.appendChild(img);
    }
  }
  function identity() {
    var user = store.get().user; if ($('nm')) $('nm').textContent = user.name;
    avatar($('ini')); avatar($('ini2')); $('bn').textContent = user.business; $('bn2').textContent = user.business; $('bl').textContent = user.name + ' · ' + user.district;
    renderNotifs();
    var unread = store.unreadConversations ? store.unreadConversations() : 0;
    var open = store.get().opps.filter(function (o) { return store.opportunityStatus(o) === 'abierta'; }).length;
    var counts = { mensajes: [unread, ' sin leer'], oportunidades: [open, ' abiertas'] };
    document.querySelectorAll('.nav-count').forEach(function (el) { var c = counts[el.dataset.count]; el.hidden = !c[0]; el.innerHTML = c[0] + '<span class="sr">' + c[1] + '</span>'; });
    document.querySelectorAll('#bot a[data-k="mensajes"] span').forEach(function (label) { label.innerHTML = 'Mensajes' + (unread ? '<span class="sr"> (' + unread + ' sin leer)</span>' : ''); if (label.parentElement && label.parentElement.setAttribute) label.parentElement.setAttribute('data-unread', unread ? '1' : ''); });
  }
  function mount() {
    $('buyer-icons').outerHTML = "<svg width=\"0\" height=\"0\" class=\"svg-definitions\" aria-hidden=\"true\"><defs>\n<linearGradient id=\"gN\" x1=\"0\" y1=\"1\" x2=\"1\" y2=\"0\"><stop offset=\"0\" stop-color=\"#EE7A3C\"/><stop offset=\".5\" stop-color=\"#C0408A\"/><stop offset=\"1\" stop-color=\"#5B2BA0\"/></linearGradient>\n<symbol id=\"N\" viewBox=\"0 0 48 48\"><path d=\"M8 42V8h8l16 20V8h8v34h-8L16 22v20z\" fill=\"url(#gN)\" stroke=\"url(#gN)\" stroke-width=\"3\" stroke-linejoin=\"round\"/></symbol>\n<symbol id=\"home\" viewBox=\"0 0 24 24\"><path d=\"M3 11l9-8 9 8M5 10v10h14V10\"/></symbol>\n<symbol id=\"clip\" viewBox=\"0 0 24 24\"><rect x=\"5\" y=\"4\" width=\"14\" height=\"17\" rx=\"2\"/><path d=\"M9 4h6v3H9zM9 12h6M9 16h6\"/></symbol>\n<symbol id=\"spark\" viewBox=\"0 0 24 24\"><path d=\"M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z\"/><path d=\"M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z\"/></symbol>\n<symbol id=\"store\" viewBox=\"0 0 24 24\"><path d=\"M3 9l1.5-5h15L21 9M3 9c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3s3-1.3 3-3M5 12v8h14v-8M10 20v-5h4v5\"/></symbol>\n<symbol id=\"track\" viewBox=\"0 0 24 24\"><path d=\"M4 19V5M4 19h16M8 15l4-4 3 3 5-6\"/></symbol>\n<symbol id=\"chat\" viewBox=\"0 0 24 24\"><path d=\"M4 5h16v11H9l-5 4z\"/></symbol>\n<symbol id=\"panel\" viewBox=\"0 0 24 24\"><rect x=\"3\" y=\"4\" width=\"18\" height=\"16\" rx=\"3\"/><path d=\"M9 4v16\"/></symbol>\n<symbol id=\"help\" viewBox=\"0 0 24 24\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17h.01\"/></symbol>\n<symbol id=\"megaphone\" viewBox=\"0 0 24 24\"><path d=\"M3 10v4h4l8 4V6L7 10z\"/><path d=\"M18 9a4 4 0 0 1 0 6\"/></symbol>\n<symbol id=\"user\" viewBox=\"0 0 24 24\"><circle cx=\"12\" cy=\"8\" r=\"4\"/><path d=\"M4 21c0-4 4-6 8-6s8 2 8 6\"/></symbol>\n<symbol id=\"icon-bell\" viewBox=\"0 0 24 24\"><path d=\"M6 16v-5a6 6 0 0 1 12 0v5l2 2H4zM10 21h4\"/></symbol>\n<symbol id=\"arr\" viewBox=\"0 0 24 24\"><path d=\"M5 12h14M13 6l6 6-6 6\"/></symbol>\n<symbol id=\"shield\" viewBox=\"0 0 24 24\"><path d=\"M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z\"/><path d=\"M9 12l2 2 4-4\"/></symbol>\n<symbol id=\"coin\" viewBox=\"0 0 24 24\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 7v10M9.5 9.5c0-1 1-1.5 2.5-1.5s2.5.6 2.5 1.7-1 1.5-2.5 1.8-2.5.7-2.5 1.8 1 1.7 2.5 1.7 2.5-.5 2.5-1.5\"/></symbol>\n<symbol id=\"users\" viewBox=\"0 0 24 24\"><circle cx=\"9\" cy=\"8\" r=\"3.2\"/><path d=\"M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6\"/><circle cx=\"17\" cy=\"9\" r=\"2.4\"/><path d=\"M17 14c2.5 0 4 1.8 4 4.5\"/></symbol>\n<symbol id=\"drop\" viewBox=\"0 0 24 24\"><path d=\"M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z\"/></symbol>\n<symbol id=\"box\" viewBox=\"0 0 24 24\"><path d=\"M4 8l8-4 8 4v8l-8 4-8-4zM4 8l8 4 8-4M12 12v8\"/></symbol>\n<symbol id=\"cup\" viewBox=\"0 0 24 24\"><path d=\"M6 4h12l-1.5 16h-9z\"/><path d=\"M7 9h10\"/></symbol>\n<symbol id=\"menu\" viewBox=\"0 0 24 24\"><path d=\"M4 7h16M4 12h16M4 17h16\"/></symbol>\n<symbol id=\"x\" viewBox=\"0 0 24 24\"><path d=\"M6 6l12 12M18 6L6 18\"/></symbol>\n<symbol id=\"check\" viewBox=\"0 0 24 24\"><path d=\"M5 12.5l4.5 4.5L19 7.5\"/></symbol>\n<symbol id=\"plus\" viewBox=\"0 0 24 24\"><path d=\"M12 5v14M5 12h14\"/></symbol>\n<symbol id=\"trash\" viewBox=\"0 0 24 24\"><path d=\"M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13\"/></symbol><symbol id=\"back\" viewBox=\"0 0 24 24\"><path d=\"M19 12H5M11 6l-6 6 6 6\"/></symbol><symbol id=\"chev\" viewBox=\"0 0 24 24\"><path d=\"M9 6l6 6-6 6\"/></symbol><symbol id=\"search\" viewBox=\"0 0 24 24\"><circle cx=\"11\" cy=\"11\" r=\"6\"/><path d=\"M20 20l-4-4\"/></symbol>\n</defs></svg>\n\n";
    $('buyer-sidebar').outerHTML = "  <aside class=\"side\" id=\"side\" aria-label=\"Menú lateral\">\n    <div class=\"sh\">\n      <a class=\"brand\" href=\"dashboard.html\" data-k=\"inicio\" aria-label=\"NEXORA, ir al inicio\"><img src=\"../../assets/images/icono-nexora-64.png\" width=\"36\" height=\"36\" alt=\"\"><b>NEXORA</b></a>\n      <div class=\"sh__tools\">\n        <button class=\"icbtn\" id=\"side-toggle\" type=\"button\" aria-label=\"Contraer menú\" aria-expanded=\"true\" aria-controls=\"side\"><svg class=\"ic\"><use href=\"#panel\"/></svg></button>\n        <button class=\"icbtn\" id=\"side-hide\" type=\"button\" aria-label=\"Ocultar menú\"><svg class=\"ic\"><use href=\"#back\"/></svg></button>\n        <button class=\"icbtn\" id=\"sclose\" type=\"button\" aria-label=\"Cerrar menú\"><svg class=\"ic\"><use href=\"#x\"/></svg></button>\n      </div>\n    </div>\n    <nav class=\"nav\" id=\"nav\" aria-label=\"Principal\"></nav>\n    <a class=\"side-help\" href=\"../../index.html#como\" aria-label=\"¿Cómo funciona NEXORA?\" data-tip=\"¿Cómo funciona NEXORA?\"><svg class=\"ic side-help__ic\" aria-hidden=\"true\"><use href=\"#help\"/></svg><img src=\"../../assets/images/sidebar-comprador-web.png\" width=\"400\" height=\"514\" alt=\"\"><span><b>¿Cómo funciona NEXORA?</b><small>Te lo contamos en 3 pasos</small></span></a>\n  </aside>\n  <div class=\"scrim\" id=\"scrim\" hidden></div>\n\n";
    $('buyer-header').outerHTML = "    <header class=\"top\">\n      <div class=\"mob\">\n        <button class=\"icbtn\" id=\"burger\" type=\"button\" aria-label=\"Abrir menú\" aria-expanded=\"false\" aria-controls=\"side\"><svg class=\"ic\"><use href=\"#menu\"/></svg></button>\n        <a class=\"brand brand--icon\" href=\"dashboard.html\" data-k=\"inicio\" aria-label=\"NEXORA, ir al inicio\"><img src=\"../../assets/images/icono-nexora-64.png\" width=\"32\" height=\"32\" alt=\"\"></a>\n      </div>\n      <div class=\"hello\">\n        <h1>¡Hola, <span class=\"gt\" id=\"nm\">Ana</span>!</h1>\n        <p id=\"sub\"></p>\n      </div>\n      <div class=\"tr\">\n        <a class=\"nx-btn nx-btn--primary nx-topbar-new\" id=\"new-need\" href=\"necesidades.html?nueva=1\"><svg class=\"ic\" aria-hidden=\"true\"><use href=\"#plus\"/></svg><span class=\"nx-topbar-new__text\">Nueva necesidad</span></a>\n        <span class=\"nx-demo\"><button class=\"nx-demo__badge\" id=\"demo-badge\" type=\"button\" aria-expanded=\"false\" aria-controls=\"demo-tip\">Modo demo</button><span class=\"nx-demo__tip\" id=\"demo-tip\" role=\"status\" hidden>Datos de prueba. Nada es una compra real.</span></span>\n        <div class=\"bw\">\n          <button class=\"icbtn\" id=\"bell\" type=\"button\" aria-label=\"Ver notificaciones\" aria-haspopup=\"dialog\" aria-expanded=\"false\" aria-controls=\"pop\"><svg class=\"ic\"><use href=\"#icon-bell\"/></svg><span class=\"badge\" id=\"badge\" hidden>0</span></button>\n          <section class=\"pop\" id=\"pop\" role=\"dialog\" aria-label=\"Notificaciones\" hidden>\n            <div class=\"ph\"><h2>Notificaciones</h2><div><button class=\"link\" id=\"readall\" type=\"button\">Marcar todo como leído</button><button class=\"icbtn\" id=\"pclose\" type=\"button\" aria-label=\"Cerrar notificaciones\"><svg class=\"ic\"><use href=\"#x\"/></svg></button></div></div>\n            <ul class=\"nl\" id=\"nl\"></ul>\n          </section>\n          <div class=\"pop-scrim\" id=\"pop-scrim\" hidden></div>\n        </div>\n        <div class=\"acct\">\n          <button class=\"acct__btn\" id=\"acct-btn\" type=\"button\" aria-expanded=\"false\" aria-haspopup=\"menu\" aria-controls=\"acct-menu\"><span class=\"av\" id=\"ini2\" aria-hidden=\"true\">A</span><span class=\"acct__name\" id=\"bn2\"></span><svg class=\"ic acct__chev\" aria-hidden=\"true\"><use href=\"#chev\"/></svg><span class=\"sr\">Menú de la cuenta</span></button>\n          <div class=\"acct__menu\" id=\"acct-menu\" role=\"menu\" hidden>\n            <div class=\"acct__head\"><span class=\"av\" id=\"ini\">A</span><div><b id=\"bn\">Bodega</b><small id=\"bl\"></small></div></div>\n            <a role=\"menuitem\" href=\"perfil.html\" data-k=\"perfil\"><svg class=\"ic\" aria-hidden=\"true\"><use href=\"#user\"/></svg>Mi perfil</a>\n            <button role=\"menuitem\" id=\"reset\" type=\"button\"><svg class=\"ic\" aria-hidden=\"true\"><use href=\"#shield\"/></svg>Restablecer datos de la demo</button>\n            <button role=\"menuitem\" id=\"reset-global\" type=\"button\"><svg class=\"ic\" aria-hidden=\"true\"><use href=\"#shield\"/></svg>Restablecer toda la demo</button>\n            <a role=\"menuitem\" href=\"../login.html\" data-k=\"salir\"><svg class=\"ic\" aria-hidden=\"true\"><use href=\"#x\"/></svg>Cerrar sesión</a>\n          </div>\n        </div>\n      </div>\n    </header>\n\n";
    $('buyer-modals').outerHTML = "<nav class=\"bot\" id=\"bot\" aria-label=\"Navegación móvil\"></nav>\n\n<div class=\"toast\" id=\"toast\" role=\"status\" aria-live=\"polite\"></div>\n\n";
    if (page === 'necesidades') { document.querySelector('.hello h1').textContent = 'Mis necesidades'; $('sub').textContent = 'Consulta tus productos y sus datos demostrativos.'; }
    // Migas: cada página de nivel 2 declara data-parent y muestra «← Sección» sobre su título.
    var parent = MENU.find(function (m) { return m[0] === parentKey; });
    if (parent) document.querySelector('.hello').insertAdjacentHTML('afterbegin', '<a class="nx-crumb" id="crumb" href="' + routeHref(parent[0]) + '">' + ic('back') + esc(parent[1]) + '</a>');
    // Nueva necesidad: siempre lleva a la página de registro.
    $('new-need').href = buyerHref('necesidad-nueva.html');
    // Modo demo: una sola etiqueta global; al tocarla muestra una línea de aclaración.
    $('demo-badge').addEventListener('click', function () { var open = $('demo-tip').hidden; $('demo-tip').hidden = !open; this.setAttribute('aria-expanded', String(open)); });
    if ($('buyer-entry')) $('buyer-entry').outerHTML = "    <form class=\"ask\" id=\"ask\" novalidate>\n      <label for=\"tx\"><strong>¿Qué necesitas comprar?</strong> Escríbelo como lo dirías, nosotros lo ordenamos.</label>\n      <span class=\"note\" aria-hidden=\"true\">Tu negocio, no estás solo</span>\n      <div class=\"arow\">\n        <textarea id=\"tx\" rows=\"2\" placeholder=\"Ej: necesito 12 botellas de aceite y 8 bolsas de detergente para esta semana\"></textarea>\n        <button class=\"btn p\" type=\"submit\">Ordenar mi pedido <svg class=\"ic\" width=\"18\" height=\"18\"><use href=\"#arr\"/></svg></button>\n      </div>\n      <p class=\"err\" id=\"err\" role=\"alert\" hidden>Escribe al menos un producto para continuar.</p>\n      <div class=\"ex\" id=\"ex\"></div>\n    </form>\n\n";
    document.body.insertAdjacentHTML('beforeend', '<dialog id="demo-confirm" aria-labelledby="demo-confirm-title"><div class="mh"><h2 id="demo-confirm-title">Confirmar escenario demo</h2></div><div class="mb"><p id="demo-confirm-text"></p></div><div class="mf"><button class="btn o" id="demo-confirm-cancel" type="button">Cancelar</button><button class="btn p" id="demo-confirm-accept" type="button">Confirmar</button></div></dialog>');
    document.getElementById('demo-confirm-cancel').addEventListener('click', function () { document.getElementById('demo-confirm').close('cancel'); });
    document.getElementById('demo-confirm-accept').addEventListener('click', function () { document.getElementById('demo-confirm').close('accept'); });
    if (page === 'oportunidades') { document.querySelector('.hello h1').textContent = 'Compras en grupo'; $('sub').textContent = 'Negocios cerca de ti que compran juntos para pagar menos.'; }
    if (page === 'detalle-oportunidad') { document.querySelector('.hello h1').textContent = 'Compra en grupo'; $('sub').textContent = 'Consulta condiciones y ahorro potencial; sin compromiso de compra.'; }
    if (page === 'seguimiento') { document.querySelector('.hello h1').textContent = 'Seguimiento'; $('sub').textContent = 'Consulta tus confirmaciones y retiradas demostrativas.'; }
    if (page === 'perfil') { document.querySelector('.hello h1').textContent = 'Mi perfil'; $('sub').textContent = 'La información de tu negocio, siempre a mano.'; }
    if (page === 'mensajes') { document.querySelector('.hello h1').textContent = 'Mensajes'; $('sub').textContent = 'Habla con los proveedores de tus compras en grupo.'; }
    if (page === 'catalogo') { document.querySelector('.hello h1').textContent = 'Catálogo'; $('sub').textContent = 'Encuentra lo que necesita tu negocio.'; }
    renderNav(); identity();
    document.querySelectorAll('a[data-k="inicio"]').forEach(function (a) { a.href = routeHref('inicio'); });
    document.addEventListener('click', versionLink, true);
    document.addEventListener('click', navigateMenu);
    $('burger').addEventListener('click', function () { drawer(true); });
    $('sclose').addEventListener('click', function () { drawer(false); });
    $('scrim').addEventListener('click', function () { drawer(false); });
    $('bell').addEventListener('click', function () { pop($('pop').hidden); });
    $('pclose').addEventListener('click', function () { pop(false); });
    $('readall').addEventListener('click', function () { if (!store.markNotificationsRead()) { toast(store.error() || 'No se pudo guardar la lectura de las notificaciones. Inténtalo de nuevo.'); return; } renderNotifs(); $('pclose').focus(); toast('Notificaciones marcadas como leídas.'); });
    $('nl').addEventListener('click', function (e) { var b = e.target.closest('[data-read]'); if (b) { e.stopPropagation(); if (!store.markNotificationsRead(+b.dataset.read)) { toast(store.error() || 'No se pudo guardar la lectura de la notificación. Inténtalo de nuevo.'); return; } renderNotifs(); var next = $('nl').querySelector('[data-read]'); (next || $('pclose')).focus(); } });
    $('readall').addEventListener('click', function () { writeAlerts(buildAlerts().map(function (a) { return a.id; })); renderNotifs(); });
    $('nl').addEventListener('click', function (e) { var a = e.target.closest ? e.target.closest('[data-alert]') : null; if (!a) return; var list = readAlerts(); if (list.indexOf(a.dataset.alert) === -1) { list.push(a.dataset.alert); writeAlerts(list); } });
    if ($('pop-scrim')) $('pop-scrim').addEventListener('click', function () { pop(false); });
    if ($('toast').addEventListener) $('toast').addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('.toast__action'); if (!b || !toastAction) return; var act = toastAction; toastAction = null; $('toast').classList.remove('on'); clearTimeout(tt); act.onClick(); });
    var helpLink = document.querySelector('.side-help'); if (helpLink) helpLink.addEventListener('click', function (e) { e.preventDefault(); drawer(false); showWelcome(); });
    window.addEventListener('nexora-demo-change', function (e) { if (e.detail && e.detail.reason === 'reset') { clearWelcome(); if (page === 'inicio') showWelcome(); } });
    if (page === 'inicio' && !welcomeSeen()) showWelcome();
    function acct(open) { $('acct-menu').hidden = !open; $('acct-btn').setAttribute('aria-expanded', String(open)); }
    $('acct-btn').addEventListener('click', function () { acct($('acct-menu').hidden); });
    document.addEventListener('click', function (e) { if (!$('acct-menu').hidden && (!e.target.closest('.acct') || e.target.closest('[role="menuitem"]'))) acct(false); });
    $('reset').addEventListener('click', async function () { if (!await confirmDemo(resetWarning(false))) return; if (!store.reset(false)) { toast(store.error()); return; } if ($('tx')) $('tx').value = ''; if ($('needs-search')) $('needs-search').value = ''; if ($('needs-status')) $('needs-status').value = ''; drawer(false); toast('Datos del escenario comprador restablecidos.'); });
    if ($('reset-global')) $('reset-global').addEventListener('click', async function () { if (!await confirmDemo('Esto borra los datos de todos los perfiles y cuentas creadas. Todas las pestañas vuelven al acceso.')) return; var problema = window.NexoraShared.restablecerYSalir(); if (problema) toast(problema); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Tab' && !$('pop').hidden) {
        var controls = Array.from($('pop').querySelectorAll('button')).filter(function (b) { return !b.hidden; });
        if (e.shiftKey && document.activeElement === controls[0]) { e.preventDefault(); controls[controls.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === controls[controls.length - 1]) { e.preventDefault(); controls[0].focus(); }
      }
      if (e.key === 'Escape') { if (!$('acct-menu').hidden) { acct(false); $('acct-btn').focus(); } else if (!$('pop').hidden) pop(false); else if ($('side').classList.contains('open')) drawer(false); }
    });
    var appEl = document.querySelector('.app'); if (appEl) appEl.classList.add('menu-init');
    setMenuMode(desiredMode()); setTimeout(function () { if (appEl) appEl.classList.remove('menu-init'); }, 60);
    $('side-toggle').addEventListener('click', function () { var next = menuMode === 'expanded' ? 'compact' : 'expanded'; saveMode(next); setMenuMode(next); });
    $('side-hide').addEventListener('click', function () { saveMode('hidden'); setMenuMode('hidden'); $('burger').focus(); });
    document.addEventListener('keydown', trapDrawerFocus);
    window.addEventListener('resize', function () { var next = desiredMode(), narrow = String(window.innerWidth < 900); var app = document.querySelector('.app'); if (next !== menuMode || (app && app.getAttribute('data-narrow') !== narrow)) setMenuMode(next); });
    window.addEventListener('nexora-demo-change', identity);
    if (store.error()) toast(store.error());
  }
  window.NexoraUI = { plain: plain, resetWarning: resetWarning, buyerHref: buyerHref, avatar: avatar, esc: esc, ic: ic, money: money, toast: toast, renderIdentity: identity, media: media, bindImages: bindImages, confirm: confirmDemo };
  if (window.NexoraDemo.requireSession()) mount();
})();
