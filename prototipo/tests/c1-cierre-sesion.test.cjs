require('./helpers/utils-compartidas.cjs');
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {fixture}=require('./helpers/proveedor-fixture.cjs');
const marker='nexora.demoSession';
function environment(){
 const memory=fixture();memory[marker]='comprador';memory['nexora.proveedor.demoSession.v1']='provider-marker';memory['nexora.administrador.demoSession.v1']='admin-marker';memory['nexora.proveedor.demo.v1']='provider-private';memory['nexora.administrador.demo.v1']='admin-private';
 const nodes={},doc={},win={},removed=[],redirects=[];let fail=false,answer=true,confirmations=0,opened=0;
 function node(id){return nodes[id]||(nodes[id]={value:'',innerHTML:'',textContent:'',hidden:true,outerHTML:'',handlers:{},classList:{add(){},remove(){},toggle(){}},getAttribute(){return null;},setAttribute(){},focus(){},contains(){return false;},querySelector(){return {focus(){}};},addEventListener(name,fn){this.handlers[name]=fn;},showModal(){this.open=true;opened++;const pick=answer?'profile-discard-yes':'profile-discard-no';Promise.resolve().then(()=>nodes[pick].onclick());},close(){this.open=false;}});}
 const c={URL,URLSearchParams,Event:function(){},setTimeout:()=>0,clearTimeout(){},console,location:{href:'http://localhost:8000/pages/comprador/perfil.html',pathname:'/pages/comprador/perfil.html',assign:u=>redirects.push(u)},document:{currentScript:{src:'http://localhost:8000/assets/js/demo-session.js'},body:{dataset:{page:'perfil'}},getElementById:node,addEventListener(name,fn){doc[name]=fn;}},sessionStorage:{getItem:k=>memory[k]||null,setItem(k,v){memory[k]=v;},removeItem(k){removed.push(k);if(fail)throw Error('storage');delete memory[k];}},window:{location:{replace:u=>redirects.push(u)},addEventListener(name,fn){win[name]=fn;},dispatchEvent(){}}};vm.createContext(c);
 for(const name of ['assets/js/demo-session.js','assets/js/comprador/datos-demo.js','assets/js/comprador/estado-demo.js'])vm.runInContext(fs.readFileSync(name,'utf8'),c);
 c.window.NexoraUI={esc:v=>String(v),plain:v=>String(v||''),ic:()=>'',buyerHref:s=>s,avatar(){},confirm:async()=>{confirmations++;return answer;}};
 return {c,memory,nodes,node,doc,win,removed,redirects,setFail(v){fail=v;},setAnswer(v){answer=v;},confirmations:()=>confirmations+opened}; // Perfil usa su confirmación corta propia (Fase B); se cuenta igual.
}
(async()=>{
 for(const failed of [false,true]){
  const e=environment(),before={...e.memory};e.setFail(failed);let discarded=0;const result=e.c.window.NexoraDemo.logout(()=>discarded++);
  assert.deepEqual(e.removed,[marker]);
  if(failed){assert.ok(result.includes('No se pudo cerrar'));assert.equal(discarded,0);assert.equal(e.redirects.length,0);assert.equal(e.c.window.NexoraDemo.requireSession(),true);assert.deepEqual(e.memory,before);}
  else{assert.equal(result,'');assert.equal(discarded,1);assert.equal(e.memory[marker],undefined);assert.equal(e.redirects.length,1);assert.ok(e.redirects[0].includes('login.html'));assert.equal(e.c.window.NexoraDemo.requireSession(),false);assert.equal(e.redirects.length,2);for(const [key,value]of Object.entries(before))if(key!==marker)assert.equal(e.memory[key],value,key);}
 }
 // Actual menu handler must prevent default anchor navigation and surface the failure.
 const menu=environment();menu.setFail(true);menu.c.document.currentScript.src='http://localhost:8000/assets/js/comprador/componentes.js?v=test';
 // Skip mounting only, so the real handler can be invoked without a browser DOM.
 const requireSession=menu.c.window.NexoraDemo.requireSession;menu.c.window.NexoraDemo.requireSession=()=>false;
 vm.runInContext(fs.readFileSync('assets/js/comprador/componentes.js','utf8').replace('window.NexoraUI = {','window.__menuC1 = navigateMenu; window.NexoraUI = {'),menu.c);menu.c.window.NexoraDemo.requireSession=requireSession;
 let prevented=false;menu.c.window.__menuC1({preventDefault(){prevented=true;},target:{closest:s=>s==='a[data-k]'?{dataset:{k:'salir'}}:null}});assert.ok(prevented);assert.ok(menu.node('toast').textContent.includes('No se pudo cerrar'));assert.equal(menu.redirects.length,0);assert.equal(menu.memory[marker],'comprador');
 for(const mode of ['cancel','failed','success']){
  const e=environment(),store=e.c.window.NexoraStore,fields=['business','name','businessType','phone','email','description'];fields.forEach(k=>e.node('profile-'+k).value=store.get().user[k]||'');const before={...e.memory};
  vm.runInContext(fs.readFileSync('assets/js/comprador/perfil.js','utf8'),e.c);
  await e.node('profile-panel').handlers.click({target:{closest:s=>s==='#profile-edit'?{}:null}});
  e.node('profile-business').value='Cambio C1 sin guardar';
  let protectedBefore=false;e.win.beforeunload({preventDefault(){protectedBefore=true;}});assert.ok(protectedBefore);
  e.setAnswer(mode!=='cancel');e.setFail(mode==='failed');let stopped=false;
  const link={dataset:{k:'salir'},href:'http://localhost:8000/pages/login.html',getAttribute:()=> '../login.html'};
  await e.doc.click({target:{closest:s=>s==='a[href]'?link:null},preventDefault(){stopped=true;},stopImmediatePropagation(){}});
  assert.ok(stopped);assert.equal(e.confirmations(),1);
  if(mode==='success'){assert.equal(e.memory[marker],undefined);assert.equal(e.redirects.length,1);let blocked=false;e.win.beforeunload({preventDefault(){blocked=true;}});assert.equal(blocked,false);assert.equal(e.c.window.NexoraDemo.requireSession(),false);}
  else{
   assert.equal(e.node('profile-business').value,'Cambio C1 sin guardar');assert.equal(e.redirects.length,0);assert.deepEqual(e.memory,before);let blocked=false;e.win.beforeunload({preventDefault(){blocked=true;}});assert.ok(blocked);assert.equal(e.c.window.NexoraDemo.requireSession(),true);
   if(mode==='cancel')assert.equal(e.removed.length,0);
   else{assert.ok(e.node('profile-status').textContent.includes('Tus cambios siguen'));assert.ok(e.node('profile-status').textContent.includes('No se pudo cerrar')); // Retry recovers without touching persisted profile.
    e.setFail(false);await e.doc.click({target:{closest:s=>s==='a[href]'?link:null},preventDefault(){},stopImmediatePropagation(){}});assert.equal(e.redirects.length,1);assert.equal(e.memory[marker],undefined);
   }
  }
  for(const [key,value]of Object.entries(before))if(key!==marker)assert.equal(e.memory[key],value,key);
 }
 console.log('OK C1: actual logout/menu/profile handlers; successful and failed removal, protected route, active session on failure, explicit error, dirty profile cancellation/preservation/protection, successful retry and no other key changes');
})().catch(e=>{console.error(e);process.exitCode=1;});
