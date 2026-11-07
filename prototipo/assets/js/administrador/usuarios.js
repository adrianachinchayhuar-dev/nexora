(function () {
  'use strict';
  var ui = window.NexoraAdminUI, store = window.NexoraAdminStore, root = document.getElementById('admin-content');
  var type = '', status = '', proposal = null, opener = null;
  var ESTADOS = ['En revisión', 'Aprobada', 'Rechazada', 'Suspendida', 'Activa'];
  function badge(value) {
    var tone = value === 'En revisión' ? 'pending' : value === 'Aprobada' || value === 'Activa' ? 'positive' : 'restricted';
    return '<span class="admin-user-status status-' + tone + '">' + ui.esc(value) + '</span>';
  }
  function roleName(record) { return record.type === 'negocio' ? 'Negocio comprador' : 'Proveedor'; }
  function decisionLabel(next, tipo) { return next === 'Aprobada' ? 'Aprobar proveedor' : next === 'Rechazada' ? 'Rechazar solicitud' : next === 'Suspendida' ? 'Suspender cuenta' : 'Reactivar cuenta'; }
  function fecha(iso) { var d = new Date(iso); return iso && Number.isFinite(d.getTime()) ? new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Lima' }).format(d) : ''; }
  // Qué decisiones admite cada cuenta según su estado.
  function opciones(record) {
    var e = record.estado;
    if (e === 'en_revision') return ['Aprobada', 'Rechazada'];
    if (e === 'aprobada' || e === 'activa') return ['Suspendida'];
    if (e === 'suspendida') return [record.type === 'negocio' ? 'Activa' : 'Aprobada'];
    if (e === 'rechazada') return ['Aprobada'];
    return [];
  }
  function render() {
    if (!window.NexoraAdminSession.requireSession()) return;
    var view = store.view();
    if (view.error) { root.innerHTML = '<section class="admin-panel"><h2>No se pudieron cargar las cuentas</h2><p role="alert">' + ui.esc(view.error) + '</p><a class="btn o" href="' + ui.esc(ui.href('usuarios.html')) + '">Volver a consultar</a></section>'; return; }
    root.innerHTML = '<section class="admin-panel admin-user-filter-panel" aria-label="Filtros de usuarios"><div class="admin-filters"><label>Tipo de usuario<select id="admin-user-type"><option value="">Todos los tipos</option><option value="negocio">Negocio comprador</option><option value="proveedor">Proveedor</option></select></label><label>Estado<select id="admin-user-status"><option value="">Todos los estados</option>' + ESTADOS.map(function (s) { return '<option>' + s + '</option>'; }).join('') + '</select></label><button class="btn o" id="admin-user-clear">Limpiar filtros</button></div><p id="admin-user-result" role="status" tabindex="-1"></p></section>' +
      '<section class="admin-users-section" aria-labelledby="admin-requests-heading"><div class="admin-users-section-heading"><div><h2 id="admin-requests-heading">' + ui.icon('check') + 'Proveedores registrados</h2><p id="admin-pending-note">' + (view.pendientes ? '<strong>' + view.pendientes + (view.pendientes === 1 ? ' proveedor por aprobar.' : ' proveedores por aprobar.') + '</strong> Los pendientes aparecen primero.' : 'No hay proveedores por aprobar.') + '</p></div><span class="admin-record-count" id="admin-request-count"></span></div><div id="admin-requests"></div></section>' +
      '<section class="admin-users-section" aria-labelledby="admin-profiles-heading"><div class="admin-users-section-heading"><div><h2 id="admin-profiles-heading">' + ui.icon('users') + 'Perfiles representados</h2><p>Negocios compradores y proveedores del escenario actual. Puedes suspenderlos y reactivarlos.</p></div><span class="admin-record-count" id="admin-profile-count"></span></div><div id="admin-existing-users"></div></section>' +
      '<p class="admin-note admin-users-notice">' + ui.icon('info') + '<span><strong>Las decisiones se aplican al instante.</strong> Un proveedor aprobado entra a su dashboard; uno suspendido pierde el acceso y sus compras sin confirmar pasan a «No se concretó». Los compradores se registran sin aprobación, pero puedes suspenderlos.</span></p><dialog class="admin-user-dialog" id="admin-user-dialog" aria-labelledby="admin-user-title"><div id="admin-user-detail"></div></dialog>';
    var typeInput = document.getElementById('admin-user-type'), statusInput = document.getElementById('admin-user-status'); typeInput.value = type; statusInput.value = status;
    function list() {
      type = typeInput.value; status = statusInput.value;
      function cards(items, kind) {
        return items.length ? '<div class="admin-user-grid">' + items.map(function (r) {
          return '<article class="admin-user-card"><div class="admin-user-card-top"><span class="admin-profile-icon">' + ui.icon(r.type === 'negocio' ? 'store' : 'truck') + '</span><div class="admin-user-identity"><h3>' + ui.esc(r.name) + '</h3><p>' + roleName(r) + '</p></div></div>' + badge(r.status) + '<div class="admin-user-card-bottom"><p>' + (kind === 'request' ? ui.esc((r.datos.ruc ? 'RUC ' + r.datos.ruc + ' · ' : '') + r.zone) : 'Perfil del escenario') + '</p><button type="button" class="btn o" data-admin-kind="' + kind + '" data-admin-record="' + ui.esc(kind === 'request' ? r.id : r.key) + '">Ver detalles<span class="admin-sr-only"> de ' + ui.esc(r.name) + '</span><span aria-hidden="true">→</span></button></div></article>';
        }).join('') + '</div>' : '<p class="admin-note admin-users-empty">No hay ' + (kind === 'request' ? 'proveedores registrados' : 'perfiles existentes') + ' que coincidan con estos filtros.</p>';
      }
      var profiles = store.filter(view.users, type, status), requests = store.filter(view.requests, type, status);
      document.getElementById('admin-profile-count').textContent = profiles.length + (profiles.length === 1 ? ' perfil' : ' perfiles');
      document.getElementById('admin-request-count').textContent = requests.length + (requests.length === 1 ? ' proveedor' : ' proveedores');
      document.getElementById('admin-existing-users').innerHTML = view.sourceError ? '<p role="alert">' + ui.esc(view.sourceError) + '</p><p>La consulta de perfiles no generó datos. Los proveedores registrados se muestran por separado.</p>' : cards(profiles, 'moderation');
      document.getElementById('admin-requests').innerHTML = cards(requests, 'request');
      root.querySelectorAll('[data-admin-record]').forEach(function (button) { button.addEventListener('click', function () { opener = button; details(button.dataset.adminKind, button.dataset.adminRecord); }); });
    }
    typeInput.addEventListener('change', list); statusInput.addEventListener('change', list); document.getElementById('admin-user-clear').addEventListener('click', function () { typeInput.value = ''; statusInput.value = ''; list(); });
    var dialog = document.getElementById('admin-user-dialog'); dialog.addEventListener('close', function () { proposal = null; if (opener && opener.isConnected) opener.focus(); }); list();
  }
  function details(kind, id) {
    var view = store.view(), record = !view.error && (kind === 'request' ? view.requests : view.users).find(function (r) { return (kind === 'request' ? r.id : r.key) === id; });
    if (!record) { document.getElementById('admin-user-result').textContent = view.error || 'Este registro ya no está disponible. Vuelve a consultar.'; return; }
    var dialog = document.getElementById('admin-user-dialog'), detail = document.getElementById('admin-user-detail'), d = record.datos;
    proposal = null;
    var facts = kind === 'request' ? [['RUC', d.ruc], ['Contacto', d.contacto], ['Celular', d.phone], ['Correo', d.email], ['Zonas que atiende', d.zonas], ['Registrada el', fecha(d.creadoAt)], ['Última decisión', fecha(d.revisadoAt)]] : [['Origen del perfil', record.origin]];
    if (record.motivo) facts.push(['Motivo', record.motivo]);
    var buttons = opciones(record).map(function (next, i) { return '<button class="btn ' + (i ? 'o' : 'p') + '" data-admin-next="' + next + '">' + decisionLabel(next, record.type) + '</button>'; }).join('');
    detail.innerHTML = '<div class="admin-dialog-heading"><span class="admin-profile-icon">' + ui.icon(record.type === 'negocio' ? 'store' : 'truck') + '</span><span class="admin-dialog-eyebrow">' + (kind === 'request' ? 'DETALLE DEL PROVEEDOR' : 'DETALLE DE PERFIL') + '</span></div><h2 id="admin-user-title" tabindex="-1">' + ui.esc(record.name) + '</h2><div class="admin-dialog-badges"><span class="admin-user-type">' + roleName(record) + '</span>' + badge(record.status) + '</div><dl class="admin-user-facts">' + facts.filter(function (f) { return f[1]; }).map(function (f) { return '<div><dt>' + ui.esc(f[0]) + '</dt><dd>' + ui.esc(f[1]) + '</dd></div>'; }).join('') + '</dl><details class="admin-user-trace"><summary>Referencia del registro</summary><p class="admin-user-id">' + ui.esc(record.id) + '</p></details><div class="admin-dialog-decision"><h3>Decisiones administrativas</h3>' + (buttons ? '<div class="admin-actions">' + buttons + '</div>' : '<p class="admin-resolved">Esta cuenta no admite otra decisión.</p>') + '</div><div class="admin-dialog-footer"><button class="btn o" id="admin-detail-close">Cerrar detalles</button></div><p id="admin-action-error" role="alert"></p>';
    document.getElementById('admin-detail-close').addEventListener('click', function () { dialog.close(); });
    detail.querySelectorAll('[data-admin-next]').forEach(function (button) { button.addEventListener('click', function () { var prepared = store.prepare(kind, id, button.dataset.adminNext); if (prepared.error) { document.getElementById('admin-action-error').textContent = prepared.error; return; } proposal = prepared.proposal; confirmation(); }); });
    if (!dialog.open) dialog.showModal();
    document.getElementById('admin-user-title').focus();
  }
  function confirmation() {
    var detail = document.getElementById('admin-user-detail'), verbo = proposal.nextCode === 'aprobada' ? (proposal.previousCode === 'suspendida' ? 'reactivación' : 'aprobación') : proposal.nextCode === 'rechazada' ? 'rechazo' : proposal.nextCode === 'suspendida' ? 'suspensión' : 'reactivación';
    var efecto = proposal.nextCode === 'aprobada' ? 'El proveedor podrá entrar a su dashboard, catálogo y precios.' : proposal.nextCode === 'rechazada' ? 'El proveedor verá el motivo y no podrá entrar.' : proposal.nextCode === 'suspendida' ? (proposal.type === 'proveedor' ? 'Pierde el acceso, sus productos se ocultan y sus compras sin confirmar pasan a «No se concretó» con aviso a los compradores.' : 'No podrá entrar a su cuenta hasta que la reactives.') : 'Podrá volver a entrar a su cuenta.';
    detail.innerHTML = '<div class="admin-dialog-heading"><span class="admin-profile-icon">' + ui.icon('info') + '</span><span class="admin-dialog-eyebrow">CONFIRMACIÓN DE DECISIÓN</span></div><h2 id="admin-user-title">' + decisionLabel(proposal.next, proposal.type) + '</h2><p class="admin-confirm-question">¿Confirmas esta acción para <strong>' + ui.esc(proposal.name) + '</strong>?</p><div class="admin-confirm-change"><div><span>Estado actual</span>' + badge(proposal.previous) + '</div><span class="admin-confirm-arrow" aria-hidden="true">→</span><div><span>Nuevo estado</span>' + badge(proposal.next) + '</div></div><p class="admin-note">' + ui.esc(efecto) + '</p>' + (proposal.needsReason ? '<label class="admin-reason">Motivo (lo verá la persona)<textarea id="admin-reason" maxlength="200" rows="3" placeholder="Explica la decisión en pocas palabras"></textarea></label>' : '') + '<details class="admin-user-trace"><summary>Referencia del registro</summary><p class="admin-user-id">' + ui.esc(proposal.accountId) + '</p></details><div class="admin-dialog-footer admin-confirm-buttons"><button class="btn o" id="admin-confirm-cancel">Cancelar</button><button class="btn p" id="admin-confirm-action">Confirmar ' + verbo + '</button></div><p id="admin-action-error" role="alert"></p>';
    document.getElementById('admin-confirm-cancel').addEventListener('click', function () { document.getElementById('admin-user-dialog').close(); });
    document.getElementById('admin-confirm-action').addEventListener('click', function () {
      var reason = document.getElementById('admin-reason'); if (reason) proposal.motivo = reason.value;
      var result = store.confirm(proposal);
      if (result.error) { document.getElementById('admin-action-error').textContent = result.error; return; }
      document.getElementById('admin-user-dialog').close(); render();
      var message = document.getElementById('admin-user-result'); message.textContent = result.message; message.focus();
    });
    (document.getElementById('admin-reason') || document.getElementById('admin-confirm-cancel')).focus();
  }
  try { var identity = window.NexoraAdminSession.requireSession(); if (!identity) return; ui.mount(identity); render(); window.addEventListener('pageshow', function (e) { if (e.persisted) render(); }); window.addEventListener('nexora-demo-change', render); }
  catch (e) { root.innerHTML = '<section class="admin-panel"><h2>No se pudo iniciar Usuarios</h2><p role="alert">Recarga los archivos actualizados.</p></section>'; console.error('NEXORA A2:', e); }
})();
