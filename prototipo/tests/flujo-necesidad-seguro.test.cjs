require('./helpers/utils-compartidas.cjs'); // fija «hoy» en el 13 de octubre de 2026 para estas pruebas
// Tests run with an in-memory store and a small DOM fixture, never a browser session.
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const key = 'nexora.comprador.demo.v1';
const source = fs.readFileSync('assets/js/comprador/flujo-necesidad.js','utf8');
function fixture() {
 const memory={}, nodes={}, timers=[]; let fail=false, focused='';
 function node(id){return nodes[id] ||= {id,innerHTML:'',textContent:'',value:'',hidden:true,open:false,handlers:{},children:Array.from({length:3},()=>({classList:{add(){}}})),classList:{add(){}},addEventListener(k,fn){this.handlers[k]=fn;},focus(){focused=id;},querySelector(){return {focus(){focused=id;}};},showModal(){this.open=true;},close(){this.open=false;if(this.handlers.close)this.handlers.close();}};}
 const RealDate=Date; const ScenarioDate=class extends RealDate { constructor(...args){super(...(args.length?args:['2026-10-13T12:00:00Z']));} static now(){return RealDate.now();} };
 const ctx={Date:ScenarioDate,window:{dispatchEvent(){},addEventListener(){}},Event:function(){},CustomEvent:function(){},sessionStorage:{getItem:k=>memory[k]||null,setItem(k,v){if(fail)throw Error('Unavailable');memory[k]=v;},removeItem:k=>delete memory[k]},document:{getElementById:node,activeElement:null,contains(){return true;}},setTimeout(fn){const t={fn};timers.push(t);return t;},clearTimeout(t){t.cancelled=true;},requestAnimationFrame:fn=>fn(),location:{assign(){}}};
 vm.createContext(ctx);
 for(const file of ['datos-demo.js','estado-demo.js'])vm.runInContext(fs.readFileSync('assets/js/comprador/'+file,'utf8'),ctx);
 ctx.window.NexoraUI={esc:s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),ic:()=>'',money:n=>'S/ '+n,toast(){},buyerHref:s=>s};
 vm.runInContext(fs.readFileSync('assets/js/comprador/tesis-ui.js','utf8'),ctx);vm.runInContext(source.replace('  window.NexoraFlow =', '  window.__audit = {parse:parse, row:row, save:save, view2:view2, view4:view4, get:function(){return F;}};\n  window.NexoraFlow ='),ctx);
 ctx.window.NexoraFlow.init();
 return {memory,nodes,node,store:ctx.window.NexoraStore,flow:ctx.window.NexoraFlow,audit:ctx.window.__audit,flush(){while(timers.length){const t=timers.shift();if(!t.cancelled)t.fn();}},fail(v){fail=v;},input(target){node('dlg').handlers.input({target});},change(target){node('dlg').handlers.change({target});},click(a,i){node('dlg').handlers.click({target:{closest(){return {dataset:{a,i}};}}});},get focused(){return focused;}};
}
const f=fixture();let rows=f.audit.parse('Necesito 12 botellas de aceite y 8 bolsas de detergente para esta semana');
assert.equal(rows.length,2);assert.equal(rows[0].qty,12);assert.equal(rows[1].qty,8);assert.equal(rows[0].warning,'');assert.equal(rows[1].warning,'');
assert.equal(f.audit.parse('Necesito aceite')[0].qty,null);
rows=f.audit.parse('Necesito 2 cajas de aceite');assert.equal(rows[0].qty,null);assert.ok(rows[0].warning.includes('No convertimos'));
rows=f.audit.parse('Necesito 1,5 kilos de arroz');assert.equal(rows.length,1);assert.equal(rows[0].qty,1.5);assert.equal(rows[0].k,'arroz');assert.equal(rows[0].warning,'');
rows=f.audit.parse('12 botellas de aceite 8 bolsas de detergente');assert.equal(rows.length,2);assert.ok(rows.every(r=>r.qty===null&&r.warning));
rows=f.audit.parse('12 botellas de aceite y 2 paquetes de azúcar');assert.equal(rows.length,2);assert.equal(rows[1].k,'');assert.ok(rows[1].warning);
rows=f.audit.parse('faltan vasos descartables, unos 6 paquetes');assert.equal(rows.length,1);assert.equal(rows[0].qty,6);assert.equal(rows[0].warning,'');
for(const text of ['2 bolsas de aceite','2 galones de aceite','2 docenas de leche'])assert.equal(f.audit.parse(text)[0].qty,null);
assert.ok(f.audit.parse('2 botellas de aceite con azúcar')[0].warning);
console.log('OK: two products, missing quantity, unsupported units, decimal comma, missing separators and unknown content');
function open(f,text){f.flow.open(text);f.flush();return f.audit.get();}
let state=open(f,'Necesito aceite'), before=JSON.stringify(f.store.get());f.audit.save();assert.equal(JSON.stringify(f.store.get()),before);assert.ok(f.node('mb').innerHTML.includes('confirma su unidad'));
f.input({dataset:{q:'0'},value:'3'});f.change({dataset:{review:'0'},checked:true});f.audit.save();assert.equal(f.store.get().needs.length,5);assert.equal(f.store.get().needs[0].qty,3);assert.equal(f.store.get().needs[0].unit,'botellas');
f.audit.save();assert.equal(f.store.get().needs.length,5);
assert.ok(!f.node('mb').innerHTML.includes('NEC-'));assert.ok(f.node('mb').innerHTML.includes('no es comprar'));assert.ok(f.node('mf').innerHTML.includes('Buscar oportunidades compatibles'));
f.audit.view4();assert.equal(f.node('dt').textContent,'Encontramos una oportunidad para ti');
state=open(f,'Necesito 2 cajas de aceite');before=JSON.stringify(f.store.get());f.input({dataset:{q:'0'},value:'2'});f.audit.save();assert.equal(JSON.stringify(f.store.get()),before);f.change({dataset:{review:'0'},checked:true});f.audit.save();assert.equal(f.store.get().needs[0].qty,2);
state=open(f,'Necesito 1,5 kilos de arroz');f.audit.save();assert.equal(f.store.get().needs[0].qty,1.5);f.audit.view4();assert.ok(f.node('mb').innerHTML.includes('Todavía no hay oportunidades compatibles'));
console.log('OK: ambiguity blocks save, explicit correction, no duplicate registrations, matching and empty result');
state=open(f,'12 botellas de aceite y 8 bolsas de detergente');before=JSON.stringify(f.store.get());
f.input({dataset:{},id:'required-date',value:''});f.audit.save();assert.equal(JSON.stringify(f.store.get()),before);
f.input({dataset:{},id:'required-date',value:'2026-10-18'});f.change({dataset:{},id:'required-zone',value:''});f.audit.save();assert.equal(JSON.stringify(f.store.get()),before);
f.change({dataset:{},id:'required-zone',value:'sa-centro'});f.audit.save();assert.equal(f.store.get().needs.length,9);assert.equal(f.store.get().needs[0].orderId,f.store.get().needs[1].orderId);
state=open(f,'12 botellas de aceite');before=JSON.stringify(f.store.get());const disk=f.memory[key];f.node('dx').handlers.click();assert.equal(JSON.stringify(f.store.get()),before);assert.equal(f.memory[key],disk);assert.equal(f.node('dlg').open,false);
state=open(f,'12 botellas de aceite');f.fail(true);f.audit.save();assert.equal(JSON.stringify(f.store.get()),before);assert.equal(f.memory[key],disk);assert.ok(f.node('mb').innerHTML.includes('No se pudo guardar'));f.fail(false);
console.log('OK: date/zone required, linked order, cancellation and storage failure preserve existing state');
state=open(f,'2 paquetes de azúcar');f.change({dataset:{i:'0'},tagName:'SELECT',value:'leche'});assert.equal(state.items[0].qty,null);f.input({dataset:{q:'0'},value:'4'});f.change({dataset:{review:'0'},checked:true});f.audit.save();assert.equal(f.store.get().needs[0].productId,'leche');assert.equal(f.store.get().needs[0].unit,'latas');
f.node('dlg').close();f.flow.openProduct('aceite');assert.equal(f.audit.get().items[0].qty,null);assert.equal(f.node('dt').textContent,'Revisa tu lista');assert.ok(f.node('mf').innerHTML.includes('Registrar necesidades'));assert.ok(f.node('mb').innerHTML.includes('Más detalles'));assert.ok(f.node('mb').innerHTML.includes('¿Para cuándo lo necesitas?'));assert.ok(f.node('mb').innerHTML.includes('Zona de compra'));
const old=f.node('tx').value;let prevented=false;f.node('tx').handlers.keydown({key:'Enter',shiftKey:true,preventDefault(){prevented=true;}});assert.equal(prevented,false);f.node('ask').requestSubmit=()=>{prevented='submitted';};f.node('tx').handlers.keydown({key:'Enter',shiftKey:false,preventDefault(){}});assert.equal(prevented,'submitted');
assert.equal(f.store.get().participations.length,0);assert.equal(f.store.get().opps[0].lotQty,144);assert.equal(f.store.get().messaging.conversations.length,1);
console.log('OK: manual product correction, catalog flow, accessible labels, Enter/Shift+Enter and unchanged commercial records');

assert.ok(f.audit.row({k:'aceite',qty:2,presentation:'Botella 1 L',price:-2,brand:''},0).includes('<details open>'));
assert.ok(f.audit.row({k:'aceite',qty:2,presentation:'',price:null,brand:''},0).includes('<details open>'));
console.log('OK: invalid optional price or required presentation expands details for correction');

// Presentation contract: products first; native details closed unless invalid.
const compact=fixture();open(compact,'12 botellas de aceite y 8 bolsas de detergente');
const html=compact.node('mb').innerHTML;
assert.ok(html.indexOf('class="review-products"') < html.indexOf('class="review-timing"'));
assert.equal((html.match(/<details open>/g)||[]).length,0);
assert.equal((html.match(/<summary>Más detalles<\/summary>/g)||[]).length,2);
assert.equal((html.match(/id="required-date"/g)||[]).length,1);
assert.equal((html.match(/id="required-zone"/g)||[]).length,1);
assert.ok(html.includes('Fecha sugerida: 2026-10-18'));
assert.ok(html.includes('No confirmarás ninguna compra ni participación'));
assert.equal(compact.audit.get().requiredDate,'2026-10-18');
assert.ok(compact.node('mf').innerHTML.includes('Volver al pedido'));
assert.ok(compact.node('mf').innerHTML.includes('Registrar necesidades'));
const validRow=compact.audit.row({k:'aceite',qty:12,presentation:'Botella 1 L',price:null,brand:''},0);
for(const field of ['brand','presentation','price'])assert.ok(validRow.includes('data-field="'+field+'"'));
assert.ok(!validRow.includes('<details open>'));
console.log('OK: compact product-first review, closed optional details, required date/zone, unchanged demo dates and clear next step');

// Final results are read-only views of registered needs and existing opportunities.
const results=fixture();open(results,'12 botellas de aceite y 8 bolsas de detergente');results.audit.get().requiredDate='2026-10-25'; // próxima semana: entregan las dos compras
results.input({dataset:{field:'price',row:'0'},value:'7.80'});results.audit.save();
const savedResult=JSON.stringify(results.store.get()), savedDisk=results.memory[key];
results.audit.view4();let resultHtml=results.node('mb').innerHTML;
assert.equal(results.node('dt').textContent,'Encontramos oportunidades para ti');
assert.equal((resultHtml.match(/class="mi match-card"/g)||[]).length,2);
for(const id of ['op1','op2'])assert.ok(resultHtml.includes('detalle-oportunidad.html?id='+id));
assert.ok(resultHtml.includes('Distribuidora Andina (demo)'));assert.ok(resultHtml.includes('Mayorista Lima Sur (demo)'));
assert.ok(resultHtml.includes('Botella 1 L'));assert.ok(resultHtml.includes('Abierta · demo'));
assert.ok(resultHtml.includes('Ahorro estimado <strong>S/ 9.6</strong>'));
assert.ok(resultHtml.includes('referencial'));
assert.ok(!resultHtml.replace(/<[^>]*>/g,'').includes('NEC-'));assert.ok(!resultHtml.includes('S/ 7.8')||resultHtml.includes('Tu precio por unidad: S/ 7.8'));
assert.ok(results.node('mf').innerHTML.includes('Registrar otra necesidad'));
results.audit.view4();assert.equal(JSON.stringify(results.store.get()),savedResult);assert.equal(results.memory[key],savedDisk);
console.log('OK: plural results, valid prices/savings, provider associations, real detail links and no writes on render/reload');
const none=fixture();open(none,'1,5 kilos de arroz');none.audit.save();none.audit.view4();
assert.equal(none.node('dt').textContent,'Tu lista quedó registrada');
assert.ok(none.node('mb').innerHTML.includes('Ir a Mis necesidades'));assert.ok(none.node('mb').innerHTML.includes('No necesitas registrarlos de nuevo'));
assert.ok(!none.node('mb').innerHTML.includes('class="mi match-card"'));assert.ok(none.node('mf').innerHTML.includes('Cerrar'));
const mixed=fixture();open(mixed,'2 botellas de aceite y 1 kilo de arroz');mixed.audit.save();mixed.audit.view4();
assert.equal(mixed.node('dt').textContent,'Encontramos una oportunidad para ti');
assert.ok(mixed.node('mb').innerHTML.includes('Estas necesidades siguen registradas'));
const repeated=fixture();open(repeated,'2 botellas de aceite y 3 botellas de aceite');repeated.audit.save();repeated.audit.view4();
assert.equal(repeated.node('dt').textContent,'Encontramos una oportunidad para ti');
assert.equal((repeated.node('mb').innerHTML.match(/class="mi match-card"/g)||[]).length,1);
assert.ok(repeated.node('mb').innerHTML.includes('Tu cantidad: 2 botellas'));assert.ok(repeated.node('mb').innerHTML.includes('Tu cantidad: 3 botellas'));
assert.ok(repeated.node('mb').innerHTML.includes('no sumamos sus cantidades'));
console.log('OK: empty, partial and repeated-need results preserve quantities and count unique opportunities');
const absent=fixture();open(absent,'2 botellas de aceite');absent.audit.save();
let opportunity=absent.store.get().opps.find(o=>o.id==='op1');opportunity.provider='';opportunity.priceJoint=null;opportunity.tramos=null;absent.audit.view4();
assert.ok(!absent.node('mb').innerHTML.includes('Proveedor asociado:'));
assert.ok(!absent.node('mb').innerHTML.includes('S/'));
assert.ok(absent.node('mb').innerHTML.includes('Precio conjunto no disponible'));
opportunity.priceJoint=10;opportunity.tramos=[{desde:1,hasta:null,precio:10}];absent.audit.get().saved[0].priceIndividual=7;absent.audit.view4();
assert.ok(absent.node('mb').innerHTML.includes('no sale más barato'));
opportunity.status='cerrada';absent.audit.view4();assert.ok(!absent.node('mb').innerHTML.includes('class="mi match-card"'));
console.log('OK: no invented provider/prices, no claimed savings at a higher price, closed opportunities excluded by existing compatibility');

// Exact navigation context is attached to each distinct registered need.
for(const need of results.audit.get().saved)assert.ok(results.node('mb').innerHTML.includes('&amp;necesidad='+encodeURIComponent(need.id)));
for(const need of repeated.audit.get().saved)assert.ok(repeated.node('mb').innerHTML.includes('&amp;necesidad='+encodeURIComponent(need.id)));
assert.equal((repeated.node('mb').innerHTML.match(/class="btn p match-detail"/g)||[]).length,2);
console.log('OK: one exact detail link per need; repeated products remain separate; IDs only appear in internal link values');
