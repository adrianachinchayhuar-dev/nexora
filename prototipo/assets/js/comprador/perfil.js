/* Perfil. Textos: docs/INVENTARIO_CLARIDAD.md, sección 12. Guardar usa store.updateProfile con sus mismas
   validaciones; aquí solo cambia qué se muestra y cómo. */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  function failure(error) {
    $('profile-panel').innerHTML = '<h2 class="nx-h3">No se pudo iniciar Perfil</h2><p role="alert">Recarga la página. Tus datos se conservan.</p><a class="nx-btn nx-btn--secondary" href="perfil.html?revision=perfil-20261016">Recargar Perfil</a>';
    console.error('NEXORA: Perfil no disponible.', error);
  }
  try {
    if (!window.NexoraDemo || !window.NexoraDemo.requireSession()) return;
    var store = window.NexoraStore, ui = window.NexoraUI;
    if (!store || store.profileVersion !== 1 || !ui || !ui.avatar) throw new Error('Dependencias de Perfil incompatibles');
    var esc = ui.esc, editing = false, original = null, confirming = false;
    var fields = ['business', 'name', 'businessType', 'phone', 'email', 'description', 'ruc', 'horario'];
    var TYPES = [['Bodega', 'Bodega'], ['Minimercado', 'Minimercado'], ['Otro', 'Otro'], ['', 'Sin indicar']];
    function value(key) { if (key !== 'businessType') return $('profile-' + key).value; var checked = $('profile-businessType').querySelector('input:checked'); return checked ? checked.value : ''; }
    function values() { var result = {}; fields.forEach(function (key) { result[key] = value(key); }); return result; }
    function dirty() { return editing && JSON.stringify(values()) !== JSON.stringify(original); }
    function status(text) { $('profile-status').textContent = text; $('profile-status').hidden = !text; }
    function summary() {
      var a = store.buyerActivity();
      $('profile-activity').innerHTML = [['<strong>' + esc(a.needs) + '</strong> ' + (a.needs === 1 ? 'pedido' : 'pedidos'), 'necesidades.html', 'clip'], [a.confirmed ? 'Te uniste a <strong>' + esc(a.confirmed) + '</strong>' : 'Aún no te unes a ninguna', 'seguimiento.html', 'users'], ['<strong>' + esc(a.conversations) + '</strong> ' + (a.conversations === 1 ? 'conversación' : 'conversaciones'), 'mensajes.html', 'chat']].map(function (item) {
        return '<li><a class="pf-activity__link" href="' + esc(ui.buyerHref(item[1])) + '"><span class="pf-activity__icon" aria-hidden="true">' + ui.ic(item[2]) + '</span><span>' + item[0] + '</span><svg class="ic nx-row__chev" aria-hidden="true"><use href="#chev"/></svg></a></li>';
      }).join('');
    }
    function row(label, text) { return '<dt>' + esc(label) + '</dt><dd' + (text ? '' : ' class="pf-empty"') + '>' + esc(text || 'No indicado') + '</dd>'; }
    function input(key, label, type, hint) {
      return '<label class="pf-field" for="profile-' + key + '"><span>' + label + '</span><input id="profile-' + key + '" type="' + type + '" value="' + esc(store.get().user[key] || '') + '" aria-describedby="error-' + key + (hint ? ' hint-' + key : '') + '">' + (hint ? '<small id="hint-' + key + '">' + hint + '</small>' : '') + '<span class="pf-error" id="error-' + key + '"></span></label>';
    }
    function render() {
      var u = store.get().user, zone = ui.plain(store.zoneName(u.zoneId));
      var content = '<header class="pf-identity"><span class="av" id="profile-avatar"></span><div><h2 class="nx-h2">' + esc(u.business) + '</h2><p class="nx-detail">' + esc([u.businessType, zone].filter(Boolean).join(' · ')) + '</p></div>' + (editing ? '' : '<button type="button" class="nx-btn nx-btn--secondary" id="profile-edit">Editar información</button>') + '</header>';
      if (editing) {
        content += '<form id="profile-form" class="pf-form" novalidate><fieldset class="pf-section"><legend class="nx-label">Tu negocio</legend>' + input('business', 'Nombre comercial', 'text') +
          '<fieldset class="pf-types" id="profile-businessType" tabindex="-1" aria-describedby="error-businessType"><legend>Rubro</legend><div class="nx-chips">' + TYPES.map(function (r) { return '<label class="pf-type"><input type="radio" name="profile-businessType" value="' + r[0] + '"' + ((u.businessType || '') === r[0] ? ' checked' : '') + '><span>' + r[1] + '</span></label>'; }).join('') + '</div><span class="pf-error" id="error-businessType"></span></fieldset>' +
          '</fieldset>' +
          '<fieldset class="pf-section"><legend class="nx-label">Contacto</legend>' + input('name', 'Tu nombre', 'text') + input('phone', 'Teléfono', 'tel', 'Opcional.') + '</fieldset>' +
          '<fieldset class="pf-section"><legend class="nx-label">Completa tu perfil (opcional)</legend>' + input('ruc', 'RUC', 'text', 'Opcional. 11 dígitos.') +
          '<label class="pf-field" for="profile-description"><span>Descripción</span><textarea id="profile-description" rows="3" aria-describedby="error-description hint-description">' + esc(u.description || '') + '</textarea><small id="hint-description">Opcional.</small><span class="pf-error" id="error-description"></span></label>' +
          input('horario', 'Horario de atención', 'text', 'Opcional. Ej: Lun a sáb, 7:00 a 20:00.') + input('email', 'Correo', 'email', 'Opcional.') + '</fieldset>' +
          '<p class="nx-detail pf-zone">Tu dirección, distrito y zona (' + esc([ui.plain(u.direccion), u.distrito, zone].filter(Boolean).join(' · ')) + ') no se cambian aquí.</p>' +
          '<div class="pf-actions"><button class="nx-btn nx-btn--primary" type="submit">Guardar cambios</button><button class="nx-btn nx-btn--secondary" type="button" id="profile-cancel">Cancelar</button></div></form>';
      } else {
        var optional = [['RUC', u.ruc], ['Descripción', u.description], ['Horario de atención', u.horario], ['Correo', u.email]], done = optional.filter(function (r) { return r[1]; }).length;
        content += '<div class="pf-sections"><section class="pf-section"><h3 class="nx-label">Tu negocio</h3><dl class="pf-data">' + row('Nombre comercial', u.business) + row('Rubro', u.businessType) + row('Dirección', ui.plain(u.direccion)) + row('Distrito', u.distrito) + row('Zona', zone) + '</dl></section>' +
          '<section class="pf-section"><h3 class="nx-label">Contacto</h3><dl class="pf-data">' + row('Tu nombre', u.name) + row('Teléfono', u.phone) + '</dl></section>' +
          '<section class="pf-section pf-complete"><h3 class="nx-label">Completa tu perfil</h3><p class="nx-detail">' + (done === optional.length ? 'Tu perfil está completo.' : 'Completaste ' + done + ' de ' + optional.length + '. Lo demás es opcional.') + '</p><dl class="pf-data">' + optional.map(function (r) { return row(r[0], r[1]); }).join('') + '</dl>' + (done === optional.length ? '' : '<button class="nx-btn nx-btn--secondary" type="button" id="profile-complete">Completar ahora</button>') + '</section></div>';
      }
      $('profile-panel').innerHTML = content; ui.avatar($('profile-avatar')); summary();
      if (editing) original = values();
    }
    // Confirmación corta propia (la de la demo lleva el título «Confirmar escenario demo»).
    function askDiscard() {
      return new Promise(function (resolve) {
        var dialog = $('profile-discard-dialog');
        function done(answer) { $('profile-discard-yes').onclick = $('profile-discard-no').onclick = dialog.oncancel = null; dialog.close(); resolve(answer); }
        $('profile-discard-yes').onclick = function () { done(true); }; $('profile-discard-no').onclick = function () { done(false); };
        dialog.oncancel = function (e) { e.preventDefault(); done(false); };
        dialog.showModal(); $('profile-discard-no').focus();
      });
    }
    async function mayDiscard() {
      if (!dirty()) return true;
      if (confirming) return false;
      confirming = true; var answer = await askDiscard(); confirming = false; return answer;
    }
    $('profile-panel').addEventListener('click', async function (e) {
      if (e.target.closest('#profile-edit') || e.target.closest('#profile-complete')) { editing = true; status(''); render(); $('profile-business').focus(); }
      if (e.target.closest('#profile-cancel') && await mayDiscard()) { editing = false; render(); status('No guardamos los cambios.'); $('profile-edit').focus(); }
    });
    $('profile-panel').addEventListener('submit', function (e) {
      if (e.target.id !== 'profile-form') return; e.preventDefault();
      var patch = values(), result = store.updateProfile(patch);
      fields.forEach(function (key) { $('error-' + key).textContent = result.errors && result.errors[key] || ''; $('profile-' + key).setAttribute('aria-invalid', result.errors && result.errors[key] ? 'true' : 'false'); });
      if (result.errors) { status(result.errors.form || 'Revisa los campos marcados.'); var invalid = fields.find(function (key) { return result.errors[key]; }); if (invalid) $('profile-' + invalid).focus(); return; }
      if (result.error) { status(result.error + ' Tus cambios siguen en el formulario, sin guardar.'); return; }
      editing = false; render(); status('Guardamos tu perfil. Tus pedidos no cambian.'); $('profile-edit').focus();
    });
    document.addEventListener('click', async function (e) {
      var link = e.target.closest('a[href]'), reset = e.target.closest('#reset');
      if (!dirty() || (!link && !reset) || (link && link.getAttribute('href') === '#')) return;
      if (link && (e.metaKey || e.ctrlKey || e.shiftKey || link.target === '_blank')) return;
      e.preventDefault(); e.stopImmediatePropagation();
      if (!await mayDiscard()) return;
      if (link && link.dataset.k === 'salir') {
        var logoutError = window.NexoraDemo.logout(function () { editing = false; });
        if (logoutError) status(logoutError + ' Tus cambios siguen en el formulario, sin guardar.');
        return;
      }
      editing = false;
      if (reset) { render(); reset.click(); }
      else location.assign(link.href);
    }, true);
    window.addEventListener('beforeunload', function (e) { if (dirty()) { e.preventDefault(); e.returnValue = ''; } });
    window.addEventListener('nexora-demo-change', function (e) {
      if (e.detail && e.detail.reason === 'reset') { editing = false; status('Volvió el perfil inicial.'); render(); }
      else if (!editing) render(); else summary();
    });
    render(); if (store.error()) status(store.error());
  } catch (error) { failure(error); }
})();
