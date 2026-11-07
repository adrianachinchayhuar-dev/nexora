require('./helpers/utils-compartidas.cjs');
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {fixture,supplier,buyerKey}=require('./helpers/proveedor-fixture.cjs');
const providerId='PROV-DEMO-ANDINA',key='nexora.proveedor.demo.v1',sessionKey='nexora.proveedor.demoSession.v1';
function setup(){const memory=fixture();memory[sessionKey]=JSON.stringify({role:'proveedor',providerId});const p=supplier(memory);return {memory,p,store:p.c.window.NexoraProviderState};}
{
 const {memory,p,store}=setup(),buyer=memory[buyerKey];store.saveDraft('op1',6.2,'Conservar P2');const drafts=JSON.stringify(JSON.parse(memory[key]).drafts);
 const input={name:'Distribuidora Andina (demo)',businessType:'Distribuidor',contact:'',email:'',description:''};
 for(const phone of ['', '987654321','+51 987 654 321','(01) 234-5678','123456']){const result=store.saveProfile({...input,phone});assert.ok(result.value,phone);assert.equal(result.value.phone,phone);assert.equal(supplier(memory).c.window.NexoraProviderState.profile().value.phone,phone);}
 for(const phone of ['------','      ','+ ( ) -','++++++','abc123','12345','1'.repeat(26)]){const before=memory[key];const result=store.saveProfile({...input,phone});assert.ok(result.error,JSON.stringify(phone));assert.ok(result.error.length > 0);assert.equal(memory[key],before);}
 assert.equal(memory[buyerKey],buyer);assert.equal(JSON.stringify(JSON.parse(memory[key]).drafts),drafts);
}
for(const failed of [true,false]){
 const {memory,p,store}=setup(),buyer=memory[buyerKey];store.saveDraft('op1',6.2,'Conservar');store.saveProfile({name:'Andina guardada',businessType:'Distribuidor',phone:''});const privateBefore=memory[key];
 const handlers={},documents={},windows={};
 p.c.document.addEventListener=(name,fn)=>{documents[name]=fn;};p.c.window.addEventListener=(name,fn)=>{windows[name]=fn;};p.c.document.querySelector=()=>null;
 for(const id of ['provider-open','provider-close','provider-scrim','provider-logout','provider-profile-form','profile-cancel','profile-id','profile-name','profile-businessType','profile-contact','profile-phone','profile-email','profile-description','profile-status','provider-session-error']){const n=p.c.document.getElementById(id);n.value='';n.addEventListener=(name,fn)=>{handlers[id+':'+name]=fn;};}
 p.c.window.NexoraProviderUI.mount(providerId);
 p.c.window.NexoraProviderUI.start=render=>render(p.read(providerId),providerId);p.c.window.confirm=()=>false;
 vm.runInContext(fs.readFileSync('assets/js/proveedor/perfil.js','utf8'),p.c);
 p.nodes['profile-name'].value='NO GUARDADO';handlers['provider-profile-form:input']();
 let stopped=false;documents.click({target:{closest:()=>({})},preventDefault(){stopped=true;},stopImmediatePropagation(){}});assert.ok(stopped);assert.equal(p.nodes['profile-name'].value,'NO GUARDADO');
 let protectedBefore=false;windows.beforeunload({preventDefault(){protectedBefore=true;}});assert.ok(protectedBefore);
 p.c.window.confirm=()=>true;
 documents.click({target:{closest:()=>({})},preventDefault(){throw Error('unexpected stop');},stopImmediatePropagation(){}});
 assert.equal(p.nodes['profile-name'].value,'Andina guardada');assert.ok(p.nodes['profile-status'].textContent.includes('descartados'));
 if(failed)p.c.sessionStorage.removeItem=()=>{throw Error('storage failure');};
 handlers['provider-logout:click']();
 assert.equal(memory[key],privateBefore);assert.equal(memory[buyerKey],buyer);
 if(failed){assert.equal(p.c.window.NexoraProviderSession.current(),providerId);assert.equal(p.redirects.length,0);assert.equal(p.nodes['provider-session-error'].hidden,false);assert.ok(p.nodes['provider-session-error'].textContent.includes('No se pudo cerrar'));assert.ok(!p.nodes['profile-status'].textContent.includes('sesión cerrada'));
  // Restored fields are clean, and any subsequent edit regains protection.
  let clean=false;windows.beforeunload({preventDefault(){clean=true;}});assert.equal(clean,false);
  p.nodes['profile-name'].value='OTRO CAMBIO';handlers['provider-profile-form:input']();let protectedAgain=false;windows.beforeunload({preventDefault(){protectedAgain=true;}});assert.ok(protectedAgain);
 }else{assert.equal(memory[sessionKey],undefined);assert.equal(p.redirects.length,1);assert.ok(p.redirects[0].startsWith('acceso.html'));let blocked=false;windows.beforeunload({preventDefault(){blocked=true;}});assert.equal(blocked,false);}
 // Reload reads the saved profile, never the discarded text, and keeps all drafts.
 memory[sessionKey]=JSON.stringify({role:'proveedor',providerId});assert.equal(supplier(memory).c.window.NexoraProviderState.profile().value.name,'Andina guardada');assert.equal(memory[key],privateBefore);
}
console.log('OK P4: optional/valid/invalid/whitespace phones, unchanged valid formats; actual capture guard + logout handler for failed/successful closure, rejected discard, coherent restore, renewed edit protection, reload and buyer/P2/P3 preservation');
