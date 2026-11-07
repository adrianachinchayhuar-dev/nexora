require('./helpers/utils-compartidas.cjs');
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {fixture,supplier,buyerKey}=require('./helpers/proveedor-fixture.cjs');
const memory=fixture(),raw=JSON.parse(memory[buyerKey]);
// Synthetic test-only fixture: not added to the running demo or any browser session.
raw.messaging.conversations.push({id:'TEST-EMPTY-VASOS',opportunityId:'op3',createdAt:'2026-10-22T01:30:00Z'});
raw.messaging.conversations.push({id:'TEST-FOREIGN',opportunityId:'op2',createdAt:'2026-10-22T01:30:00Z'});
raw.messaging.messages.push({id:'TEST-FOREIGN-MESSAGE',conversationId:'TEST-FOREIGN',direction:'sent',text:'FOREIGN-MESSAGE-SECRET',createdAt:'2026-10-22T01:30:00Z'});
raw.messaging.messages[0].createdAt='2026-10-22T01:30:00Z';memory[buyerKey]=JSON.stringify(raw);memory['nexora.proveedor.demo.v1']='PRIVATE-PROVIDER-STATE';memory['nexora.administrador.demo.v1']='PRIVATE-ADMIN-STATE';const before=JSON.stringify(memory);
const p=supplier(memory,{page:'mensajes.html',rolePage:'mensajes'});const ui=p.c.window.NexoraProviderUI;let renders;
ui.start=render=>{renders=render;render(p.read('PROV-DEMO-ANDINA'),'PROV-DEMO-ANDINA');};
vm.runInContext(fs.readFileSync('assets/js/proveedor/mensajes.js','utf8'),p.c);
const root=p.nodes['provider-content'];assert.ok(root.innerHTML.includes('provider-mailbox'));assert.ok(root.innerHTML.includes('PRIVATE-CONVERSATION'));assert.ok(root.innerHTML.includes('21 oct'));assert.ok(!root.innerHTML.includes(' · Lima'));assert.ok(!root.innerHTML.includes('Conversación CONV-'));assert.ok(root.innerHTML.includes('¿Qué pasa ahora?'));assert.ok(!root.innerHTML.includes('FOREIGN-MESSAGE-SECRET'));assert.ok(root.innerHTML.includes('id="ms-message"'));assert.ok(root.innerHTML.includes('Mensajes de la demo · conectados con el comprador'));assert.equal((root.innerHTML.match(/aria-pressed="true"/g)||[]).length,1);
const originalTexts=raw.messaging.messages.filter(m=>m.conversationId==='CONV-DEMO-ACEITE').map(m=>m.text);for(const text of originalTexts)assert.ok(root.innerHTML.includes(ui.esc(text)));
const thread=p.c.document.getElementById('provider-thread'),list=p.c.document.getElementById('provider-conversation-list'),heading=p.c.document.getElementById('provider-thread-heading');let focus=0;heading.focus=()=>focus++;
function select(id){root.onclick({target:{closest:()=>({dataset:{providerConversation:id}})}});}
select('TEST-EMPTY-VASOS');assert.ok(thread.innerHTML.includes('Vasos descartables'));assert.ok(thread.innerHTML.includes('Aún no hay mensajes'));assert.ok(thread.innerHTML.includes('detalle-oportunidad.html?id=op3'));assert.ok(!thread.innerHTML.includes('PRIVATE-CONVERSATION'));assert.equal(focus,1);assert.equal((list.innerHTML.match(/aria-pressed="true"/g)||[]).length,1);
const selectedThread=thread.innerHTML;select('TEST-FOREIGN');assert.equal(thread.innerHTML,selectedThread);select('NO-ID');assert.equal(thread.innerHTML,selectedThread);select('TEST-EMPTY-VASOS');assert.equal(focus,1);
select('CONV-DEMO-ACEITE');for(const text of originalTexts)assert.ok(thread.innerHTML.includes(ui.esc(text)));assert.ok(thread.innerHTML.includes('datetime="2026-10-22T01:30:00Z"'));assert.ok(thread.innerHTML.includes('21 oct'));assert.ok(!thread.innerHTML.includes('20:30'));assert.ok(!thread.innerHTML.includes('8:30'));assert.equal(focus,2);
// A normal refresh keeps a valid selection without storing it; a different provider cannot retain it.
select('TEST-EMPTY-VASOS');renders(p.read('PROV-DEMO-ANDINA'),'PROV-DEMO-ANDINA');assert.ok(root.innerHTML.includes('Vasos descartables'));renders(p.read('PROV-DEMO-LIMA-SUR'),'PROV-DEMO-LIMA-SUR');assert.ok(root.innerHTML.includes('FOREIGN-MESSAGE-SECRET'));assert.ok(!root.innerHTML.includes('PRIVATE-CONVERSATION'));
assert.equal(JSON.stringify(memory),before);assert.equal(p.writes.length,0);assert.equal(p.removals.length,0);
const empty=supplier(fixture());empty.c.window.NexoraProviderUI.start=render=>render(empty.read('PROV-DEMO-LIMA-SUR'),'PROV-DEMO-LIMA-SUR');vm.runInContext(fs.readFileSync('assets/js/proveedor/mensajes.js','utf8'),empty.c);assert.ok(empty.nodes['provider-content'].innerHTML.includes('No tienes conversaciones'));
const bad=supplier(fixture());bad.c.window.NexoraProviderUI.start=render=>render({ok:false,message:'Error de lectura'},'PROV-DEMO-ANDINA');vm.runInContext(fs.readFileSync('assets/js/proveedor/mensajes.js','utf8'),bad.c);assert.ok(bad.nodes['provider-content'].innerHTML.includes('Error de lectura'));
const css=fs.readFileSync('assets/css/proveedor/proveedor.css','utf8').split('/* C3.1:')[1];assert.ok(css.includes('[data-page="mensajes"]'));assert.ok(css.includes('@media(max-width:760px)'));assert.ok(css.includes('grid-template-columns:minmax(0,1fr)'));
console.log('OK C3.1: actual inbox selection, original messages/text preserved, empty conversation/history and read errors, Lima date rollover, selected state/focus, foreign IDs rejected and zero storage writes');
