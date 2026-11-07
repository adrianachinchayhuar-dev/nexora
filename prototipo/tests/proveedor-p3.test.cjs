require('./helpers/utils-compartidas.cjs');
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {fixture,supplier,buyerKey}=require('./helpers/proveedor-fixture.cjs');
const andina='PROV-DEMO-ANDINA',lima='PROV-DEMO-LIMA-SUR',key='nexora.proveedor.demo.v1',session='nexora.proveedor.demoSession.v1';
const memory=fixture(),original=memory[buyerKey];
function open(id=andina,options={}){memory[session]=JSON.stringify({role:'proveedor',providerId:id});return supplier(memory,options);}
let p=open(),store=p.c.window.NexoraProviderState;store.saveDraft('op1',6.2,'Conservar');const drafts=JSON.parse(memory[key]).drafts;
let h=p.c.window.NexoraScenarioRead.conversations(andina);assert.ok(h.ok);assert.equal(h.items.length,1);assert.ok(h.items[0].messages.some(m=>m.text==='PRIVATE-CONVERSATION'));assert.equal(p.c.window.NexoraScenarioRead.conversations(lima).items.length,0);assert.ok(!JSON.stringify(h).includes('PRIVATE-PERSON'));assert.ok(!JSON.stringify(h).includes('readAt'));assert.equal(memory[buyerKey],original);
const old=store.profile().value;assert.equal(old.providerId,andina);assert.equal(old.email,'');
const value={name:'Andina Prueba',businessType:'Distribución demo',contact:'Responsable ficticio',phone:'',email:'contacto@demo.pe',description:'Datos demo',providerId:lima};
assert.ok(store.saveProfile(value).value);assert.equal(store.profile().value.providerId,andina);assert.equal(open().c.window.NexoraProviderState.profile().value.name,'Andina Prueba');
assert.deepEqual(JSON.parse(memory[key]).drafts,drafts);assert.equal(open(lima).c.window.NexoraProviderState.profile().value.name,'Mayorista Lima Sur (demo)');p=open();store=p.c.window.NexoraProviderState;
for(const patch of [{name:''},{email:'incorrecto'},{phone:'abc'},{description:'x'.repeat(501)}]){const raw=memory[key];assert.ok(store.saveProfile({...value,...patch}).error);assert.equal(memory[key],raw);}
const beforeFailure=memory[key];const failure=open(andina,{failWrite:true});assert.ok(failure.c.window.NexoraProviderState.saveProfile({...value,name:'No guardar'}).error);assert.equal(memory[key],beforeFailure);assert.equal(failure.c.window.NexoraProviderState.profile().value.name,'Andina Prueba');
// Actual profile controller: cancel, rejected discard, navigation guard and submit.
p=open();const events={},docEvents={},windowEvents={};p.c.document.addEventListener=(type,fn)=>docEvents[type]=fn;p.c.window.addEventListener=(type,fn)=>windowEvents[type]=fn;p.c.document.querySelector=()=>null;
const fields=['name','businessType','contact','phone','email','description'];
for(const id of ['provider-profile-form','profile-status','profile-id','profile-cancel','profile-edit','profile-continue','profile-discard',...fields.map(f=>'profile-'+f)]){const n=p.c.document.getElementById(id);n.value='';n.addEventListener=(type,fn)=>events[id+':'+type]=fn;}
p.c.window.NexoraProviderUI.start=render=>render(p.read(andina),andina);p.c.window.confirm=()=>false;
vm.runInContext(fs.readFileSync('assets/js/proveedor/perfil.js','utf8'),p.c);
assert.ok(!p.nodes['provider-content'].innerHTML.includes('profile-id'));assert.ok(p.nodes['provider-content'].innerHTML.includes('Tu nombre (opcional)'));assert.ok(p.nodes['provider-content'].innerHTML.includes('¿Qué pasa ahora?'));
assert.ok(p.nodes['provider-content'].innerHTML.includes('id="pf-editor" hidden'));events['profile-edit:click']();assert.equal(p.nodes['pf-editor'].hidden,false);assert.equal(p.nodes['pf-details'].hidden,true);
p.nodes['profile-name'].value='Pendiente';events['provider-profile-form:input']();let prevented=false;docEvents.click({target:{closest:()=>({})},preventDefault(){prevented=true;},stopImmediatePropagation(){}});assert.ok(prevented);events['profile-cancel:click']();assert.equal(p.nodes['profile-name'].value,'Pendiente');
let unload=false;windowEvents.beforeunload({preventDefault(){unload=true;}});assert.ok(unload);
assert.equal(p.nodes['profile-discard-panel'].hidden,false);events['profile-continue:click']();assert.equal(p.nodes['profile-name'].value,'Pendiente');assert.equal(p.nodes['profile-discard-panel'].hidden,true);const raw=memory[key];events['profile-cancel:click']();events['profile-discard:click']();assert.equal(memory[key],raw);assert.equal(p.nodes['profile-name'].value,'Andina Prueba');assert.equal(p.nodes['pf-editor'].hidden,true);assert.equal(p.nodes['pf-details'].hidden,false);
p.nodes['profile-name'].value='Andina Guardada';events['provider-profile-form:input']();events['provider-profile-form:submit']({preventDefault(){}});assert.equal(p.c.window.NexoraProviderState.profile().value.name,'Andina Guardada');assert.ok(p.nodes['profile-status'].textContent.includes('guardado'));assert.deepEqual(JSON.parse(memory[key]).drafts,drafts);
// Actual messages renderer, empty and foreign data rejection.
for(const id of [andina,lima]){const q=open(id);q.c.window.NexoraProviderUI.start=render=>render(q.read(id),id);vm.runInContext(fs.readFileSync('assets/js/proveedor/mensajes.js','utf8'),q.c);const html=q.nodes['provider-content'].innerHTML;if(id===andina){assert.ok(html.includes('PRIVATE-CONVERSATION'));assert.ok(html.includes('detalle-oportunidad.html?id=op1'));}else{assert.ok(html.includes('No tienes conversaciones'));assert.ok(!html.includes('PRIVATE-CONVERSATION'));}assert.equal(q.writes.length,0);}
assert.equal(memory[buyerKey],original);assert.deepEqual(JSON.parse(memory[key]).drafts,drafts);
console.log('OK P3: own/foreign/empty read-only messages, no auto creation or read updates, profile identity immutable, validation, persistence/isolation, atomic storage failure, actual cancel/navigation/unload guards, preserved P2 drafts and buyer bytes');
// A populated foreign conversation must never leak into Andina's projection.
const foreignMemory=fixture(),foreignState=JSON.parse(foreignMemory[buyerKey]);
foreignState.messaging.conversations.push({id:'CONV-LIMA-ONLY',opportunityId:'op2',createdAt:'2026-10-13T12:00:00Z',businessId:'NEG-DEMO-ROSITA'});
foreignState.messaging.messages.push({id:'MSG-LIMA-ONLY',conversationId:'CONV-LIMA-ONLY',text:'ONLY-LIMA-PRIVATE',direction:'sent',createdAt:'2026-10-13T12:00:00Z'});
foreignMemory[buyerKey]=JSON.stringify(foreignState);const foreignRaw=foreignMemory[buyerKey];const projection=supplier(foreignMemory);
assert.ok(!JSON.stringify(projection.c.window.NexoraScenarioRead.conversations(andina)).includes('ONLY-LIMA-PRIVATE'));
assert.ok(JSON.stringify(projection.c.window.NexoraScenarioRead.conversations(lima)).includes('ONLY-LIMA-PRIVATE'));
assert.equal(foreignMemory[buyerKey],foreignRaw);assert.equal(projection.writes.length,0);
console.log('OK P3: populated foreign conversation isolated by provider association');
