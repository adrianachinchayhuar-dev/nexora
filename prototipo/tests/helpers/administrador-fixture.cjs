const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {fixture,buyerKey}=require('./proveedor-fixture.cjs');
const sessionKey='nexora.administrador.demoSession.v1';
function admin(memory,options={}){
 const writes=[],removed=[],redirects=[],nodes={},handlers={},listeners={};
 function node(id){return nodes[id]||(nodes[id]={innerHTML:'',hidden:true,value:'',validity:{valid:true},focus(){},setAttribute(){},contains(){return false;},classList:{toggle(){},contains(){return false;}},querySelector(){return {focus(){}};},addEventListener(name,fn){handlers[id+':'+name]=fn;}});}
 const c={URL,URLSearchParams,console,location:{href:'http://localhost:8000/pages/administrador/dashboard.html',search:'?revision=test',assign:u=>redirects.push(u),replace:u=>redirects.push(u)},document:{currentScript:{src:'http://localhost:8000/assets/js/administrador/componentes.js?v=test'},getElementById:node,addEventListener(name,fn){listeners[name]=fn;}},window:{innerWidth:1280,addEventListener(name,fn){listeners['window:'+name]=fn;}},sessionStorage:{getItem(k){if(options.failRead)throw Error('read');return memory[k]||null;},setItem(k,v){assert.equal(k,sessionKey);if(options.failWrite)throw Error('write');writes.push(k);memory[k]=v;},removeItem(k){assert.equal(k,sessionKey);if(options.failRemove)throw Error('remove');removed.push(k);delete memory[k];}}};vm.createContext(c);
 for(const f of ['shared/proveedores-demo.js','comprador/datos-demo.js','shared/escenario-lectura.js','administrador/sesion-demo.js','administrador/escenario-lectura.js','administrador/componentes.js'])vm.runInContext(fs.readFileSync('assets/js/'+f,'utf8'),c);
 return {c,nodes,handlers,listeners,writes,removed,redirects,read:c.window.NexoraAdminRead.read};
}

function a2(memory,options={}){const result=admin(memory,options);const old=result.c.sessionStorage.setItem;result.c.sessionStorage.setItem=(k,v)=>{if(k==='nexora.demo.estados.v1'){if(options.failWrite)throw Error('write');result.writes.push(k);memory[k]=v;}else old(k,v);};{const {webcrypto}=require('node:crypto');result.c.TextEncoder=TextEncoder;result.c.Uint8Array=Uint8Array;result.c.Promise=Promise;result.c.crypto=webcrypto;result.c.window.crypto=webcrypto;}vm.runInContext(fs.readFileSync('assets/js/shared/cuentas.js','utf8'),result.c);for(const name of ['estado-demo.js'])vm.runInContext(fs.readFileSync('assets/js/administrador/'+name,'utf8'),result.c);return result;}
module.exports={admin,a2,fixture,buyerKey,sessionKey};
