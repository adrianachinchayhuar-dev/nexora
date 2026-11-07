// Simula varias pestañas del mismo navegador: localStorage común, sessionStorage propio y evento `storage`
// solo en las demás pestañas, como en un navegador real. No toca ningún navegador.
const fs=require('node:fs'),vm=require('node:vm');
function almacenamiento(datos,alCambiar=()=>{},opciones={}){
 return {getItem:k=>Object.hasOwn(datos,k)?datos[k]:null,
  setItem(k,v){if(opciones.fallar&&opciones.fallar(k))throw Error('cuota');const anterior=Object.hasOwn(datos,k)?datos[k]:null;datos[k]=String(v);alCambiar(k,String(v),anterior);},
  removeItem(k){const anterior=Object.hasOwn(datos,k)?datos[k]:null;delete datos[k];alCambiar(k,null,anterior);},
  key:i=>Object.keys(datos)[i]??null,get length(){return Object.keys(datos).length;}};
}
function navegador(opciones={}){
 const comun={},pestanas=[];
 function avisar(origen,key,newValue){for(const p of pestanas)if(p!==origen)for(const f of p.oyentes.storage||[])f({key,newValue});}
 function pestana(ruta='pages/comprador/dashboard.html',sesion={}){
  const oyentes={},temporizadores=[],recargas=[];
  const p={oyentes,sesion,temporizadores,recargas,eventos:[]};
  const local=opciones.sinLocal?undefined:almacenamiento(comun,(k,v)=>avisar(p,k,v),opciones);
  const session=almacenamiento(sesion);
  const window={sessionStorage:session,addEventListener(t,f){(oyentes[t]=oyentes[t]||[]).push(f);},dispatchEvent(e){p.eventos.push(e.detail&&e.detail.reason);for(const f of oyentes[e.type]||[])f(e);}};
  if(local)window.localStorage=local;
  if(opciones.localBloqueado)Object.defineProperty(window,'localStorage',{get(){throw Error('bloqueado');}});
  const c={window,sessionStorage:session,Event:function(t){this.type=t;},URL,URLSearchParams,console,setTimeout:f=>{temporizadores.push(f);return temporizadores.length;},clearTimeout(){},
   location:{href:'http://127.0.0.1:8000/'+ruta,pathname:'/'+ruta,search:'',reload(){recargas.push(1);},replace(u){recargas.push(u);},assign(u){recargas.push(u);}},
   document:{currentScript:{src:'http://127.0.0.1:8000/assets/js/x.js?v=t'},body:{dataset:{}},activeElement:null,getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[],addEventListener(t,f){(oyentes['doc:'+t]=oyentes['doc:'+t]||[]).push(f);}}};
  {const {webcrypto}=require('node:crypto');c.crypto=webcrypto;c.TextEncoder=TextEncoder;c.Uint8Array=Uint8Array;c.Promise=Promise;window.crypto=webcrypto;}window.location=c.location;window.document=c.document;window.NEXORA_DEMO_TODAY='2026-10-13';vm.createContext(c);
  p.c=c;p.window=window;
  p.cargar=(...archivos)=>{for(const f of archivos)vm.runInContext(fs.readFileSync('assets/js/'+f,'utf8'),c);return p;};
  p.vaciar=()=>{while(temporizadores.length)temporizadores.shift()();};
  pestanas.push(p);return p;
 }
 return {comun,pestana,pestanas};
}
// Pestaña con la sesión del rol ya abierta.
const BASE=['shared/acceso-roles.js','shared/datos-compartidos.js','shared/cuentas.js'];
function comprador(n,sesion={}){const p=n.pestana('pages/comprador/dashboard.html',sesion).cargar(...BASE,'comprador/datos-demo.js');p.window.NexoraRoleAccess.enter('comprador','comprador');p.cargar('comprador/estado-demo.js');p.store=p.window.NexoraStore;return p;}
function proveedor(n,id='PROV-DEMO-ANDINA',sesion={}){const p=n.pestana('pages/proveedor/dashboard.html',sesion).cargar(...BASE,'shared/proveedores-demo.js','comprador/datos-demo.js','shared/escenario-lectura.js','proveedor/sesion-demo.js','proveedor/estado-demo.js');p.window.NexoraRoleAccess.enter('proveedor',{role:'proveedor',providerId:id});return p;}
function administrador(n,sesion={}){const p=n.pestana('pages/administrador/dashboard.html',sesion).cargar(...BASE,'shared/proveedores-demo.js','comprador/datos-demo.js','shared/escenario-lectura.js','administrador/sesion-demo.js','administrador/escenario-lectura.js','administrador/estado-demo.js');p.window.NexoraRoleAccess.enter('administrador',{role:'administrador',id:'ADMIN-DEMO-NEXORA'});return p;}
module.exports={navegador,comprador,proveedor,administrador};
