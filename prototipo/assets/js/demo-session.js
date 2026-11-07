/* Convención de navegación del prototipo. No es autenticación ni seguridad. */
(function () {
  'use strict';
  var key = 'nexora.demoSession';
  var script = document.currentScript;
  var root = new URL('../../', script.src);
  var login = new URL('pages/login.html', root).href;
  if(window.NexoraRoleAccess&&window.NexoraRoleAccess.enabled())login=new URL('pages/login.html?revision='+encodeURIComponent(new URL(script.src).searchParams.get('v')||'acceso-roles-2'),root).href;
  var dashboard = new URL('pages/comprador/dashboard.html', root).href;
  // ── Cuentas simuladas: solo en este navegador. ──
  // La contraseña nunca se guarda en texto plano: se guarda sal + hash SHA-256 (crypto.subtle).
  // En el MVP esto será BCrypt en el servidor; aquí es solo una simulación para la demo.
  var accountsKey = 'nexora.demo.cuentas.v1', activeAccountKey = 'nexora.demo.cuentaActiva.v1', scenarioKey = 'nexora.comprador.demo.v1', welcomeKey = 'nexora.comprador.bienvenida';
  var BAD = 'Credenciales incorrectas. Usa la cuenta demo indicada arriba.';
  function readAccounts() { try { var list = JSON.parse(localStorage.getItem(accountsKey) || '[]'); return Array.isArray(list) ? list : []; } catch (error) { return []; } }
  function sha256(text) {
    if (!window.crypto || !window.crypto.subtle) return Promise.reject(new Error('crypto'));
    return window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)).then(function (buf) { return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join(''); });
  }
  function randomHex(n) { var a = new Uint8Array(n); window.crypto.getRandomValues(a); return Array.prototype.map.call(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join(''); }
  // Deja listo el negocio con el que se entra: la cuenta nueva o la demo. Lo compartido nunca se borra al cambiar de cuenta;
  // solo en modo pestaña, donde el escenario es de un negocio, se prepara de nuevo si es de otro.
  function activate(account) {
    try {
      var wanted = account ? account.id : 'NEG-DEMO-ROSITA', compartido = window.NexoraShared && window.NexoraShared.activo(), raw = compartido ? null : sessionStorage.getItem(scenarioKey);
      if (account) sessionStorage.setItem(activeAccountKey, JSON.stringify({ id: account.id, business: account.business, name: account.name, phone: account.phone, email: account.email, distrito: account.distrito, district: account.distrito, zona: account.zona, zoneId: account.zona, direccion: account.direccion }));
      else sessionStorage.removeItem(activeAccountKey);
      if (raw) { var st = JSON.parse(raw); if (st && st.user && st.user.id !== wanted) sessionStorage.removeItem(scenarioKey); }
    } catch (error) { return account ? 'No se pudo preparar tu cuenta en este navegador. Permite el almacenamiento de sesión e inténtalo de nuevo.' : ''; }
    return '';
  }
  // D6: el admin puede suspender a un comprador; al entrar ve el aviso y no pasa.
  function suspension(id) {
    var cuentas = window.NexoraAccounts; if (!cuentas) return '';
    var e = cuentas.estadoDe(id); if (e.estado !== 'suspendida') return '';
    return 'Tu cuenta está suspendida.' + (e.motivo ? ' Motivo: ' + e.motivo + '.' : '') + ' Escribe al equipo de NEXORA para reactivarla.';
  }
  function openSession() {
      var access=window.NexoraRoleAccess;
      if(access&&access.enabled()){var problem=access.enter('comprador','comprador');if(problem)return problem;}
      else try {
        sessionStorage.setItem(key, 'comprador');
      } catch (error) {
        return 'No se pudo activar la sesión demo. Permite el almacenamiento de sesión y abre el prototipo con el servidor local.';
      }
      window.location.assign(access&&access.enabled()?access.destination('comprador'):dashboard);
      return '';
  }
  window.NexoraDemo = {
    // Devuelve '' o un mensaje (cuenta demo) o una promesa con lo mismo (cuentas creadas).
    enter: function (email, password) {
      if(document.body&&document.body.dataset&&document.body.dataset.roleAccess==='required'&&!window.NexoraRoleAccess)return 'No se pudo cargar el acceso por roles. Recarga e inténtalo de nuevo.';
      if (email.trim().toLowerCase() === 'demo@nexora.example' && password === 'NexoraDemo') { var bloqueo = suspension('NEG-DEMO-ROSITA'); if (bloqueo) return bloqueo; activate(null); return openSession(); }
      var account = readAccounts().filter(function (a) { return a.email === email.trim().toLowerCase(); })[0];
      if (!account) return BAD;
      return sha256(account.salt + password).then(function (hash) { if (hash !== account.hash) return BAD; var bloqueo = suspension(account.id); if (bloqueo) return bloqueo; var problem = activate(account); return problem || openSession(); }, function () { return 'Este navegador no permite verificar la contraseña. Usa la cuenta demo.'; });
    },
    crearCuenta: function (d) {
      var email = String(d.email || '').trim().toLowerCase();
      if (email === 'demo@nexora.example' || readAccounts().some(function (a) { return a.email === email; })) return 'Ya existe una cuenta con ese correo. Inicia sesión.';
      var salt;
      try { salt = randomHex(8); } catch (error) { return 'Este navegador no permite crear la cuenta de la demo.'; }
      return sha256(salt + d.password).then(function (hash) {
        var account = { id: 'NEG-CUENTA-' + randomHex(4), email: email, salt: salt, hash: hash, business: d.business, name: d.name, phone: d.phone, distrito: d.distrito, zona: d.zona, direccion: d.direccion, creada: new Date().toISOString() };
        try { localStorage.setItem(accountsKey, JSON.stringify(readAccounts().concat([account]))); } catch (error) { return 'No se pudo guardar la cuenta en este navegador. Permite el almacenamiento local.'; }
        var problem = activate(account); if (problem) return problem;
        try { localStorage.removeItem(welcomeKey); } catch (error) { /* la bienvenida es opcional */ }
        return openSession();
      }, function () { return 'Este navegador no permite crear la cuenta de la demo.'; });
    },
    suspension: suspension,
    requireSession: function () {
      var activo = window.NexoraShared && window.NexoraShared.negocioActivo ? window.NexoraShared.negocioActivo() : 'NEG-DEMO-ROSITA', bloqueo = suspension(activo);
      if (bloqueo) { try { sessionStorage.setItem('nexora.demo.suspendida', bloqueo); } catch (error) { /* el aviso es opcional */ } if (window.NexoraRoleAccess && window.NexoraRoleAccess.enabled()) window.NexoraRoleAccess.logout('comprador'); window.location.replace(login); return false; }
      if(document.body&&document.body.dataset&&document.body.dataset.roleAccess==='required'&&!window.NexoraRoleAccess){window.location.replace(login);return false;}
      if(window.NexoraRoleAccess&&window.NexoraRoleAccess.enabled())return window.NexoraRoleAccess.requireRole('comprador');
      try {
        if (sessionStorage.getItem(key) === 'comprador') return true;
      } catch (error) { /* Sin almacenamiento, volver al acceso demo. */ }
      window.location.replace(login);
      return false;
    },
    logout: function (beforeRedirect) {
      var access=window.NexoraRoleAccess;
      if(access&&access.enabled()){var error=access.logout('comprador');if(error)return 'No se pudo cerrar la sesión. '+error;}
      else try { sessionStorage.removeItem(key); }
      catch (error) { return 'No se pudo cerrar la sesión. La sesión continúa activa. Inténtalo nuevamente.'; }
      if (typeof beforeRedirect === 'function') beforeRedirect();
      window.location.replace(login);
      return '';
    }
  };
  // Al volver con el historial, no reabrir el dashboard después de salir.
  // En vivo: si el admin suspende esta cuenta, la pestaña sale al acceso.
  window.addEventListener('nexora-demo-change', function () { if (document.getElementById('side')) window.NexoraDemo.requireSession(); });
  // En el acceso: muestra por qué no se pudo entrar.
  if (document.addEventListener) document.addEventListener('DOMContentLoaded', function () {
    var aviso = ''; try { aviso = sessionStorage.getItem('nexora.demo.suspendida') || ''; sessionStorage.removeItem('nexora.demo.suspendida'); } catch (error) { /* sin aviso */ }
    var m = aviso && document.getElementById('v-login') && document.querySelector('#v-login .msg'); if (m) { m.textContent = aviso; m.style.display = 'block'; }
  });
  window.addEventListener('pageshow', function () {
    if (document.getElementById('side')) window.NexoraDemo.requireSession();
  });
})();
