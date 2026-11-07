(function () {
  'use strict';
  var key = 'nexora.proveedor.demoSession.v1', AVISO = 'nexora.proveedor.aviso.v1';
  function current() {
    if(document.body&&document.body.dataset&&document.body.dataset.roleAccess==='required'&&!window.NexoraRoleAccess)return null;
    if(window.NexoraRoleAccess&&window.NexoraRoleAccess.enabled()){var s=window.NexoraRoleAccess.current();return s&&s.role==='proveedor'?s.identity.providerId:null;}
    try { var value = JSON.parse(sessionStorage.getItem(key) || 'null'); return value && value.role === 'proveedor' && window.NexoraProviders.byId(value.providerId) ? value.providerId : null; } catch (error) { return null; }
  }
  // Solo una cuenta aprobada entra al dashboard, al catálogo, a los precios y a los mensajes.
  function estadoPropio(id) { var cuentas = window.NexoraAccounts; return cuentas ? cuentas.estadoDe(id).estado : 'aprobada'; }
  function enCuenta() { return /\/cuenta\.html$/.test(location.pathname || ''); }
  function enter(id) {
    if(document.body&&document.body.dataset&&document.body.dataset.roleAccess==='required'&&!window.NexoraRoleAccess)return 'No se pudo cargar el acceso por roles. Recarga e inténtalo de nuevo.';
    if (!window.NexoraProviders.byId(id)) return 'Proveedor demostrativo no disponible.';
    var access=window.NexoraRoleAccess;
    if(access&&access.enabled()){var error=access.enter('proveedor',{role:'proveedor',providerId:id});if(error)return error;}
    else try { sessionStorage.setItem(key, JSON.stringify({ role: 'proveedor', providerId: id })); } catch (error) { return 'No se pudo iniciar la sesión proveedor. Permite sessionStorage e inténtalo nuevamente.'; }
    location.assign(estadoPropio(id) !== 'aprobada' ? 'cuenta.html' + location.search : access&&access.enabled()?access.destination('proveedor'):'dashboard.html' + location.search); return '';
  }
  function requireSession() { if(window.NexoraRoleAccess&&window.NexoraRoleAccess.enabled()&&!window.NexoraRoleAccess.requireRole('proveedor'))return null;var id = current(); if (!id) { location.replace('acceso.html' + location.search); return id; } if (estadoPropio(id) !== 'aprobada') { if (!enCuenta()) location.replace('cuenta.html' + location.search); return null; } return id; }
  // Para la pantalla de estado: basta con tener la sesión, sin importar el estado.
  function requireAccount() { if(window.NexoraRoleAccess&&window.NexoraRoleAccess.enabled()&&!window.NexoraRoleAccess.requireRole('proveedor'))return null;var id = current(); if (!id) location.replace('acceso.html' + location.search); return id; }
  function logout() { var access=window.NexoraRoleAccess;if(access&&access.enabled()){var error=access.logout('proveedor');if(error)return 'No se pudo cerrar la sesión proveedor. '+error;}else try { sessionStorage.removeItem(key); } catch (error) { return 'No se pudo cerrar la sesión proveedor. Inténtalo nuevamente.'; } location.replace('acceso.html' + location.search); return ''; }
  window.NexoraProviderSession = { current: current, enter: enter, requireSession: requireSession, requireAccount: requireAccount, estado: function () { var id = current(); return id ? estadoPropio(id) : null; }, aviso: AVISO, logout: logout };
  // En vivo: lo que decide el admin se aplica en esta pestaña sin recargar.
  window.addEventListener('nexora-demo-change', function () {
    var id = current(); if (!id) return; var estado = estadoPropio(id);
    if (enCuenta()) { if (estado === 'aprobada') { try { sessionStorage.setItem(AVISO, 'aprobada'); } catch (error) { /* el aviso es opcional */ } location.replace('dashboard.html' + location.search); } }
    else if (estado !== 'aprobada') location.replace('cuenta.html' + location.search);
  });
})();
