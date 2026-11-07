/* Registro del comprador (simulado). Valida en pantalla y crea la cuenta con NexoraDemo.crearCuenta:
   los datos se guardan solo en este navegador. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var form = $('reg-form'); if (!form) return;
  var ZONAS = { 'Santa Anita': [['sa-centro', 'Centro']], 'Villa El Salvador': [['ves-sector1', 'Sector 1']] };
  var touched = {};
  var RULES = {
    rn: function (v) { v = v.trim(); return v.length >= 2 && v.length <= 80 ? '' : 'Escribe el nombre de tu negocio (2 a 80 letras).'; },
    rp: function (v) { v = v.trim(); return v.length >= 2 && v.length <= 60 ? '' : 'Escribe tu nombre (2 a 60 letras).'; },
    rc: function (v) { return /^9\d{8}$/.test(v.replace(/\s/g, '')) ? '' : 'El celular tiene 9 dígitos y empieza con 9.'; },
    re: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? '' : 'Escribe un correo válido, como nombre@correo.com.'; },
    rw: function (v) { return v.length >= 8 ? '' : 'La contraseña necesita al menos 8 caracteres.'; },
    rw2: function (v) { return v && v === $('rw').value ? '' : 'Las contraseñas no son iguales.'; },
    rd: function (v) { return v ? '' : 'Elige tu distrito.'; },
    rz: function (v) { return v ? '' : 'Elige tu zona.'; },
    ra: function (v) { return v.trim().length >= 5 ? '' : 'Escribe tu dirección (calle y número).'; },
    rt: function () { return $('rt').checked ? '' : 'Acepta los términos para continuar.'; }
  };
  var ids = Object.keys(RULES);
  function value(id) { return id === 'rt' ? '' : $(id).value; }
  function show(id) {
    var msg = RULES[id](value(id)), bad = !!msg && !!touched[id];
    $('err-' + id).textContent = bad ? msg : '';
    if (id !== 'rt') $(id).setAttribute('aria-invalid', bad ? 'true' : 'false');
  }
  function refresh() { $('reg-submit').disabled = ids.some(function (id) { return !!RULES[id](value(id)); }); }
  ids.forEach(function (id) {
    var el = $(id), type = id === 'rt' || id === 'rd' || id === 'rz' ? 'change' : 'input';
    el.addEventListener(type, function () { touched[id] = true; if (id === 'rw') { touched.rw2 = touched.rw2 || !!$('rw2').value; show('rw2'); } show(id); refresh(); });
    el.addEventListener('blur', function () { touched[id] = true; show(id); });
  });
  $('rd').addEventListener('change', function () {
    var lista = ZONAS[$('rd').value] || [];
    $('rz').innerHTML = lista.length ? lista.map(function (z, i) { return '<option value="' + z[0] + '"' + (i ? '' : ' selected') + '>' + z[1] + '</option>'; }).join('') : '<option value="">Elige primero el distrito</option>';
    touched.rz = true; show('rz'); refresh();
  });
  $('pw-toggle').addEventListener('click', function () {
    var visible = $('rw').type === 'password'; $('rw').type = $('rw2').type = visible ? 'text' : 'password';
    this.textContent = visible ? 'Ocultar' : 'Mostrar'; this.setAttribute('aria-pressed', visible); this.setAttribute('aria-label', visible ? 'Ocultar contraseña' : 'Mostrar contraseña');
  });
  form.addEventListener('submit', function (e) {
    e.preventDefault(); ids.forEach(function (id) { touched[id] = true; show(id); });
    if ($('reg-submit').disabled) return;
    $('reg-submit').disabled = true;
    var d = $('rd'), z = $('rz');
    Promise.resolve(window.NexoraDemo.crearCuenta({ business: $('rn').value.trim(), name: $('rp').value.trim(), phone: $('rc').value.replace(/\s/g, ''), email: $('re').value.trim().toLowerCase(), password: $('rw').value, distrito: d.value, zona: z.value, direccion: $('ra').value.trim() })).then(function (error) {
      if (!error) return;
      $('reg-msg').textContent = error; $('reg-msg').style.display = 'block'; refresh();
    });
  });
})();
