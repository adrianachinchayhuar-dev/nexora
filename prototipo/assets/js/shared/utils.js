/* Utilidades comunes a comprador, proveedor y administrador. Se carga justo después de acceso-roles.js. */
(function () {
  'use strict';
  var entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  // Escapa texto antes de insertarlo con innerHTML.
  function esc(value) { return String(value).replace(/[&<>"']/g, function (c) { return entities[c]; }); }
  // Minúsculas y sin tildes, para comparar textos en búsquedas y filtros.
  function normalizar(value) { return String(value).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  window.NexoraUtils = { esc: esc, normalizar: normalizar };
})();
