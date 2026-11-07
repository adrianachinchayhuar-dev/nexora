/* Registro del proveedor (simulado). Valida en pantalla y crea la cuenta «En revisión» con NexoraAccounts. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var form = $('reg-form'), cuentas = window.NexoraAccounts; if (!form || !cuentas || !window.NexoraProviders) return;
  var touched = {};
  $('pz-lista').innerHTML = window.NexoraProviders.zonas().map(function (z) { return '<label><input type="checkbox" name="zona" value="' + z.id + '"> ' + z.name + '</label>'; }).join('');
  function zonas() { return Array.prototype.map.call(form.querySelectorAll('input[name="zona"]:checked'), function (x) { return x.value; }); }
  var RULES = {
    pr: function (v) { v = v.trim(); return v.length >= 2 && v.length <= 100 ? '' : 'Escribe la razón social (2 a 100 letras).'; },
    pk: function (v) { return /^\d{11}$/.test(v.trim()) ? '' : 'El RUC tiene 11 dígitos.'; },
    pn: function (v) { v = v.trim(); return v.length >= 2 && v.length <= 60 ? '' : 'Escribe el nombre de contacto (2 a 60 letras).'; },
    pc: function (v) { return /^9\d{8}$/.test(v.replace(/\s/g, '')) ? '' : 'El celular tiene 9 dígitos y empieza con 9.'; },
    pe: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? '' : 'Escribe un correo válido, como ventas@empresa.com.'; },
    pw: function (v) { return v.length >= 8 ? '' : 'La contraseña necesita al menos 8 caracteres.'; },
    pw2: function (v) { return v && v === $('pw').value ? '' : 'Las contraseñas no son iguales.'; },
    pz: function () { return zonas().length ? '' : 'Elige al menos una zona que atiendes.'; },
    pt: function () { return $('pt').checked ? '' : 'Acepta los términos para continuar.'; }
  };
  var ids = Object.keys(RULES);
  function value(id) { return id === 'pt' || id === 'pz' ? '' : $(id).value; }
  function show(id) {
    var msg = RULES[id](value(id)), bad = !!msg && !!touched[id];
    $('err-' + id).textContent = bad ? msg : '';
    if (id !== 'pt' && id !== 'pz') $(id).setAttribute('aria-invalid', bad ? 'true' : 'false');
  }
  function refresh() { $('reg-submit').disabled = ids.some(function (id) { return !!RULES[id](value(id)); }); }
  ids.forEach(function (id) {
    var el = $(id), type = id === 'pt' || id === 'pz' ? 'change' : 'input';
    el.addEventListener(type, function () { touched[id] = true; if (id === 'pw') { touched.pw2 = touched.pw2 || !!$('pw2').value; show('pw2'); } show(id); refresh(); });
    if (id !== 'pz') el.addEventListener('blur', function () { touched[id] = true; show(id); });
  });
  $('pw-toggle').addEventListener('click', function () {
    var visible = $('pw').type === 'password'; $('pw').type = $('pw2').type = visible ? 'text' : 'password';
    this.textContent = visible ? 'Ocultar' : 'Mostrar'; this.setAttribute('aria-pressed', visible); this.setAttribute('aria-label', visible ? 'Ocultar contraseña' : 'Mostrar contraseña');
  });
  form.addEventListener('submit', function (e) {
    e.preventDefault(); ids.forEach(function (id) { touched[id] = true; show(id); });
    if ($('reg-submit').disabled) return;
    $('reg-submit').disabled = true;
    Promise.resolve(cuentas.registrarProveedor({ razonSocial: $('pr').value, ruc: $('pk').value, contacto: $('pn').value, phone: $('pc').value, email: $('pe').value, password: $('pw').value, zonas: zonas(), terminos: $('pt').checked })).then(function (resultado) {
      if (resultado.error) { $('reg-msg').textContent = resultado.error; $('reg-msg').style.display = 'block'; refresh(); return; }
      var message = window.NexoraProviderSession.enter(resultado.id);
      if (message) { $('reg-msg').textContent = message; $('reg-msg').style.display = 'block'; }
    });
  });
})();
