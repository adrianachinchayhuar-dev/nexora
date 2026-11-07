(function () {
  'use strict';
  var revision = new URL(document.currentScript.src).searchParams.get('v');
  var esc = window.NexoraUtils.esc;
  function href(path) { var url = new URL(path, location.href); if (revision) url.searchParams.set('revision', revision); return url.href; }
  var logoCount = 0;
  function logo() { var gradientId = 'admin-logo-gradient-' + (++logoCount); return '<span class="brand"><svg width="36" height="36" viewBox="0 0 48 48" aria-hidden="true"><defs><linearGradient id="' + gradientId + '" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#EE7A3C"/><stop offset=".5" stop-color="#C0408A"/><stop offset="1" stop-color="#5B2BA0"/></linearGradient></defs><path d="M8 42V8h8l16 20V8h8v34h-8L16 22v20z" fill="url(#' + gradientId + ')" stroke="url(#' + gradientId + ')" stroke-width="3" stroke-linejoin="round"/></svg><b>NEXORA</b></span>'; }
  function icon(name) {
    var paths = { cross:'<circle cx="12" cy="12" r="9"/><path d="m8 8 8 8M16 8l-8 8"/>', store:'<path d="M3 10h18l-2-7H5zM4 10v11h16V10M9 21v-7h6v7M3 10c0 4 5 4 5 0 0 4 8 4 8 0 0 4 5 4 5 0"/>', truck:'<path d="M2 4h13v14H2zM15 9h4l3 5v4h-7"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="19" r="2"/>', cart:'<path d="M2 3h3l3 13h11l3-10H6"/><circle cx="9" cy="21" r="1"/><circle cx="18" cy="21" r="1"/>', pin:'<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0z"/><circle cx="12" cy="10" r="2"/>', tag:'<path d="M3 3h8l10 10-8 8L3 11z"/><circle cx="7" cy="7" r="1"/>', calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 2v6M17 2v6M3 11h18M7 15h3M14 15h3"/>', info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7v1"/>', home:'<path d="m3 10 9-7 9 7v10H3zM9 20v-7h6v7"/>', users:'<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6M18 15a5 5 0 0 1 3 5"/>', groups:'<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>', activity:'<path d="M3 12h4l3-8 4 16 3-8h4"/>', check:'<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>', closed:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>' };
    return '<svg class="admin-icon" viewBox="0 0 24 24" aria-hidden="true">' + (paths[name] || paths.groups) + '</svg>';
  }
  function mount(identity) {
    var activityPage = /\/actividad\.html$/.test(location.pathname || new URL(location.href).pathname);
    var groupsPage = /\/(agrupaciones|detalle-oportunidad)\.html$/.test(location.pathname || new URL(location.href).pathname);
    var usersPage = /\/usuarios\.html$/.test(location.pathname || new URL(location.href).pathname);
    document.getElementById('admin-sidebar').innerHTML = '<aside class="side" id="admin-side" aria-label="Menú administrativo"><div class="sh"><a href="' + href('dashboard.html') + '" aria-label="NEXORA, inicio administrativo">' + logo() + '</a><button class="icbtn admin-close" id="admin-close" aria-label="Cerrar menú">×</button></div><span class="admin-role">Panel administrativo</span><nav class="nav" aria-label="Principal administrativo"><a' + (!usersPage && !groupsPage && !activityPage ? ' class="on" aria-current="page"' : '') + ' href="' + href('dashboard.html') + '">' + icon('home') + '<span>Dashboard</span></a><a' + (usersPage ? ' class="on" aria-current="page"' : '') + ' href="' + href('usuarios.html') + '">' + icon('users') + '<span>Usuarios</span></a><a' + (groupsPage ? ' class="on" aria-current="page"' : '') + ' href="' + href('agrupaciones.html') + '">' + icon('groups') + '<span>Agrupaciones</span></a><a' + (activityPage ? ' class="on" aria-current="page"' : '') + ' href="' + href('actividad.html') + '">' + icon('activity') + '<span>Actividad</span></a></nav><img class="admin-sidebar-art" src="../../assets/images/sidebar-admin.png" alt="" width="1254" height="1254"><div class="biz"><span class="admin-avatar">AN</span><div><b>' + esc(identity.name) + '</b><small>' + esc(identity.id) + '</small></div><button class="link" id="admin-reset-global">Restablecer toda la demo</button><button class="link" id="admin-logout">Cerrar sesión</button></div></aside><div class="scrim" id="admin-scrim" hidden></div>';
    document.getElementById('admin-header').innerHTML = '<header class="top admin-top"><div class="mob"><button class="icbtn" id="admin-open" aria-label="Abrir menú administrativo" aria-expanded="false" aria-controls="admin-side">☰</button>' + logo() + '</div><div><h1>' + (usersPage ? 'Usuarios y aprobaciones' : groupsPage ? 'Agrupaciones y oportunidades' : activityPage ? 'Actividad administrativa' : 'Supervisión administrativa') + '</h1><p>' + (usersPage ? 'Aprueba proveedores y suspende cuentas.' : 'Una vista del escenario demostrativo existente.') + '</p></div><span class="chip">' + (usersPage ? 'Decisiones' : groupsPage ? 'Solo consulta · A3' : activityPage ? 'Solo consulta · A4' : 'Solo consulta · A1') + '</span></header><p id="admin-session-error" role="alert" hidden></p>';
    if (!usersPage && !groupsPage && !activityPage) {
      document.getElementById('admin-header').innerHTML = '<div class="admin-mobile-bar"><button class="icbtn" id="admin-open" aria-label="Abrir menú administrativo" aria-expanded="false" aria-controls="admin-side">☰</button>' + logo() + '</div><header class="admin-hero"><img src="../../assets/images/header-dashboard-admin.png" alt="" width="2089" height="753"><div class="admin-hero-copy"><span class="admin-hero-eyebrow">PANEL ADMINISTRATIVO</span><h1>Supervisión administrativa</h1><p>Una vista de compradores, proveedores y compras en grupo.</p></div></header><p id="admin-session-error" role="alert" hidden></p>';
    }
    if (usersPage) {
      document.getElementById('admin-header').innerHTML = '<div class="admin-mobile-bar"><button class="icbtn" id="admin-open" aria-label="Abrir menú administrativo" aria-expanded="false" aria-controls="admin-side">☰</button>' + logo() + '</div><header class="admin-hero"><img src="../../assets/images/header-usuarios-admin.png" alt="" width="2089" height="753"><div class="admin-hero-copy"><span class="admin-hero-eyebrow">PANEL ADMINISTRATIVO</span><h1>Usuarios y aprobaciones</h1><p>Consulta perfiles y revisa las solicitudes de demostración.</p></div></header><p id="admin-session-error" role="alert" hidden></p>';
    }
    if (/\/agrupaciones\.html$/.test(location.pathname || new URL(location.href).pathname)) {
      document.getElementById('admin-header').innerHTML = '<div class="admin-mobile-bar"><button class="icbtn" id="admin-open" aria-label="Abrir menú administrativo" aria-expanded="false" aria-controls="admin-side">☰</button>' + logo() + '</div><header class="admin-hero"><img src="../../assets/images/header-agrupaciones-admin.png" alt="" width="2089" height="753"><div class="admin-hero-copy"><span class="admin-hero-eyebrow">PANEL ADMINISTRATIVO</span><h1>Agrupaciones y oportunidades</h1><p>Supervisa las compras colaborativas y sus participaciones.</p></div></header><p id="admin-session-error" role="alert" hidden></p>';
    }
    if (/\/detalle-oportunidad\.html$/.test(location.pathname || new URL(location.href).pathname)) {
      document.getElementById('admin-header').innerHTML = '<div class="admin-mobile-bar"><button class="icbtn" id="admin-open" aria-label="Abrir menú administrativo" aria-expanded="false" aria-controls="admin-side">☰</button>' + logo() + '</div><header class="admin-hero"><img src="../../assets/images/header-detalle-admin.png" alt="" width="2089" height="753"><div class="admin-hero-copy"><span class="admin-hero-eyebrow">Panel administrativo</span><h1>Detalle de agrupación</h1><p>Consulta el estado y los registros de una compra colaborativa.</p></div></header><p id="admin-session-error" role="alert" hidden></p>';
    }
    if (activityPage) {
      document.getElementById('admin-header').innerHTML = '<div class="admin-mobile-bar"><button class="icbtn" id="admin-open" aria-label="Abrir menú administrativo" aria-expanded="false" aria-controls="admin-side">☰</button>' + logo() + '</div><header class="admin-hero"><img src="../../assets/images/header-actividad-admin.png" alt="" width="2089" height="753"><div class="admin-hero-copy"><span class="admin-hero-eyebrow">Panel administrativo</span><h1>Actividad administrativa</h1><p>Consulta el historial de decisiones y acciones administrativas del escenario.</p></div></header><p id="admin-session-error" role="alert" hidden></p>';
    }
    var side = document.getElementById('admin-side'), open = document.getElementById('admin-open'), scrim = document.getElementById('admin-scrim');
    function drawer(show) { side.classList.toggle('open', show); scrim.hidden = !show; open.setAttribute('aria-expanded', String(show)); if (show) side.querySelector('nav a').focus(); else if (side.contains(document.activeElement)) open.focus(); }
    open.addEventListener('click', function () { drawer(true); }); document.getElementById('admin-close').addEventListener('click', function () { drawer(false); }); scrim.addEventListener('click', function () { drawer(false); });
    document.addEventListener('keydown', function (e) { if (!side.classList.contains('open')) return; if (e.key === 'Escape') drawer(false); if (e.key === 'Tab') { var list = Array.from(side.querySelectorAll('a[href],button')), first = list[0], last = list[list.length - 1]; if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } } });
    window.addEventListener('resize', function () { if (window.innerWidth > 1024) drawer(false); });
    document.getElementById('admin-reset-global').addEventListener('click', function () { if (!window.confirm('¿Restablecer toda la demo? Se borran los datos de todos los perfiles y cuentas creadas.')) return; var problema = window.NexoraShared.restablecerYSalir(); if (problema) window.alert(problema); });
    document.getElementById('admin-logout').addEventListener('click', function () { var message = window.NexoraAdminSession.logout(); if (message) { var error = document.getElementById('admin-session-error'); error.hidden = false; error.textContent = message; } });
  }
  // Campana: avisa de los proveedores por aprobar y se actualiza sola cuando cambia algo en otra pestaña.
  function campana() {
    var fila = typeof document.querySelector === 'function' && document.querySelector('#admin-side .sh'); if (!fila || !window.NexoraAdminStore || document.getElementById('admin-bell')) return;
    fila.insertAdjacentHTML('beforeend', '<div class="admin-bell"><button class="admin-bell__btn" id="admin-bell" type="button" aria-label="Notificaciones" aria-expanded="false" aria-controls="admin-bell-pop"><svg class="admin-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 17V11a6 6 0 0 1 12 0v6l2 2H4zM10 21a2 2 0 0 0 4 0"/></svg><span class="admin-bell__n" id="admin-bell-n" hidden></span></button><div class="admin-bell__pop" id="admin-bell-pop" role="dialog" aria-label="Notificaciones" hidden></div></div>');
    var boton = document.getElementById('admin-bell'), caja = document.getElementById('admin-bell-pop'), cuenta = document.getElementById('admin-bell-n');
    function pintar() {
      var n = window.NexoraAdminStore.pendientes();
      cuenta.hidden = !n; cuenta.textContent = n;
      boton.setAttribute('aria-label', n ? 'Notificaciones: ' + n + (n === 1 ? ' proveedor por aprobar' : ' proveedores por aprobar') : 'Notificaciones');
      caja.innerHTML = n ? '<a class="admin-bell__item" href="' + esc(href('usuarios.html')) + '"><strong>' + n + (n === 1 ? ' proveedor por aprobar' : ' proveedores por aprobar') + '</strong><span>Revisa sus datos en Usuarios.</span></a>' : '<p class="admin-bell__empty">Estás al día. No hay proveedores por aprobar.</p>';
    }
    function abrir(si) { caja.hidden = !si; boton.setAttribute('aria-expanded', String(si)); }
    boton.addEventListener('click', function () { abrir(caja.hidden); });
    document.addEventListener('click', function (e) { if (!caja.hidden && !e.target.closest('.admin-bell')) abrir(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !caja.hidden) { abrir(false); boton.focus(); } });
    window.addEventListener('nexora-demo-change', pintar);
    pintar();
  }
  // «4 negocios: Bodega Rosita y 3 más»
  function negocios(o) {
    var n = o.negocios, nombres = o.nombres || [], base = n + (n === 1 ? ' negocio' : ' negocios');
    if (!nombres.length) return { cifra: base, resto: '' };
    var resto = n - 1;
    return { cifra: base + ':', resto: resto <= 0 ? nombres[0] : resto === 1 && nombres[1] ? nombres[0] + ' y ' + nombres[1] : nombres[0] + ' y ' + resto + ' más' };
  }
  window.NexoraAdminUI = { negocios: negocios, esc: esc, href: href, logo: logo, icon: icon, mount: function (identity) { mount(identity); campana(); } };
})();
