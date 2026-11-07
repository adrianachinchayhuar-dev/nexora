/* Pantalla de estado de la cuenta del proveedor: en revisión, rechazada o suspendida. Solo muestra sus datos y permite salir. */
(function () {
  'use strict';
  var ui = window.NexoraProviderUI, $ = function (id) { return document.getElementById(id); };
  if (!ui || !window.NexoraProviderSession || !window.NexoraAccounts) return;
  var id = window.NexoraProviderSession.requireAccount(); if (!id) return;
  $('provider-access-brand').innerHTML = ui.logo();
  var TEXTOS = {
    en_revision: ['Tu cuenta está en revisión', 'Te avisaremos cuando el equipo de NEXORA la apruebe. Mientras tanto no puedes usar tu catálogo ni tus precios.'],
    rechazada: ['Tu solicitud no fue aprobada', 'Puedes escribir al equipo de NEXORA para volver a revisarla.'],
    suspendida: ['Tu cuenta está suspendida', 'Tus productos no se muestran y tus compras sin confirmar no se concretaron. Escribe al equipo de NEXORA para reactivarla.']
  };
  function esc(v) { return ui.esc(v == null ? '' : v); }
  function fecha(iso) { var d = new Date(iso); return Number.isFinite(d.getTime()) ? new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeZone: 'America/Lima' }).format(d) : ''; }
  function render() {
    var cuenta = window.NexoraAccounts.proveedor(id), estado = window.NexoraAccounts.estadoDe(id);
    var texto = TEXTOS[estado.estado] || ['Tu cuenta', 'No encontramos los datos de esta cuenta. Cierra sesión e inténtalo de nuevo.'];
    $('cuenta-titulo').textContent = texto[0]; $('cuenta-texto').textContent = texto[1] + (estado.motivo ? ' Motivo: ' + estado.motivo + '.' : '');
    document.title = 'NEXORA · ' + texto[0];
    var zonas = cuenta ? cuenta.zonas.map(function (z) { return window.NexoraProviders.zoneName(z).replace(/\s*\(demo\)/i, ''); }).join(', ') : '';
    var filas = cuenta ? [['Razón social', cuenta.razonSocial], ['RUC', cuenta.ruc], ['Contacto', cuenta.contacto], ['Celular', cuenta.phone], ['Correo', cuenta.email], ['Zonas que atiendes', zonas], ['Registrada el', fecha(cuenta.creadoAt)]] : [['Cuenta', (window.NexoraProviders.byId(id) || {}).name || id]];
    $('cuenta-datos').innerHTML = filas.map(function (f) { return '<div><dt>' + esc(f[0]) + '</dt><dd>' + esc(f[1]) + '</dd></div>'; }).join('');
  }
  $('cuenta-salir').addEventListener('click', function () { var message = window.NexoraProviderSession.logout(); if (message) { $('cuenta-error').textContent = message; $('cuenta-error').focus(); } });
  window.addEventListener('nexora-demo-change', render);
  render();
})();
