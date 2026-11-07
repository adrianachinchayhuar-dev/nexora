require('./helpers/utils-compartidas.cjs');
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {fixture,supplier,buyerKey}=require('./helpers/proveedor-fixture.cjs');
const andina='PROV-DEMO-ANDINA',lima='PROV-DEMO-LIMA-SUR',key='nexora.proveedor.demo.v1',sessionKey='nexora.proveedor.demoSession.v1';
const memory=fixture(),original=memory[buyerKey];
function open(id=andina,options={}){memory[sessionKey]=JSON.stringify({role:'proveedor',providerId:id});return supplier(memory,options);}
let p=open(),s=p.c.window.NexoraProviderState;
assert.deepEqual(Array.from(s.drafts().items),[]);
let d=s.saveDraft('op1','7,25','Oferta solo demostrativa').draft;
assert.equal(d.price,7.25);assert.equal(d.published,false);assert.equal(d.productId,'aceite');
const first=JSON.parse(JSON.stringify(d));
d=s.saveDraft('op1','7.10','Editada').draft;assert.equal(d.id,first.id);assert.equal(d.createdAt,first.createdAt);assert.equal(d.price,7.1);assert.equal(s.drafts().items.length,1);
s.saveFilters(andina,{search:'aceite'});assert.equal(s.drafts().items[0].price,7.1);
p=open();s=p.c.window.NexoraProviderState;assert.equal(s.drafts().items[0].observation,'Editada');assert.equal(s.filters(andina).search,'aceite');
for(const value of ['',0,-1,'abc','Infinity','1e2','5.123','S/ 6','1,2,3']){const before=memory[key];assert.ok(s.saveDraft('op1',value,'').error,value);assert.equal(memory[key],before);}
assert.ok(s.saveDraft('op1',5,'x'.repeat(501)).error);
assert.ok(s.saveDraft('op2',5,'').error);assert.ok(s.saveDraft('missing',5,'').error);
const beforeFailure=memory[key];const failure=open(andina,{failWrite:true});assert.ok(failure.c.window.NexoraProviderState.saveDraft('op1',9,'error').error);assert.equal(memory[key],beforeFailure);assert.equal(failure.c.window.NexoraProviderState.drafts().items[0].price,7.1);
p=open(lima);s=p.c.window.NexoraProviderState;assert.equal(s.drafts().items.length,0);assert.ok(s.saveDraft('op1',6,'').error);assert.ok(s.saveDraft('op4',6,'').error);assert.ok(s.saveDraft('op2',6,'Privada Lima').draft);assert.equal(s.drafts().items.length,1);
p=open();s=p.c.window.NexoraProviderState;assert.equal(s.drafts().items.length,1);assert.equal(s.drafts().items[0].opportunityId,'op1');
// Simulate closing the source after opening editor: save checks the current source again.
const source=JSON.parse(memory[buyerKey]);source.opps.find(o=>o.id==='op1').status='cerrada';memory[buyerKey]=JSON.stringify(source);const beforeClosed=memory[key];assert.ok(s.saveDraft('op1',6,'').error);assert.equal(memory[key],beforeClosed);assert.equal(s.drafts().items[0].price,7.1);memory[buyerKey]=original;
// Execute actual editor handlers: cancel/discard must not call storage; successful save rerenders.
p=open();s=p.c.window.NexoraProviderState;const handlers={};let buttonHandler,closed=0,focus=0;
const root=p.c.document.getElementById('provider-content');
for(const id of ['offer-dialog','offer-form','offer-price','offer-observation','offer-error','offer-title','offer-context','offer-cancel','offer-products','offer-status']){
 const n=p.c.document.getElementById(id);n.value='';n.addEventListener=(name,fn)=>{handlers[id+':'+name]=fn;};n.focus=()=>focus++;
}
const dialog=p.nodes['offer-dialog'];dialog.showModal=()=>{};dialog.close=()=>closed++;
const button={dataset:{offer:'op1'},isConnected:true,focus(){focus++;},addEventListener(name,fn){buttonHandler=fn;}};
p.nodes['offer-products'].querySelectorAll=()=>[button];p.nodes['offer-products'].querySelector=()=>button;
p.c.window.confirm=()=>true;p.c.window.NexoraProviderUI.start=render=>render(p.read(andina),andina);
p.c.location.search='?vista=precios';vm.runInContext(fs.readFileSync('assets/js/proveedor/productos-ofertas.js','utf8'),p.c);
assert.ok(!root.innerHTML.includes('<dialog'));assert.ok(root.innerHTML.includes('provider-editor'));assert.ok(!p.nodes['offer-products'].innerHTML.includes('Producto: aceite'));assert.ok(!p.nodes['offer-products'].innerHTML.includes('Referencia op1'));assert.ok(p.nodes['offer-products'].innerHTML.includes('Aceite vegetal'));assert.ok(!p.nodes['offer-products'].innerHTML.includes('Detergente'));buttonHandler();assert.equal(dialog.hidden,false);assert.equal(p.nodes['offer-price'].value,'7.1');
p.nodes['offer-price'].value='8.20';handlers['offer-form:input']();let snapshot=memory[key];handlers['offer-cancel:click']();assert.equal(memory[key],snapshot);assert.equal(dialog.hidden,true);
buttonHandler();assert.equal(p.nodes['offer-price'].value,'7.1');p.nodes['offer-price'].value='8.20';handlers['offer-form:input']();p.c.window.confirm=()=>false;handlers['offer-cancel:click']();assert.equal(dialog.hidden,false);assert.equal(memory[key],snapshot);
handlers['offer-form:submit']({preventDefault(){}});assert.equal(dialog.hidden,true);assert.equal(s.drafts().items[0].price,8.2);assert.ok(p.nodes['offer-status'].textContent.includes('Borrador privado guardado'));
assert.equal(memory[buyerKey],original);assert.ok(!p.writes.includes(buyerKey));assert.ok(!p.removals.includes(buyerKey));
delete memory[sessionKey];assert.ok(s.saveDraft('op1',7,'').error);assert.ok(s.drafts().error);
console.log('OK P2: create/edit/stable ID, reload, filters preservation, validation, failed storage rollback, provider isolation, closed and foreign rejection, real editor cancel/discard/save, buyer byte-identical');
// Existing closed drafts remain readable, with no edit/create control.
memory[sessionKey]=JSON.stringify({role:'proveedor',providerId:andina});const closedSource=JSON.parse(original);closedSource.opps.find(o=>o.id==='op1').status='cerrada';memory[buyerKey]=JSON.stringify(closedSource);
const view=supplier(memory);view.c.window.NexoraProviderUI.start=render=>render(view.read(andina),andina);
for(const id of ['offer-products','offer-form','offer-dialog','offer-cancel'])view.c.document.getElementById(id);
view.nodes['offer-products'].querySelectorAll=()=>[];
view.c.location.search='?vista=precios';vm.runInContext(fs.readFileSync('assets/js/proveedor/productos-ofertas.js','utf8'),view.c);
assert.ok(view.nodes['offer-products'].innerHTML.includes('Borrador privado'));assert.ok(!view.nodes['offer-products'].innerHTML.includes('data-offer="op1"'));assert.ok(view.nodes['offer-products'].innerHTML.includes('data-offer="op3"'));memory[buyerKey]=original;
const corrupt={...memory,[key]:'{"version":999,"providers":{}}'};const bad=supplier(corrupt);const raw=corrupt[key];assert.ok(bad.c.window.NexoraProviderState.saveDraft('op1',5,'').error);assert.equal(corrupt[key],raw);
const missing={...memory};delete missing[buyerKey];assert.ok(supplier(missing).c.window.NexoraProviderState.saveDraft('op1',5,'').error);
console.log('OK P2: closed saved draft consultable without edit button, incompatible private storage and missing scenario preserved');
