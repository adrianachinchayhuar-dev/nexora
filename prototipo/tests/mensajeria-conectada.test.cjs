require('./helpers/utils-compartidas.cjs');
const assert=require('node:assert/strict');
const {navegador,comprador,proveedor}=require('./helpers/pestanas.cjs');
const n=navegador(),a=comprador(n),b=proveedor(n);b.cargar('proveedor/mensajes-estado.js');
const id='CONV-DEMO-ACEITE',read=()=>b.window.NexoraScenarioRead.conversations('PROV-DEMO-ANDINA').items.find(c=>c.id===id);
a.store.markConversationRead(id);
a.store.saveMessageDraft(id,'Borrador intacto');
assert.ok(a.store.sendDemoMessage(id,'Consulta conectada').message);
assert.ok(read().messages.some(m=>m.text==='Consulta conectada'&&m.unread));
b.window.NexoraScenarioRead.markRead('PROV-DEMO-ANDINA',id);
assert.ok(!read().messages.some(m=>m.unread));
a.store.saveMessageDraft(id,'No perder lo escrito');
assert.ok(b.window.NexoraProviderMessages.send(id,'Respuesta conectada').message);
a.vaciar();
assert.ok(a.store.conversationMessages(id).some(m=>m.text==='Respuesta conectada'&&m.direction==='received'&&!m.readAt));
assert.equal(a.store.unreadConversations(),1);
assert.equal(a.store.get().messaging.drafts[id],'No perder lo escrito');
a.store.markConversationRead(id);assert.equal(a.store.unreadConversations(),0);
assert.ok(a.eventos.includes('sync'),'storage actualiza sin recargar');
const key='nexora.proveedor.demo.v1';
n.comun[key]=JSON.stringify({version:1,providers:{},messages:[{id:'MP-VIEJO',providerId:'PROV-DEMO-ANDINA',conversationId:id,text:'Anterior',createdAt:'2026-10-13T12:00:00Z'}]});
read();read();a.vaciar();assert.equal(a.store.conversationMessages(id).filter(m=>m.id==='MP-VIEJO').length,1);
assert.ok(n.comun[key].includes('MP-VIEJO'),'Origen conservado');
assert.equal(a.window.NexoraShared.restablecerTodo(),'');
const c=comprador(n);assert.ok(!c.store.get().messaging.messages.some(m=>m.id==='MP-VIEJO'||m.text==='Respuesta conectada'));
console.log('OK: ida, respuesta, lecturas independientes, storage, borrador, migración idempotente y reset');
// Un storage entrante repinta incluso mientras se escribe y conserva selección/foco.
{
 const n=navegador(),a=comprador(n),b=proveedor(n);b.cargar('proveedor/mensajes-estado.js');
 let field={id:'message-text',tagName:'TEXTAREA',value:'Estoy escribiendo',selectionStart:4,selectionEnd:7,focus(){a.c.document.activeElement=this;},setSelectionRange(s,e){this.selectionStart=s;this.selectionEnd=e;}};
 a.c.document.getElementById=id=>id==='message-text'?field:null;a.c.document.activeElement=field;
 a.window.addEventListener('nexora-demo-change',()=>{field={...field,value:'',selectionStart:0,selectionEnd:0};});
 assert.ok(b.window.NexoraProviderMessages.send(id,'Mientras escribes').message);a.vaciar();
 assert.equal(field.value,'Estoy escribiendo');assert.equal(field.selectionStart,4);assert.equal(field.selectionEnd,7);assert.equal(a.c.document.activeElement,field);
 assert.ok(a.store.conversationMessages(id).some(m=>m.text==='Mientras escribes'));
}
