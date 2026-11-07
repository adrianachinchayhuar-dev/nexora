(function () {
  'use strict';
  var ui = window.NexoraAdminUI;
  function query() { var p = new URLSearchParams(location.search); return { q: p.get('q') || '', status: p.get('estado') || '', provider: p.get('proveedor') || '' }; }
  function url(id, filters) { var params = new URLSearchParams(); if (id) params.set('id',id); if(filters.q)params.set('q',filters.q);if(filters.status)params.set('estado',filters.status);if(filters.provider)params.set('proveedor',filters.provider);return ui.href((id ? 'detalle-oportunidad.html' : 'agrupaciones.html') + (params.toString() ? '?' + params.toString() : '')); }
  function error(root, result) { root.innerHTML = '<section class="admin-panel"><h2>' + (result.notFound ? 'Oportunidad no encontrada' : 'No se pudo consultar el escenario') + '</h2><p role="alert">' + ui.esc(result.message) + '</p><div class="admin-actions"><a class="btn o" href="' + ui.esc(url(null,query())) + '">Volver al listado</a><a class="btn o" href="' + ui.esc(url(null,{})) + '">Abrir listado sin filtros</a></div><p>Consulta sin cambios en los datos. Si falta el escenario, abre primero el comprador en esta misma pestaña.</p></section>'; }
  function status(o) { return o.estado ? o.estado.texto : o.status === 'abierta' ? 'Abierta' : 'Cerrada'; }
  function row(label, value) { return '<div><dt>' + ui.esc(label) + '</dt><dd>' + ui.esc(value === null || value === undefined || value === '' ? 'No disponible en este registro demostrativo' : value) + '</dd></div>'; }
  window.NexoraAdminGroupsUI = { query:query,url:url,error:error,status:status,row:row };
})();
