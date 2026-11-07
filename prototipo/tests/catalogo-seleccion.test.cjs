// Isolated memory only. Reuse the shared-flow fixture, not a second business implementation.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const fixtureSource=fs.readFileSync('tests/flujo-necesidad-seguro.test.cjs','utf8').split('const f=fixture();')[0];
const fixture=vm.runInNewContext('(function(require){'+fixtureSource+';return fixture;})(require)',{require});
const draftSource=fs.readFileSync('assets/js/comprador/catalogo-lista-temporal.js','utf8');
function setup(){const f=fixture(),disk={},ctx={window:{}};let fail=false,removeFail=false;vm.runInNewContext(draftSource,ctx);const storage={getItem:k=>disk[k]||null,setItem(k,v){if(fail)throw Error('quota');disk[k]=v;},removeItem(k){if(removeFail)throw Error('blocked');delete disk[k];}};const create=()=>ctx.window.NexoraCatalogDraft.create(storage,f.store);return {f,disk,create,fail(v){fail=v},removeFail(v){removeFail=v}};}
let t=setup(),d=t.create(),buyer=JSON.stringify(t.f.store.get());
assert.ok(d.toggle('aceite'));assert.equal(d.get().items[0].qty,null);assert.ok(d.toggle('detergente'));assert.equal(d.get().items.length,2);
assert.ok(d.toggle('aceite'));assert.equal(d.get().items.length,1);assert.ok(d.toggle('aceite'));assert.equal(d.get().items.length,2);
assert.equal(t.create().get().items.length,2);assert.equal(JSON.stringify(t.f.store.get()),buyer);assert.equal(d.toggle('unknown'),false);
const prior=JSON.stringify(d.get());t.fail(true);assert.equal(d.toggle('vasos'),false);assert.equal(JSON.stringify(d.get()),prior);t.fail(false);
const key=d.key,old=t.f.store.get().user.id;t.f.store.get().user.id='OTHER';assert.notEqual(t.create().key,key);assert.equal(t.create().get().items.length,0);t.f.store.get().user.id=old;
t.f.store.get().baseDate='2027-01-01';assert.notEqual(t.create().key,key);t.f.store.get().baseDate='2026-10-13';
console.log('OK selection/removal/recovery/reload, missing quantities, unknown product, atomic draft failures, business/calendar isolation');
function hooks(d){return {onDraft:v=>d.update(v),beforeRegister:v=>d.begin(v),onFailure:v=>d.failed(v),onRegistered:needs=>d.complete(needs)};}
t=setup();d=t.create();d.toggle('aceite');d.toggle('detergente');const f=t.f;buyer=JSON.stringify(f.store.get());
assert.equal(f.flow.openProducts(d.get(),hooks(d)),true);f.audit.save();assert.equal(JSON.stringify(f.store.get()),buyer);assert.equal(d.get().status,'editing');
f.input({dataset:{q:'0'},value:'12'});f.input({dataset:{q:'1'},value:'8'});f.input({dataset:{},id:'required-date',value:'2026-10-18'});
f.node('dx').handlers.click();assert.equal(JSON.stringify(f.store.get()),buyer);assert.equal(t.create().get().items[0].qty,12);
f.flow.openProducts(t.create().get(),hooks(d));assert.equal(f.audit.get().items[1].qty,8);
f.node('dlg').close(); // native Escape and Cancel use the same close path; no saving.
assert.equal(JSON.stringify(f.store.get()),buyer);f.flow.openProducts(d.get(),hooks(d));
f.fail(true);f.audit.save();assert.equal(JSON.stringify(f.store.get()),buyer);assert.equal(d.get().status,'editing');f.fail(false);
f.audit.save();assert.equal(f.store.get().needs.length,6);assert.equal(d.get().items.length,0);assert.equal(d.get().status,'editing');assert.equal(t.create().get().items.length,0);
f.audit.save();assert.equal(f.store.get().needs.length,6);assert.equal(f.store.get().needs[0].orderId,f.store.get().needs[1].orderId);
assert.equal(f.store.get().participations.length,0);assert.equal(f.store.get().messaging.conversations.length,1);
assert.ok(!f.store.get().orders.find(o=>o.text.includes('Lista de productos')).text.includes('NEC-'));
console.log('OK batch review, missing quantity validation, atomic register failure, close/cancel persistence, successful single atomic register, no duplicate double-click');
t=setup();d=t.create();d.toggle('aceite');d.toggle('detergente');t.f.flow.openProducts(d.get(),hooks(d));t.f.audit.get().items[1].k='aceite';t.f.audit.get().items.forEach(n=>n.qty=2);buyer=JSON.stringify(t.f.store.get());t.f.audit.save();assert.equal(JSON.stringify(t.f.store.get()),buyer);
// Unknown outcome never gets replayed on reload. This is a conservative journal, not persistent idempotency.
assert.ok(d.begin(d.get()));d=t.create();assert.equal(d.get().status,'committing');assert.equal(d.toggle('vasos'),false);assert.equal(d.begin(d.get()),false);assert.equal(d.update(d.get()),false);
t=setup();d=t.create();d.toggle('aceite');assert.ok(d.begin(d.get()));t.fail(true);assert.equal(d.complete([{id:'saved'}]),false);assert.equal(d.get().status,'completed');assert.equal(t.create().get().status,'committing');
t=setup();d=t.create();d.toggle('aceite');d.begin(d.get());t.removeFail(true);d.complete([{id:'saved'}]);assert.equal(t.create().get().status,'completed');assert.equal(t.create().toggle('aceite'),false);
console.log('OK duplicate products rejected, interrupted commit blocks replay, cleanup failure retains completed receipt or uncertain guard');
const html=fs.readFileSync('pages/comprador/catalogo.html','utf8'),ui=fs.readFileSync('assets/js/comprador/catalogo-seleccion.js','utf8');
assert.ok(html.includes('id="cp-list"')&&!html.includes('cp-selection-dialog'),'Mi lista es un panel visible, no un modal');assert.ok(!ui.includes('confirm(')&&ui.includes("$('cp-discard-dialog')"),'Vaciar usa la confirmación corta de la página');assert.ok(ui.includes("necesidad-nueva.html?lista=catalogo"),'La lista se completa en la página de registro');assert.ok(!/store\.register\(/.test(ui));assert.ok(!/store\.register\(/.test(draftSource));assert.ok(!ui.includes('localStorage'));assert.ok(!draftSource.includes('observations'));
console.log('OK confirmed discard only, shared form reused, no secondary register implementation or visible technical idempotency marker');
// DOM contract fixture: events/filters/list controls; visual rendering remains a browser check.
{
 const a=setup(),nodes={};
 function node(id){return nodes[id] ||= {id,dataset:{},children:[],handlers:{},attrs:{},hidden:false,disabled:false,open:false,textContent:'',innerHTML:'',append(...n){this.children.push(...n)},replaceChildren(){this.children=[]},setAttribute(k,v){this.attrs[k]=v},addEventListener(k,f){this.handlers[k]=f},querySelector(){return null},focus(){},close(){this.open=false},showModal(){this.open=true},querySelectorAll(){return []}};}
 let buttons={};function card(id){buttons[id]||=node('btn-'+id);return {dataset:{catalogCard:id},querySelector(selector){return selector==='[data-list-product]'?buttons[id]:null;}};}
 let cards=[card('aceite'),card('detergente')],observers=[];node('catalog-list').querySelectorAll=()=>cards;
 const ctx={window:{NexoraProductImages:require('./helpers/imagenes-producto.cjs'),NexoraStore:a.f.store,NexoraUI:{ic:()=>'',toast(){},buyerHref:s=>s},NexoraCatalogDraft:{create:a.create}},sessionStorage:{},location:{search:'',assign(u){ctx.assigned=u}},URLSearchParams,confirm(){throw new Error('Sin confirm() nativo')},MutationObserver:function(f){observers.push(f);this.observe=()=>{}},document:{getElementById:node,createElement:tag=>{const n=node('new-'+Object.keys(nodes).length);n.tagName=tag;return n;}}};
 vm.runInNewContext(ui,ctx);assert.equal(node('cp-selection-bar').hidden,true);assert.equal(node('cp-continue').disabled,true);assert.equal(node('cp-selection-items').children[0].textContent,'Añade productos y guárdalos juntos como un pedido.');
 function select(id){node('catalog-list').handlers.click({preventDefault(){},target:{closest(){return {dataset:{listProduct:id}}}}});}
 select('aceite');select('detergente');assert.equal(a.create().get().items.length,2);assert.equal(buttons.aceite.textContent,'En tu lista ✓ · Quitar');assert.equal(buttons.aceite.attrs['aria-pressed'],'true');
 assert.equal(node('cp-selection-count').textContent,'(2)');assert.equal(node('cp-bar-count').textContent,'Mi lista (2)');assert.equal(node('cp-selection-items').children.length,2);assert.equal(node('cp-selection-bar').hidden,false);
 // Filtering replaces card DOM, never selection state.
 cards=[card('detergente')];buttons={};cards=[card('detergente')];observers[0]();assert.equal(buttons.detergente.attrs['aria-pressed'],'true');assert.equal(a.create().get().items.length,2);
 node('cp-discard').handlers.click();assert.equal(node('cp-discard-dialog').open,true);node('cp-discard-no').handlers.click();assert.equal(node('cp-discard-dialog').open,false);assert.equal(a.create().get().items.length,2);
 node('cp-bar-continue').handlers.click();assert.equal(ctx.assigned,'necesidad-nueva.html?lista=catalogo');ctx.assigned='';node('cp-continue').handlers.click();assert.equal(ctx.assigned,'necesidad-nueva.html?lista=catalogo');
 node('cp-discard').handlers.click();node('cp-discard-yes').handlers.click();assert.equal(a.create().get().items.length,0);assert.equal(node('cp-selection-bar').hidden,true);
 console.log('OK UI event contract: selected states, filters keep selections, visible list, cancelled/confirmed short discard, shared continuation');
}
// Preserve the previous field value when the draft write fails.
t=setup();d=t.create();d.toggle('aceite');t.f.flow.openProducts(d.get(),hooks(d));t.fail(true);t.f.input({dataset:{q:'0'},value:'9'});assert.equal(t.f.audit.get().items[0].qty,null);assert.equal(d.get().items[0].qty,null);t.fail(false);
// A failure to create the pre-commit guard must not call the buyer register.
t.f.input({dataset:{q:'0'},value:'9'});buyer=JSON.stringify(t.f.store.get());t.fail(true);t.f.audit.save();assert.equal(JSON.stringify(t.f.store.get()),buyer);assert.equal(d.get().status,'editing');t.fail(false);
// Corrupted data is reported and left intact, never silently reset.
t=setup();d=t.create();t.disk[d.key]='{bad';const corrupt=t.create();assert.ok(corrupt.error().includes('recuperar'));assert.equal(corrupt.toggle('aceite'),false);assert.equal(t.disk[d.key],'{bad');
console.log('OK failed field/guard persistence preserves previous data and never registers; corrupt draft is not overwritten');
assert.ok(html.includes('id="cp-selection-items" aria-label="Productos de tu lista"'));
assert.ok(html.includes('Después eliges cantidades y fecha. Guardar no es comprar.'));
for(const count of [1,2,3]){
 const trial=setup(),draft=trial.create(),flow=trial.f,ids=['aceite','detergente','vasos'].slice(0,count),initial=JSON.stringify(flow.store.get());
 ids.forEach(id=>draft.toggle(id));assert.equal(flow.flow.openProducts(draft.get(),hooks(draft)),true);
 assert.equal(flow.node('dt').textContent,'Completar necesidades');assert.equal(flow.audit.get().items.length,count);
 assert.ok(flow.audit.get().items.every(n=>n.qty===null));
 let markup=flow.node('mb').innerHTML;assert.equal((markup.match(/data-q="/g)||[]).length,count);
 assert.ok(!markup.includes('class="rw warn"'));assert.ok(!markup.includes('Escribe una cantidad mayor que cero'));
 assert.equal((markup.match(/aria-invalid="false"/g)||[]).length,count);
 // No registration on review entry; a registration attempt exposes quantity errors.
 assert.equal(JSON.stringify(flow.store.get()),initial);flow.audit.save();assert.equal(JSON.stringify(flow.store.get()),initial);
 assert.ok(flow.node('mb').innerHTML.includes('Escribe una cantidad mayor que cero'));
 assert.equal((flow.node('mb').innerHTML.match(/aria-invalid="true"/g)||[]).length,count);
 ids.forEach((id,i)=>flow.input({dataset:{q:String(i)},value:String(i+2)}));
 // Each closing mechanism preserves every product and entered quantity.
 flow.node('dx').handlers.click();assert.equal(trial.create().get().items.length,count);
 flow.flow.openProducts(trial.create().get(),hooks(draft));assert.equal(flow.audit.get().items[0].qty,2);
 flow.click('close');assert.equal(JSON.stringify(flow.store.get()),initial);
 flow.flow.openProducts(trial.create().get(),hooks(draft));flow.node('dlg').close();
 flow.flow.openProducts(trial.create().get(),hooks(draft));assert.deepEqual(Array.from(flow.audit.get().items,n=>n.k),ids);
 flow.input({dataset:{},id:'required-date',value:''});flow.audit.save();assert.equal(JSON.stringify(flow.store.get()),initial);
 flow.input({dataset:{},id:'required-date',value:'2026-10-18'});flow.change({dataset:{},id:'required-zone',value:''});flow.audit.save();assert.equal(JSON.stringify(flow.store.get()),initial);
 flow.change({dataset:{},id:'required-zone',value:'sa-centro'});
 flow.input({dataset:{q:'0'},value:'1.5'});flow.audit.save();assert.equal(JSON.stringify(flow.store.get()),initial); // no fractional bottles
 flow.input({dataset:{q:'0'},value:'2'});flow.audit.save();
 assert.equal(flow.store.get().needs.length,4+count);assert.equal(trial.create().get().items.length,0);
 const saved=flow.store.get().needs.slice(0,count);assert.equal(new Set(saved.map(n=>n.productId)).size,count);
 assert.equal(new Set(saved.map(n=>n.orderId)).size,1);flow.audit.save();assert.equal(flow.store.get().needs.length,4+count);
 assert.equal(flow.store.get().participations.length,0);
 // Subsequent individual registration retains its original title and immediate validation presentation.
 flow.node('dlg').close();flow.flow.openProduct('aceite');assert.equal(flow.node('dt').textContent,'Revisa tu lista');assert.ok(flow.node('mb').innerHTML.includes('Escribe una cantidad mayor que cero'));
}
console.log('OK visible list texts; 1/2/3 products, no initial warning, attempted validation, close/cancel/recovery, required date/zone, correction, atomic registration and individual-mode regression');
