/* Acceso ficticio independiente. No es autenticación de producción. */
(function () {
  'use strict';
  var key = 'nexora.administrador.demoSession.v1', id = 'ADMIN-DEMO-NEXORA';
  function current() {
    if(document.body&&document.body.dataset&&document.body.dataset.roleAccess==='required'&&!window.NexoraRoleAccess)return null;
    if(window.NexoraRoleAccess&&window.NexoraRoleAccess.enabled()){var active=window.NexoraRoleAccess.current();return active&&active.role==='administrador'?{id:id,name:'Administración NEXORA (demo)'}:null;}
    try { var s = JSON.parse(sessionStorage.getItem(key) || 'null'); return s && s.role === 'administrador' && s.id === id ? { id: id, name: 'Administración NEXORA (demo)' } : null; }
    catch (e) { return null; }
  }
  function enter(email, password) {
    if(document.body&&document.body.dataset&&document.body.dataset.roleAccess==='required'&&!window.NexoraRoleAccess)return 'No se pudo cargar el acceso por roles. Recarga e inténtalo de nuevo.';
    if (String(email).trim().toLowerCase() !== 'admin@nexora.example' || password !== 'NexoraAdminDemo') return 'Credenciales incorrectas. Utiliza la cuenta administrativa demo indicada.';
    var access=window.NexoraRoleAccess;
    if(access&&access.enabled()){var error=access.enter('administrador',{role:'administrador',id:id});if(error)return error;}
    else try { sessionStorage.setItem(key, JSON.stringify({ role: 'administrador', id: id })); }
    catch (e) { return 'No se pudo iniciar la sesión administrativa. Permite el almacenamiento de sesión e inténtalo nuevamente.'; }
    location.assign(access&&access.enabled()?access.destination('administrador'):'dashboard.html' + location.search); return '';
  }
  function requireSession() { if(window.NexoraRoleAccess&&window.NexoraRoleAccess.enabled()&&!window.NexoraRoleAccess.requireRole('administrador'))return null;var value = current(); if (!value) location.replace('acceso.html' + location.search); return value; }
  function logout() {
    var access=window.NexoraRoleAccess;
    if(access&&access.enabled()){var error=access.logout('administrador');if(error)return 'No se pudo cerrar la sesión administrativa. '+error;}
    else try { sessionStorage.removeItem(key); } catch (e) { return 'No se pudo cerrar la sesión administrativa. La sesión continúa activa; vuelve a intentarlo.'; }
    location.replace('acceso.html' + location.search); return '';
  }
  window.NexoraAdminSession = { current: current, enter: enter, requireSession: requireSession, logout: logout };
})();
