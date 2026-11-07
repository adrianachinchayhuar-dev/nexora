(function () {
  var ui = window.NexoraProviderUI, registry = window.NexoraProviders;
  if (!ui || !registry || !window.NexoraProviderSession || !window.NexoraScenarioRead) return;
  document.getElementById('provider-access-brand').innerHTML = ui.logo();
  document.getElementById('provider-enter').disabled = false;
  document.getElementById('provider-enter').addEventListener('click', function () {
    var error = window.NexoraProviderSession.enter('PROV-DEMO-ANDINA');
    document.getElementById('provider-access-error').textContent = error; if (error) document.getElementById('provider-access-error').focus();
  });
  var form = document.getElementById('provider-login'), email = document.getElementById('provider-email'), password = document.getElementById('provider-password'), problem = document.getElementById('provider-access-error');
  function fail(message) { problem.textContent = message; problem.focus(); }
  if (form && window.NexoraAccounts) form.addEventListener('submit', function (e) {
    e.preventDefault(); problem.textContent = '';
    if (!email.value.trim() || !password.value) { fail('Escribe tu correo y tu contraseña.'); return; }
    window.NexoraAccounts.entrarProveedor(email.value, password.value).then(function (result) {
      if (result.error) { fail(result.error); return; }
      var message = window.NexoraProviderSession.enter(result.id); if (message) fail(message);
    });
  });
  var source = window.NexoraScenarioRead.read('PROV-DEMO-ANDINA');
  document.getElementById('provider-access-state').textContent = source.ok ? 'Escenario disponible. Se conservará intacto al entrar.' : source.code==='missing'?'Al entrar se preparará el escenario demostrativo inicial, sin iniciar una sesión de Comprador.':source.message;
})();
