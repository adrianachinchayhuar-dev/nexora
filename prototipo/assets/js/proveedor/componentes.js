(function () {
  'use strict';
  var script = document.currentScript, revision = new URL(script.src).searchParams.get('v');
  var page = document.body.dataset.page, active = page === 'detalle' ? 'oportunidades' : page;
  var routes = { inicio: 'dashboard.html', oportunidades: 'oportunidades.html', productos: 'productos-ofertas.html', mensajes: 'mensajes.html', perfil: 'perfil.html' };
  var symbols = {
    home: '<path d="M3 11l9-8 9 8M5 10v10h14V10"/>',
    spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/>',
    box: '<path d="M4 8l8-4 8 4v8l-8 4-8-4zM4 8l8 4 8-4M12 12v8"/>',
    chat: '<path d="M4 5h16v11H9l-5 4z"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    drop: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
    cup: '<path d="M6 4h12l-1.5 16h-9zM7 9h10"/>',
    bell: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4zM10 21h4"/>',
    chev: '<path d="M6 9l6 6 6-6"/>',
    panel: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M9 4v16"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    check: '<path d="M5 12l5 5 9-10"/>'
  };
  var esc = function (value) { return window.NexoraUtils.esc(String(value == null ? '' : value).replace(/\s*\(demo\)/gi, '').trim()); };
  function date(value) { var m = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? Number(m[3]) + ' ' + ['ene.','feb.','mar.','abr.','may.','jun.','jul.','ago.','sep.','oct.','nov.','dic.'][Number(m[2])-1] : value; }
  function next(steps) { return '<section class="nx-card provider-next"><h2 class="nx-h3">¿Qué pasa ahora?</h2><ol class="nx-steps">' + steps.map(function (text, i) { return '<li' + (i === 0 ? ' class="is-current" aria-current="step"' : '') + '><span class="nx-steps__dot">' + (i+1) + '</span>' + esc(text) + '</li>'; }).join('') + '</ol></section>'; }
  symbols.plus = '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>'; symbols.minus = '<circle cx="12" cy="12" r="9"/><path d="M8 12h8"/>';
  function icon(name) { return '<svg class="ic" aria-hidden="true" viewBox="0 0 24 24">' + (symbols[name] || symbols.box) + '</svg>'; }
  // Logo nuevo: ícono + palabra en texto. Solo ícono en la barra superior móvil y en la barra compacta.
  function logo(iconOnly) { return '<span class="brand' + (iconOnly ? ' brand--icon' : '') + '"><img src="../../assets/images/icono-nexora-64.png" width="' + (iconOnly ? 32 : 36) + '" height="' + (iconOnly ? 32 : 36) + '" alt="">' + (iconOnly ? '' : '<b>NEXORA</b>') + '</span>'; }
  function href(relative) { var u = new URL(relative, location.href); if (revision) u.searchParams.set('revision', revision); return u.href; }
  function money(value) { return new Intl.NumberFormat('es-PE', { style:'currency', currency:'PEN' }).format(value); }
  function media(o) { return '<span class="provider-media">' + icon(o.product.icon) + '</span>'; }
  function stateLabel(o) { return o.estado ? o.estado.texto : o.status === 'abierta' ? 'Abierta' : 'Cerrada'; }
  function avance(o) { return o.total + ' ' + o.unit + (Number.isFinite(o.minimo) ? ' de ' + o.minimo + ' mínimo' : ''); }
  function card(o) {
    return '<article class="provider-card nx-card"><div class="provider-card-top">' + media(o) + '<span class="nx-status' + (o.status === 'cerrada' ? ' nx-status--cerrada' : '') + '">' + stateLabel(o) + '</span></div><h3 class="nx-h3">' + esc(o.product.name) + '</h3><p>' + esc(o.presentation) + '</p><p class="provider-secondary">' + esc(o.zone) + '</p><div class="provider-card-price"><strong class="nx-figure">' + esc(money(o.precioActual)) + '</strong><span>Precio en grupo por ' + esc(o.unit) + '</span></div><p>' + esc(avance(o)) + ' · ' + esc(o.negocios) + ' negocios</p><p>Cierra el ' + esc(date(o.closeDate)) + '</p><p>Entregas ' + esc(window.NexoraFechas.rango(o)) + '</p><a class="nx-btn nx-btn--primary" href="' + esc(href('detalle-oportunidad.html?id=' + encodeURIComponent(o.id))) + '">Ver compra en grupo</a></article>';
  }
  function error(container, message) {
    container.innerHTML = '<section class="provider-panel provider-empty"><h2>No se pudo consultar el escenario</h2><p role="alert">' + esc(message) + '</p><div class="provider-actions"><button type="button" class="btn p" data-provider-reload>Volver a consultar</button><a class="btn o" href="acceso.html">Volver al acceso</a></div><p class="provider-secondary">No se alteró el escenario. Las pestañas independientes no se sincronizan automáticamente.</p></section>';
  }
  var titles = { mensajes: ['Mensajes','Consulta las conversaciones de tus compras en grupo.'], perfil: ['Tu perfil','Revisa y guarda los datos de tu negocio.'], productos: ['Mi catálogo','Organiza tus productos, precios y zonas de atención.'], inicio: ['Tu negocio','Revisa tus compras en grupo.'], oportunidades: ['Compras en grupo','Encuentra los productos que puedes ofrecer.'], detalle: ['Tu compra en grupo','Revisa el precio y los negocios que se unieron.'] };
  function mount(providerId) {
    var provider = window.NexoraProviders.byId(providerId), info = titles[page];
    var profile = window.NexoraProviderState.profile(); if (profile.value) provider = { id: provider.id, name: profile.value.name, initials: profile.value.name.replace(/\s*\(demo\)/gi, '').trim().split(/\s+/).slice(0,2).map(function (word) { return word.charAt(0); }).join('').toUpperCase() };
    var menu = [['inicio','Inicio','home'],['oportunidades','Compras en grupo','spark'],['productos','Mi catálogo','box'],['mensajes','Mensajes','chat'],['perfil','Perfil','user']];
    document.getElementById('provider-sidebar').outerHTML = '<aside class="side" id="provider-side" aria-label="Menú del proveedor"><div class="sh"><a href="' + href('dashboard.html') + '" aria-label="NEXORA, ir al inicio">' + logo() + '</a><div class="sh__tools"><button type="button" class="icbtn" id="side-toggle" aria-label="Contraer menú" aria-expanded="true">' + icon('panel') + '</button><button type="button" class="icbtn" id="side-hide" aria-label="Ocultar menú">' + icon('x') + '</button><button type="button" class="icbtn" id="provider-close" aria-label="Cerrar menú">' + icon('x') + '</button></div></div><span class="provider-role">PROVEEDOR</span><nav class="nav" id="provider-nav" aria-label="Principal del proveedor">' + menu.map(function (m) { return routes[m[0]] ? '<a data-provider-nav="' + m[0] + '" data-tip="' + m[1] + '" href="' + href(routes[m[0]]) + '"' + (active === m[0] ? ' class="on" aria-current="page"' : '') + '>' + icon(m[2]) + '<span>' + m[1] + '</span></a>' : '<span class="provider-nav-pending" aria-disabled="true">' + icon(m[2]) + '<span>' + m[1] + '<small>Pendiente</small></span></span>'; }).join('') + '</nav></aside><div class="scrim" id="provider-scrim" hidden></div><nav class="bot" id="provider-bot" aria-label="Navegación móvil">' + [['inicio','Inicio','home'],['oportunidades','En grupo','spark'],['productos','Catálogo','box'],['mensajes','Mensajes','chat'],['perfil','Perfil','user']].map(function (m) { return '<a href="' + href(routes[m[0]]) + '"' + (active === m[0] ? ' class="on"' : '') + '>' + icon(m[2]) + '<span>' + m[1] + '</span></a>'; }).join('') + '</nav><div class="toast" id="provider-toast" role="status" aria-live="polite"></div>';
    document.getElementById('provider-header').outerHTML = '<header class="top provider-top"><div class="mob"><button class="icbtn" id="provider-open" aria-label="Abrir menú proveedor" aria-controls="provider-side" aria-expanded="false">' + icon('menu') + '</button><a href="' + href('dashboard.html') + '" aria-label="NEXORA, ir al inicio">' + logo(true) + '</a></div><div class="hello"><h1>' + info[0] + '</h1><p>' + info[1] + '</p></div><div class="provider-tools"><div class="nx-demo"><button class="nx-demo__badge" id="provider-demo" type="button" aria-expanded="false" aria-controls="provider-demo-tip">Modo demo</button><p class="nx-demo__tip" id="provider-demo-tip" hidden>Datos de prueba. Nada es una compra real.</p></div><div class="bw"><button class="icbtn" id="provider-bell" type="button" aria-label="Ver notificaciones" aria-haspopup="dialog" aria-expanded="false" aria-controls="provider-pop">' + icon('bell') + '<span class="badge" id="provider-badge" hidden>0</span></button><section class="pop" id="provider-pop" role="dialog" aria-label="Notificaciones" hidden><div class="ph"><h2>Notificaciones</h2><div><button class="link" id="provider-readall" type="button">Marcar todas como leídas</button><button class="icbtn" id="provider-pclose" type="button" aria-label="Cerrar notificaciones">' + icon('x') + '</button></div></div><ul class="nl" id="provider-nl"></ul></section><div class="pop-scrim" id="provider-pop-scrim" hidden></div></div><div class="acct"><button class="acct__btn" id="provider-acct-btn" type="button" aria-expanded="false" aria-haspopup="menu" aria-controls="provider-acct-menu"><span class="av" aria-hidden="true">' + provider.initials + '</span><span class="acct__name">' + esc(provider.name) + '</span>' + icon('chev') + '<span class="sr">Menú de la cuenta</span></button><div class="acct__menu" id="provider-acct-menu" role="menu" hidden><div class="acct__head"><span class="av">' + provider.initials + '</span><div><b>' + esc(provider.name) + '</b><small>Tu negocio</small></div></div><a role="menuitem" href="' + href('perfil.html') + '">' + icon('user') + 'Mi perfil</a><button role="menuitem" id="provider-reset-global" type="button">' + icon('x') + 'Restablecer toda la demo</button><button role="menuitem" id="provider-logout" type="button">' + icon('x') + 'Cerrar sesión</button></div></div></div></header><p id="provider-session-error" role="alert" hidden></p>';
    document.getElementById('provider-demo').addEventListener('click', function () { var tip = document.getElementById('provider-demo-tip'); tip.hidden = !tip.hidden; document.getElementById('provider-demo').setAttribute('aria-expanded', String(!tip.hidden)); });
    var side = document.getElementById('provider-side'), opener = document.getElementById('provider-open'), scrim = document.getElementById('provider-scrim');
    function drawer(open) { side.classList.toggle('open', open); scrim.hidden = !open; opener.setAttribute('aria-expanded', open); if (open) side.querySelector('nav a').focus(); else if (side.contains(document.activeElement)) opener.focus(); }
    opener.addEventListener('click', function () { drawer(true); }); document.getElementById('provider-close').addEventListener('click', function () { drawer(false); }); scrim.addEventListener('click', function () { drawer(false); });
    document.addEventListener('keydown', function (e) {
      if (!side.classList.contains('open')) return;
      if (e.key === 'Escape') { drawer(false); return; }
      if (e.key === 'Tab') { var controls = Array.from(side.querySelectorAll('a[href],button')), first = controls[0], last = controls[controls.length - 1]; if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } }
    });
    window.addEventListener('resize', function () { if (window.innerWidth > 1024) drawer(false); });
    if (window.NexoraProviderShell) window.NexoraProviderShell.init({ drawer: drawer, providerId: providerId, name: provider.name });
    document.getElementById('provider-reset-global').addEventListener('click', function () { if (!window.confirm('¿Restablecer toda la demo? Se borran los datos de todos los perfiles y cuentas creadas.')) return; var problema = window.NexoraShared.restablecerYSalir(); if (problema) toast(problema); });
    document.getElementById('provider-logout').addEventListener('click', function () { var message = window.NexoraProviderSession.logout(); if (message) { var field = document.getElementById('provider-session-error'); field.hidden = false; field.textContent = message; } });
  }
  function start(render, opciones) {
    var root = document.getElementById('provider-content');
    try {
      var id = window.NexoraProviderSession.requireSession(); if (!id) return;
      mount(id);
      try { if (sessionStorage.getItem(window.NexoraProviderSession.aviso) === 'aprobada') { sessionStorage.removeItem(window.NexoraProviderSession.aviso); toast('¡Tu cuenta fue aprobada!'); } } catch (aviso) { /* sin aviso */ }
      function refresh() { try { var current = window.NexoraProviderSession.requireSession(); if (!current) return; if (current !== id) { location.reload(); return; } render(window.NexoraScenarioRead.read(id), id); } catch (errorValue) { error(root, 'No se pudo iniciar esta pantalla. Recarga para obtener los archivos compatibles.'); console.error('NEXORA proveedor P1:', errorValue); } }
      refresh(); window.addEventListener('pageshow', function (e) { if (e.persisted) refresh(); });
      if (!(opciones && opciones.sinSync)) window.addEventListener('nexora-demo-change', refresh);
    } catch (errorValue) { error(root, 'No se pudo iniciar esta pantalla. Recarga para obtener los archivos compatibles.'); console.error('NEXORA proveedor P1:', errorValue); }
  }
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-provider-reload]')) { location.reload(); return; }
    var link = e.target.closest('a[href]'); if (!link) return;
    var u = new URL(link.href, location.href), folder = new URL('.', location.href);
    if (u.origin === folder.origin && u.pathname.startsWith(folder.pathname) && ['acceso.html','dashboard.html','oportunidades.html','detalle-oportunidad.html','productos-ofertas.html','mensajes.html','perfil.html'].indexOf(u.pathname.split('/').pop()) !== -1) link.href = href(link.href);
  }, true);
  function toast(message, options) { if (window.NexoraProviderShell) window.NexoraProviderShell.toast(message, options); }
  window.NexoraProviderUI = { toast:toast, esc:esc, date:date, next:next, icon:icon, logo:logo, href:href, money:money, card:card, media:media, stateLabel:stateLabel, avance:avance, error:error, mount:mount, start:start };
})();
