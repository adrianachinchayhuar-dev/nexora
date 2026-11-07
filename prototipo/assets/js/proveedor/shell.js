/* Comportamiento del marco del proveedor: barra lateral en 3 modos, menú de cuenta, avisos y toasts.
   Solo lee el escenario; lo único que guarda es el modo del menú y los avisos leídos (claves del proveedor). */
(function () {
  'use strict';
  var MENU_KEY = 'nexora.proveedor.menu', READ_KEY = 'nexora.proveedor.avisosLeidos.v1', mode = null, timer, ctx = null;
  function $(id) { return document.getElementById(id); }
  function esc(v) { return window.NexoraUtils.esc(String(v == null ? '' : v)); }

  function toast(message, options) {
    var t = $('provider-toast'); if (!t) return;
    t.textContent = message; t.classList.add('on'); clearTimeout(timer);
    timer = setTimeout(function () { t.classList.remove('on'); }, (options && options.duration) || 4000);
  }

  function saved() { try { var v = localStorage.getItem(MENU_KEY); return v === 'expanded' || v === 'compact' || v === 'hidden' ? v : null; } catch (e) { return null; } }
  function save(v) { try { localStorage.setItem(MENU_KEY, v); } catch (e) { /* sin almacenamiento: se usa el modo por ancho */ } }
  function desired() { var w = window.innerWidth; return w < 900 ? 'hidden' : saved() || (w <= 1200 ? 'compact' : 'expanded'); }
  function setMode(next) {
    var app = document.querySelector('.app'), side = $('provider-side'); if (!app || !side) return;
    if (next !== 'hidden' && side.classList.contains('open')) ctx.drawer(false);
    mode = next; app.setAttribute('data-menu', next); app.setAttribute('data-narrow', String(window.innerWidth < 900));
    var open = next === 'expanded', t = $('side-toggle');
    t.setAttribute('aria-expanded', String(open)); t.setAttribute('aria-label', open ? 'Contraer menú' : 'Expandir menú');
  }

  /* Avisos calculados con datos que ya existen: compras abiertas que cierran en 2 días o menos. */
  function days(a, b) { return Math.round((new Date(a + 'T12:00:00Z') - new Date(b + 'T12:00:00Z')) / 86400000); }
  function readIds() { try { return JSON.parse(sessionStorage.getItem(READ_KEY) || '[]'); } catch (e) { return []; } }
  function hoyReal() { try { return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); } catch (e) { return new Date().toISOString().slice(0, 10); } }
  function diaLima(iso) { try { return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso)); } catch (e) { return ''; } }
  // Avisos en palabras de vendedor, con ícono por tipo, hora relativa y grupos «Hoy» y «Antes». Cada uno abre su compra.
  function alerts(providerId) {
    providerId = providerId || (ctx && ctx.providerId);
    var source = window.NexoraScenarioRead.read(providerId); if (!source.ok) return [];
    var F = window.NexoraFechas, ui = window.NexoraProviderUI, detalle = function (id) { return ui.href('detalle-oportunidad.html?id=' + encodeURIComponent(id)); };
    var history = window.NexoraScenarioRead.conversations(providerId), nombre = function (id) { var o = source.opportunities.find(function (x) { return x.id === id; }); return o ? o.product.name.toLowerCase() : 'tu venta'; };
    var messages = history.ok ? history.items.filter(function (c) { return c.messages.some(function (m) { return m.unread; }); }).map(function (c) {
      var ultimo = c.messages.filter(function (m) { return m.unread; }).pop();
      return { id: 'chat:' + c.id, chat: true, tipo: 'chat', href: ui.href('mensajes.html?conversacion=' + encodeURIComponent(c.id)), text: 'Un comprador te escribió sobre tu venta de ' + nombre(c.opportunityId), at: ultimo && ultimo.createdAt };
    }) : [];
    var avisos = window.NexoraScenarioRead.movimientos(providerId).map(function (m) {
      var cantidad = m.qty + ' ' + m.unit, producto = m.product.toLowerCase();
      return { id: m.id, tipo: m.tipo, href: detalle(m.opportunityId), at: m.at, text: m.tipo === 'union' ? 'Un negocio se unió a tu venta de ' + producto + ': +' + cantidad : 'Un negocio se retiró de tu venta de ' + producto + ': −' + cantidad };
    });
    var cierres = source.opportunities.filter(function (o) { return o.status === 'abierta' && days(o.closeDate, source.scenarioDate) <= 2 && o.estado && o.estado.clave !== 'no_se_concreto'; }).map(function (o) {
      var c = F.cierre(o, source.scenarioDate);
      return { id: 'cierre:' + o.id + ':' + o.closeDate, tipo: 'cierre', href: detalle(o.id), at: null, text: 'Tu venta en grupo de ' + o.product.name.toLowerCase() + ' cierra ' + c.cuando };
    });
    var hoy = hoyReal();
    return messages.concat(avisos, cierres).map(function (a) {
      a.cuando = a.at ? F.relativo(a.at) : 'Hoy'; a.grupo = !a.at || diaLima(a.at) === hoy ? 'Hoy' : 'Antes'; return a;
    }).sort(function (a, b) { return (b.at ? Date.parse(b.at) : Infinity) - (a.at ? Date.parse(a.at) : Infinity); });
  }
  function renderAlerts() {
    var list = alerts(), read = readIds(), unread = list.filter(function (a) { return (a.chat || read.indexOf(a.id) === -1); }).length, ui = window.NexoraProviderUI;
    var ICONOS = { cierre: 'clock', union: 'plus', retiro: 'minus', chat: 'chat' };
    $('provider-nl').innerHTML = list.length ? ['Hoy', 'Antes'].filter(function (g) { return list.some(function (a) { return a.grupo === g; }); }).map(function (g) {
      return '<li class="nl__group" role="presentation">' + g + '</li>' + list.filter(function (a) { return a.grupo === g; }).map(function (a) {
        return '<li class="' + ((a.chat || read.indexOf(a.id) === -1) ? 'un' : '') + '"><a class="notification-content alert-link" href="' + esc(a.href) + '"><span class="alert-ic alert-ic--' + a.tipo + '">' + ui.icon(ICONOS[a.tipo] || 'clock') + '</span><span class="alert-body"><span class="notification-title">' + esc(a.text) + '</span><small class="alert-when">' + esc(a.cuando) + '</small></span></a></li>';
      }).join('');
    }).join('') : '<li class="empty"><span class="alert-ic alert-ic--ok">' + ui.icon('check') + '</span><strong>Estás al día</strong><span>No hay ventas por cerrar pronto ni novedades.</span></li>';
    var chats = list.filter(function (a) { return a.chat; }).length;
    var nav = document.querySelector('[data-provider-nav="mensajes"]');
    if (nav) { var count = document.getElementById('provider-chat-count'); if (!count) { nav.insertAdjacentHTML('beforeend', '<span id="provider-chat-count" class="nav-count"></span>'); count = document.getElementById('provider-chat-count'); } count.textContent = chats + ' sin leer'; count.hidden = !chats; }
    var badge = $('provider-badge'); badge.textContent = unread; badge.hidden = !unread;
    $('provider-bell').setAttribute('aria-label', unread ? 'Ver notificaciones: ' + unread + ' sin leer' : 'Ver notificaciones');
    $('provider-readall').hidden = !unread;
  }
  function panel(open) {
    $('provider-pop').hidden = !open; $('provider-pop-scrim').hidden = !open; $('provider-bell').setAttribute('aria-expanded', String(open));
    if (open) $('provider-pclose').focus(); else if ($('provider-pop').contains(document.activeElement)) $('provider-bell').focus();
  }
  function account(open) { $('provider-acct-menu').hidden = !open; $('provider-acct-btn').setAttribute('aria-expanded', String(open)); }

  function init(context) {
    ctx = context;
    var app = document.querySelector('.app'); if (app) app.classList.add('menu-init');
    setMode(desired()); setTimeout(function () { if (app) app.classList.remove('menu-init'); }, 60);
    $('side-toggle').addEventListener('click', function () { var next = mode === 'expanded' ? 'compact' : 'expanded'; save(next); setMode(next); });
    $('side-hide').addEventListener('click', function () { save('hidden'); setMode('hidden'); $('provider-open').focus(); });
    window.addEventListener('resize', function () {
      var next = desired(), narrow = String(window.innerWidth < 900), el = document.querySelector('.app');
      if (next !== mode || (el && el.getAttribute('data-narrow') !== narrow)) setMode(next);
    });
    renderAlerts();
    window.addEventListener('nexora-demo-change', renderAlerts);
    $('provider-bell').addEventListener('click', function () { panel($('provider-pop').hidden); });
    $('provider-pclose').addEventListener('click', function () { panel(false); });
    $('provider-pop-scrim').addEventListener('click', function () { panel(false); });
    $('provider-readall').addEventListener('click', function () {
      try { sessionStorage.setItem(READ_KEY, JSON.stringify(alerts().map(function (a) { return a.id; }))); } catch (e) { toast('No se pudo guardar. Inténtalo otra vez.'); return; }
      renderAlerts();
    });
    $('provider-acct-btn').addEventListener('click', function () { account($('provider-acct-menu').hidden); });
    document.addEventListener('click', function (e) { if (!$('provider-acct-menu').hidden && !e.target.closest('.acct')) account(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (!$('provider-acct-menu').hidden) { account(false); $('provider-acct-btn').focus(); }
      else if (!$('provider-pop').hidden) panel(false);
    });
  }

  window.NexoraProviderShell = { init: init, toast: toast, alerts: alerts };
})();
