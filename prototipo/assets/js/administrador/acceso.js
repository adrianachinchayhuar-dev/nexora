(function () {
  'use strict';
  var ui = window.NexoraAdminUI;
  document.getElementById('admin-brand').innerHTML = ui.logo();
  var toggle = document.getElementById('admin-password-toggle');
  toggle.addEventListener('click', function () {
    var input = document.getElementById('admin-password'), visible = input.type === 'password';
    input.type = visible ? 'text' : 'password';
    toggle.setAttribute('aria-pressed', String(visible));
    toggle.setAttribute('aria-label', visible ? 'Ocultar contraseña' : 'Mostrar contraseña');
  });
  document.getElementById('admin-access-form').addEventListener('submit', function (e) {
    e.preventDefault(); var email = document.getElementById('admin-email'), password = document.getElementById('admin-password'), error = document.getElementById('admin-access-error');
    if (!email.validity.valid || !email.value.trim() || !password.value) { error.textContent = 'Ingresa el correo demo con formato válido y su contraseña.'; (!email.validity.valid || !email.value.trim() ? email : password).focus(); return; }
    error.textContent = window.NexoraAdminSession.enter(email.value, password.value); if (error.textContent) error.focus();
  });
})();
