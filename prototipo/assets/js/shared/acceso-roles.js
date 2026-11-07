/* Coordinación demo por pestaña. No es autenticación real ni modifica datos comerciales. */
(function(){
 'use strict';
 var activeKey='nexora.demo.activeRole.v1',scenarioKey='nexora.comprador.demo.v1',blocked=false;
 var keys={comprador:'nexora.demoSession',proveedor:'nexora.proveedor.demoSession.v1',administrador:'nexora.administrador.demoSession.v1'};
 var script=document.currentScript,root=new URL('../../../',script.src),revision=new URL(script.src).searchParams.get('v')||'acceso-roles-2';
 function enabled(){return !window.NexoraScenario;}
 function valid(role,value){return role==='comprador'?value==='comprador':role==='proveedor'?value&&value.role===role&&(['PROV-DEMO-ANDINA','PROV-DEMO-LIMA-SUR'].indexOf(value.providerId)!==-1||/^PROV-[A-Z0-9]{8}$/.test(String(value.providerId))):role==='administrador'&&value&&value.role===role&&value.id==='ADMIN-DEMO-NEXORA';}
 function current(){
  if(blocked)return null;
  try{var s=JSON.parse(sessionStorage.getItem(activeKey)||'null');if(!s||s.version!==1||!keys[s.role])return null;var raw=sessionStorage.getItem(keys[s.role]),value=s.role==='comprador'?raw:JSON.parse(raw||'null');return valid(s.role,value)&&JSON.stringify(value)===JSON.stringify(s.identity)?s:null;}catch(e){return null;}
 }
 function inspectScenario(){
  try{var shared=window.NexoraShared,raw=shared?shared.crudo():sessionStorage.getItem(scenarioKey);if(raw===null)return {missing:true};var state=JSON.parse(raw);if(!window.NexoraScenarioSeed||!window.NexoraScenarioSeed.validate(state))throw Error('schema');return {state:state};}
  catch(e){return {error:'No se pudo leer el escenario o sus datos no son compatibles. Se conserva intacto; no se inicializó ni reemplazó información.'};}
 }
 // A transaction contains only session markers and, when absent, the initial scenario.
 // Roll back exact prior strings on failure; fail closed if storage also prevents recovery.
 function transaction(changes){
  var previous={},done=[];
  try{
   changes.forEach(function(c){previous[c.key]=sessionStorage.getItem(c.key);});
   changes.forEach(function(c){done.push(c.key);if(c.value===null)sessionStorage.removeItem(c.key);else sessionStorage.setItem(c.key,c.value);});
   return '';
  }catch(e){
   var failed=false;done.reverse().forEach(function(k){try{if(previous[k]===null)sessionStorage.removeItem(k);else sessionStorage.setItem(k,previous[k]);}catch(rollback){failed=true;}});
   if(failed)blocked=true;
   return failed?'El almacenamiento impidió completar y recuperar el acceso. No continúes; recarga cuando esté disponible. No se borró el historial.':'No se pudo guardar el acceso. Se conserva la sesión anterior y no se registró la operación.';
  }
 }
 function enter(role,identity){
  if(!valid(role,identity))return 'Identidad demostrativa no válida.';
  var source=inspectScenario();if(source.error)return source.error;
  var changes=[];
  if(source.missing){if(!window.NexoraScenarioSeed)return 'No se pudo cargar la preparación compartida.';if(window.NexoraShared&&window.NexoraShared.activo()){try{window.NexoraShared.asegurar();}catch(e){window.NexoraShared.pasarASoloPestana();}}if(!(window.NexoraShared&&window.NexoraShared.activo()))changes.push({key:scenarioKey,value:JSON.stringify(window.NexoraScenarioSeed.create())});}
  changes.push({key:keys[role],value:role==='comprador'?identity:JSON.stringify(identity)});
  changes.push({key:activeKey,value:JSON.stringify({version:1,role:role,identity:identity})});
  var error=transaction(changes);if(!error)blocked=false;return error;
 }
 function logout(role){
  var active=current();if(!active||active.role!==role)return 'No hay una sesión activa de este rol. Vuelve a su acceso.';
  return transaction([{key:keys[role],value:null},{key:activeKey,value:null}]);
 }
 function report(message){
  window.NexoraAccessBlocked=message;
  function show(){if(!document.getElementById||document.getElementById('role-access-problem'))return;var main=document.querySelector('main');if(!main)return;var box=document.createElement('p');box.id='role-access-problem';box.setAttribute('role','alert');box.textContent=message;main.prepend(box);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',show,{once:true});else show();
 }
 function destination(role){return new URL('pages/'+role+'/dashboard.html?revision='+encodeURIComponent(revision),root).href;}
 function requireRole(role){
  var s=current();if(s&&s.role===role){
   if(window.NexoraScenarioSeed){var source=inspectScenario();if(source.error||source.missing){report(source.error||'No existe un escenario disponible. Regresa al acceso de tu rol para prepararlo.');return false;}}
   return true;
  }
  var route=role==='comprador'?'pages/login.html':'pages/'+role+'/acceso.html';
  window.location.replace(new URL(route+'?revision='+encodeURIComponent(revision),root).href);return false;
 }
 window.NexoraRoleAccess=Object.freeze({enabled:enabled,current:current,enter:enter,logout:logout,requireRole:requireRole,inspectScenario:inspectScenario,destination:destination});
 // Restored pages must never remain visible after another role became active.
 window.addEventListener('pageshow',function(){
  if(!enabled())return;var path=window.location.pathname,match=path.match(/\/pages\/(comprador|proveedor|administrador)\/(?!(?:acceso|registro)\.html)[^/]+\.html$/);
  if(match)requireRole(match[1]);
 });
})();
