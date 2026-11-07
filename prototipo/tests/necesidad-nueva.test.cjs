require('./helpers/utils-compartidas.cjs'); // fija «hoy» en el 13 de octubre de 2026 para estas pruebas
// Registrar necesidad como página (Fase B · claridad). El intérprete, la validación y el guardado son los
// del flujo compartido (flujo-necesidad.js); el modo página solo cambia qué se muestra y cómo.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const flowSrc=fs.readFileSync('assets/js/comprador/flujo-necesidad.js','utf8');
function fixture({page=true,search='',hash=''}={}){
 const memory={},nodes={},listeners={};const heading={textContent:''};
 function node(id){return nodes[id]||={id,value:'',innerHTML:'',textContent:'',hidden:true,handlers:{},dataset:{},attrs:{},addEventListener(k,f){this.handlers[k]=f},setAttribute(k,v){this.attrs[k]=v},focus(){},querySelector(){return null},querySelectorAll(){return []},requestSubmit(){this.handlers.submit({preventDefault(){}})}};}
 const c={window:{dispatchEvent(e){(listeners[e.type]||[]).forEach(f=>f(e))},addEventListener(k,f){(listeners[k]||=[]).push(f)},NexoraDemo:{requireSession:()=>true},NexoraProductImages:require('./helpers/imagenes-producto.cjs')},
  Event:function(type){this.type=type},CustomEvent:function(type,o){this.type=type;this.detail=o&&o.detail},URLSearchParams,Intl,Date,setTimeout:f=>{f();return 0},clearTimeout(){},requestAnimationFrame:f=>f(),
  location:{pathname:'/pages/comprador/necesidad-nueva.html',search,hash,assign(u){c.assigned=u}},history:{replaceState(a,b,u){c.replacedUrl=u}},
  sessionStorage:{getItem:k=>memory[k]||null,setItem(k,v){memory[k]=v},removeItem(k){delete memory[k]}},
  document:{body:{dataset:page?{flow:'page'}:{}},getElementById:node,querySelector:s=>s==='.hello h1'?heading:null,activeElement:null,contains:()=>true}};
 vm.createContext(c);for(const f of ['datos-demo','estado-demo'])vm.runInContext(fs.readFileSync('assets/js/comprador/'+f+'.js','utf8'),c);
 c.window.NexoraUI={esc:s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),ic:n=>'<svg data-ic="'+n+'"></svg>',money:n=>'S/ '+n.toFixed(2),buyerHref:s=>s,toast(){},renderIdentity(){},
  plain:t=>String(t||'').replace(/\s*\(demo\)/gi,'').replace(/ · zona /i,' – ').replace(/ · /,' – ').trim()};
 vm.runInContext(fs.readFileSync('assets/js/comprador/tesis-ui.js','utf8'),c);vm.runInContext(flowSrc.replace('  window.NexoraFlow =','  window.audit={get:function(){return F;}};\n  window.NexoraFlow ='),c);
 const surface=node(page?'flow-page':'dlg');
 return {c,node,heading,store:c.window.NexoraStore,flow:c.window.NexoraFlow,F:()=>c.window.audit.get(),
  act:(a,extra={})=>surface.handlers.click({target:{closest:()=>({dataset:{a,...extra}})}}),
  input:(dataset,value,id='')=>surface.handlers.input({target:{dataset,value,id}}),
  change:(target)=>surface.handlers.change({target:{dataset:{},...target}})};
}
const visible=html=>html.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ');

// Paso 1 · Escribe
let f=fixture();vm.runInContext(fs.readFileSync('assets/js/comprador/tesis-ui.js','utf8'),f.c);vm.runInContext(fs.readFileSync('assets/js/comprador/necesidad-nueva.js','utf8'),f.c);
assert.equal(f.heading.textContent,'Registrar necesidad');assert.equal(f.node('dt').textContent,'¿Qué necesitas comprar?');
assert.ok(visible(f.node('mb').innerHTML).includes('Escríbelo como lo dirías. Nosotros lo ordenamos.'));
assert.ok(f.node('mb').innerHTML.includes('12 aceites y 8 detergentes'));assert.ok(f.node('mf').innerHTML.includes('Ordenar mi pedido')&&f.node('mf').innerHTML.includes('href="catalogo.html"'));
assert.ok(f.node('stp').innerHTML.includes('Escribe')&&f.node('stp').innerHTML.includes('Listo'));
f.node('ft').value='';f.act('interp');assert.ok(f.node('mb').innerHTML.includes('Escribe al menos un producto'));

// Paso 2 · Revisa: tarjetas, −/+, fechas rápidas, sin desplegables ni textos técnicos
f.node('ft').value='necesito 12 botellas de aceite y 8 bolsas de detergente para esta semana';f.act('interp');
let mb=f.node('mb').innerHTML,text=visible(mb);
assert.equal(f.node('dt').textContent,'Revisa tu pedido');
assert.ok(text.includes('Aceite vegetal')&&text.includes('Detergente en polvo')&&mb.includes('data-a="inc"')&&mb.includes('data-a="dec"'));
assert.ok(text.includes('¿A cuánto lo compras hoy? (opcional)')&&text.includes('Así calculamos cuánto ahorras.'));
assert.ok(text.includes('Esta semana')&&text.includes('Próxima semana')&&text.includes('Elegir fecha')&&text.includes('Para el '));
assert.ok(text.includes('Santa Anita – Centro')&&!text.includes('(demo)'));// «Tu pedido» (columna derecha): resumen, aviso y el botón de guardar ya no van abajo del formulario.
const aside=f.node('nr-aside').innerHTML,asideText=visible(aside);assert.ok(asideText.includes('Guardar no es comprar. Tú decides después.')&&asideText.includes('Tu pedido')&&asideText.includes('Consejos'));
for(const gone of ['<details','Más detalles','Ver lo que escribiste','sin IA','Interpretación','Fecha sugerida','Registrar necesidades','He revisado'])assert.ok(!mb.includes(gone)&&!f.node('mf').innerHTML.includes(gone),gone);
assert.equal((aside.match(/nx-btn--primary/g)||[]).length,1);assert.ok(aside.includes('data-a="save"')&&aside.includes('>Guardar mi pedido<'));assert.ok(!f.node('mf').innerHTML.includes('nx-btn--primary'));
f.act('inc',{i:'0'});assert.equal(f.F().items[0].qty,13);f.act('dec',{i:'0'});assert.equal(f.F().items[0].qty,12);
const thisWeek=f.F().requiredDate;f.act('when',{when:'next'});assert.equal(f.F().requiredDate,f.store.after(thisWeek,7));
f.act('when',{when:'pick'});assert.ok(f.node('mb').innerHTML.includes('id="required-date"'));
f.input({},'2026-10-18','required-date');f.input({field:'price',row:'0'},'7.80');
f.change({name:'required-zone',value:'sa-centro'});assert.equal(f.F().zoneId,'sa-centro');
console.log('OK: write and review steps as a page with product cards, quantity buttons, quick dates and one primary action');

// Paso 3 · Listo: guardado real, ahorro en una frase y «¿Qué pasa ahora?»
const before=f.store.get().needs.length;f.act('save');
assert.equal(f.store.get().needs.length,before+2);assert.equal(f.node('dt').textContent,'¡Listo! Guardamos tu pedido.');
mb=f.node('mb').innerHTML;text=visible(mb);
assert.ok(text.includes('¿Qué pasa ahora?')&&text.includes('Reuniendo negocios')&&text.includes('Esperando precio del proveedor'));
assert.ok(text.includes('Hay una compra en grupo · Precio en grupo hoy: S/ 7.80 · Si te unes: S/ 7.00 · Ahorro estimado S/ 9.60'));
assert.ok(text.includes('Esta compra entrega entre el 21 y el 23 oct y tú lo necesitas para el 18 oct.')&&text.includes('Cambiar mi fecha'),'El detergente llega después: se dice con fechas');
assert.ok(mb.includes('href="detalle-oportunidad.html?id=op1&amp;necesidad='));
assert.ok(f.node('mf').innerHTML.includes('Ver Mis necesidades')&&!f.node('mf').innerHTML.includes('Cerrar'));
for(const gone of ['NEC-','oportunidad compatible','escenario demostrativo','Cada enlace'])assert.ok(!text.includes(gone),gone);
console.log('OK: saving uses the shared store; done step shows one saving sentence per product and what happens next');

// Avisos del intérprete en frases cortas; la regla de revisión sigue igual.
f=fixture();f.flow.init({});f.flow.open('12 litros de aceite');mb=f.node('mb').innerHTML;
assert.ok(visible(mb).includes('Escribe la cantidad en botellas.')&&mb.includes('data-review="0"')&&visible(mb).includes('Sí, está bien'));
f.input({q:'0'},'12');f.act('save');assert.ok(visible(f.node('mb').innerHTML).includes('Revisa los productos marcados y toca «Sí, está bien».'));
f.change({dataset:{review:'0'},checked:true});f.act('save');assert.ok(f.node('mb').innerHTML.includes('id="dup-box"'),'Pedido repetido: pregunta antes de guardar');f.act('dup-new');assert.equal(f.node('dt').textContent,'¡Listo! Guardamos tu pedido.');
f=fixture();f.flow.init({});f.flow.open('3 cajas de galletas');assert.ok(f.node('mb').innerHTML.includes('No reconocimos este producto. Elígelo:')&&f.node('mb').innerHTML.includes('<select data-i="0">'));
console.log('OK: interpreter warnings shown as short sentences; review rule unchanged');

// Entradas: Catálogo (?producto=), Inicio (#pedido=) y formulario de Inicio sin modal.
f=fixture({search:'?producto=aceite'});vm.runInContext(fs.readFileSync('assets/js/comprador/tesis-ui.js','utf8'),f.c);vm.runInContext(fs.readFileSync('assets/js/comprador/necesidad-nueva.js','utf8'),f.c);
assert.equal(f.F().items[0].k,'aceite');assert.equal(f.node('dt').textContent,'Revisa tu pedido');assert.ok(!f.node('mf').innerHTML.includes('Cambiar lo que escribí'));
f=fixture({hash:'#pedido='+encodeURIComponent('20 kilos de arroz para el viernes')});vm.runInContext(fs.readFileSync('assets/js/comprador/tesis-ui.js','utf8'),f.c);vm.runInContext(fs.readFileSync('assets/js/comprador/necesidad-nueva.js','utf8'),f.c);
assert.equal(f.F().items[0].k,'arroz');assert.equal(f.c.replacedUrl,'/pages/comprador/necesidad-nueva.html','El pedido no queda en la barra de direcciones');
// Lista del Catálogo (?lista=catalogo): mismo borrador temporal y mismos controles; se guarda una sola vez.
{const k=fixture({search:'?lista=catalogo'});vm.runInContext(fs.readFileSync('assets/js/comprador/catalogo-lista-temporal.js','utf8'),k.c);
 const draft=k.c.window.NexoraCatalogDraft.create(k.c.sessionStorage,k.store);draft.toggle('aceite');draft.toggle('detergente');
 vm.runInContext(fs.readFileSync('assets/js/comprador/tesis-ui.js','utf8'),k.c);vm.runInContext(fs.readFileSync('assets/js/comprador/necesidad-nueva.js','utf8'),k.c);
 assert.equal(k.F().catalogBatch,true);assert.equal(k.F().items.length,2);assert.equal(k.node('dt').textContent,'Revisa tu pedido');
 k.input({q:'0'},'4');k.input({q:'1'},'3');assert.equal(k.c.window.NexoraCatalogDraft.create(k.c.sessionStorage,k.store).get().items[0].qty,4,'Cada cambio se conserva en el borrador');
 const count=k.store.get().needs.length;k.act('save');assert.equal(k.store.get().needs.length,count+2);assert.equal(k.node('dt').textContent,'¡Listo! Guardamos tu pedido.');
 assert.equal(k.c.window.NexoraCatalogDraft.create(k.c.sessionStorage,k.store).get().items.length,0,'Al guardar, la lista temporal se vacía (comportamiento original)');
 k.act('save');assert.equal(k.store.get().needs.length,count+2,'Nunca se guarda dos veces');}
const home=fixture({page:false});home.flow.init({registrationPage:'necesidad-nueva.html'});home.node('tx').value='6 paquetes de vasos';home.node('ask').handlers.submit({preventDefault(){}});
assert.equal(home.c.assigned,'necesidad-nueva.html#pedido='+encodeURIComponent('6 paquetes de vasos'));
const html=fs.readFileSync('pages/comprador/necesidad-nueva.html','utf8');
assert.ok(html.includes('data-page="necesidad-nueva" data-parent="necesidades" data-flow="page"')&&!html.includes('<dialog')&&!html.includes('<details'));
console.log('OK: catalog product, catalog list and home entries open the registration page; no dialog or disclosure in its markup');

// Pedido repetido: «Actualizar ese pedido» usa updateNeed (mismo ID, sin pedido nuevo); «Guardar otro» crea uno.
{
  const f=fixture();f.flow.init({});f.flow.open('12 botellas de aceite');
  const before=f.store.get().needs.length,ordersBefore=f.store.get().orders.length;
  f.input({q:'0'},'15');f.act('save');
  const box=visible(f.node('mb').innerHTML);
  assert.ok(box.includes('Ya tienes un pedido de 12 botellas de aceite vegetal para el')&&box.includes('¿Quieres actualizarlo o guardar uno nuevo?')&&box.includes('Actualizar ese pedido')&&box.includes('Guardar otro'));
  assert.equal(f.store.get().needs.length,before,'Preguntar no guarda nada');
  f.act('dup-update');
  assert.ok(f.c.assigned.includes('necesidad.html?id=NEC-DEMO-1')&&f.c.assigned.includes('guardado=1'));
  assert.equal(f.store.get().needs.length,before);assert.equal(f.store.get().orders.length,ordersBefore);
  assert.equal(f.store.get().needs.find(n=>n.id==='NEC-DEMO-1').qty,15,'Mismo ID con la cantidad nueva');
  const g=fixture();g.flow.init({});g.flow.open('12 botellas de aceite');g.act('save');g.act('dup-new');
  assert.equal(g.store.get().needs.length,5,'Guardar otro crea un pedido nuevo');
  const h=fixture();h.flow.init({});h.flow.open('3 paquetes de vasos');h.input({q:'0'},'3');h.change({dataset:{review:'0'},checked:true});h.act('save');
  assert.ok(visible(h.node('mb').innerHTML).includes('Ya tienes un pedido de 6 paquetes de vasos descartables'));
  console.log('OK: pedido repetido pregunta antes de guardar; actualizar conserva el ID; guardar otro crea uno nuevo');
}
