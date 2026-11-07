require('./helpers/utils-compartidas.cjs'); // fija «hoy» en el 13 de octubre de 2026 para estas pruebas
// Detalle de compra en grupo (Fase B · claridad): unirse con confirmación corta, ahorro en una frase y
// «¿Qué pasa ahora?». Mismas reglas del estado (prepareParticipation → confirmParticipation).
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
function fixture(query){
 const memory={},nodes={},listeners={};let fail=false;const heading={textContent:''};
 function node(id){return nodes[id]||={id,value:'',innerHTML:'',textContent:'',hidden:true,open:false,disabled:false,handlers:{},addEventListener(k,f){this.handlers[k]=f},showModal(){this.open=true},close(){this.open=false;if(this.handlers.close)this.handlers.close()},focus(){},querySelectorAll(){return []}};}
 const c={window:{dispatchEvent(e){(listeners[e.type]||[]).forEach(f=>f(e))},addEventListener(k,f){(listeners[k]||=[]).push(f)},NexoraDemo:{requireSession:()=>true}},Event:function(type){this.type=type},URLSearchParams,Intl,Date,
  location:{pathname:'/pages/comprador/detalle-oportunidad.html',search:query,hash:'',assign(u){c.assigned=u}},history:{replaceState(){}},
  sessionStorage:{getItem:k=>memory[k]||null,setItem(k,v){if(fail&&k==='nexora.comprador.demo.v1')throw Error('quota');memory[k]=v},removeItem(k){delete memory[k]}},
  document:{getElementById:node,querySelector:s=>s==='.hello h1'?heading:null,title:''}};
 vm.createContext(c);for(const f of ['datos-demo','estado-demo','imagenes-producto'])vm.runInContext(fs.readFileSync('assets/js/comprador/'+f+'.js','utf8'),c);
 c.window.NexoraUI={esc:s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),money:n=>'S/ '+n.toFixed(2),ic:id=>'<svg data-icon="'+id+'"></svg>',buyerHref:s=>s,renderIdentity(){},toasts:[],toast(m){this.toasts.push(m)},
  plain:t=>String(t||'').replace(/\s*\(demo\)/gi,'').replace(/ · zona /i,' – ').replace(/ · /,' – ').trim()};
 vm.runInContext(fs.readFileSync('assets/js/comprador/tesis-ui.js','utf8'),c);vm.runInContext(fs.readFileSync('assets/js/comprador/detalle-oportunidad.js','utf8'),c);
 return {c,s:c.window.NexoraStore,node,heading,fail:v=>fail=v,click:sel=>node('op-detail').handlers.click({target:{closest:s=>s===sel?{}:null}})};
}
const visible=html=>html.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ');

// Antes de unirse: qué es, cuánto ahorro, qué pasa ahora y una acción principal.
let t=fixture('?id=op1&necesidad=NEC-DEMO-1');let html=t.node('op-detail').innerHTML,text=visible(html);
assert.equal(t.heading.textContent,'Aceite vegetal');assert.ok(t.node('sub').innerHTML.includes('Abierta · cierra el 16 oct'));
// Diseño nuevo: el ahorro va como dato clave del encabezado y los precios en cajas de la tarjeta principal.
assert.ok(t.node('dt-key').innerHTML.includes('Si te unes: ahorro estimado <strong>S/ 9.60</strong> · el precio bajaría a S/ 7.00'));assert.ok(text.includes('Precio en grupo hoy S/ 7.80 Con tu pedido: S/ 7.00')&&text.includes('Hoy pagas S/ 7.80'));
assert.ok(text.includes('Te vende Distribuidora Andina')&&text.includes('3 negocios unidos')&&text.includes('3 negocios ya se unieron'));
assert.ok(text.includes('¿Qué pasa ahora?')&&text.includes('Reuniendo negocios')&&text.includes('Esperando precio del proveedor'));
assert.ok(html.includes('class="nx-btn nx-btn--primary nx-btn--block" id="participate"')&&text.includes('Unirme con 12 botellas'));
assert.ok(text.includes('Escribir al proveedor'));
for(const hidden of [/NEC-/,/PAR-/,/\bop1\b/,/Lote/,/escenario/i,/Ventana/,/Condiciones de compra/,/Porcentaje/,/18%/,/\(demo\)/,/hora de Lima/])assert.ok(!hidden.test(text),'No se muestra: '+hidden);
assert.ok(!html.includes('<details')&&!html.includes('<dialog'));
console.log('OK: before joining the page answers what it is, how much you save, what happens next and what to do');

// Unirse: confirmación corta; cancelar no cambia nada; un fallo de guardado conserva el estado.
const before=JSON.stringify(t.s.get());t.click('#participate');
assert.equal(t.node('join-dialog').open,true);assert.equal(t.node('join-text').textContent,'Te unes con 12 botellas. Ahorro estimado: S/ 9.60. Puedes retirarte antes del 16 oct.');
t.node('join-no').handlers.click();assert.equal(t.node('join-dialog').open,false);assert.equal(JSON.stringify(t.s.get()),before);
t.click('#participate');t.fail(true);t.node('join-yes').handlers.click.call(t.node('join-yes'));
assert.equal(t.node('join-error').hidden,false);assert.equal(t.s.ownParticipations().length,0);t.fail(false);
t.node('join-yes').handlers.click.call(t.node('join-yes'));assert.equal(t.s.ownParticipations().length,1);assert.equal(t.node('join-dialog').open,false);assert.ok(t.c.window.NexoraUI.toasts.includes('Te uniste.'));
html=t.node('op-detail').innerHTML;text=visible(html);
assert.ok(t.node('sub').innerHTML.includes('Ya te uniste')&&text.includes('Reuniendo negocios'));
assert.ok(html.includes('href="participacion.html?id='+encodeURIComponent(t.s.ownParticipations()[0].id)+'">Ver mi seguimiento</a>')&&!html.includes('id="participate"'));
console.log('OK: short join confirmation, cancel is read-only, storage failure keeps state, joined state links to the participation page');

// Compra cerrada y compra inexistente.
t=fixture('?id=op4');text=visible(t.node('op-detail').innerHTML);assert.ok(t.node('sub').innerHTML.includes('Cerró el')&&text.includes('No se concretó')&&!t.node('op-detail').innerHTML.includes('id="participate"'));
t=fixture('?id=NO-EXISTE');assert.ok(t.node('op-detail').innerHTML.includes('No encontramos esta compra en grupo')&&t.node('op-detail').innerHTML.includes('href="oportunidades.html"'));
console.log('OK: closed purchase cannot be joined; unknown id offers a way back');

// Marcado: nivel 2 de Compras en grupo; un solo modal y es de confirmación.
const page=fs.readFileSync('pages/comprador/detalle-oportunidad.html','utf8');
assert.ok(page.includes('data-page="detalle-oportunidad" data-parent="oportunidades"'));
assert.equal((page.match(/<dialog/g)||[]).length,1);assert.ok(page.includes('¿Te unes a esta compra en grupo?')&&page.includes('No, todavía no')&&page.includes('Sí, unirme'));
assert.ok(!page.includes('participation-dialog')&&!page.includes('<details')&&!page.includes('detail-back'));
assert.ok(!/sessionStorage|store\.(register|reset|confirmWithdrawal)\(/.test(fs.readFileSync('assets/js/comprador/detalle-oportunidad.js','utf8')));
console.log('OK: level-2 page under Compras en grupo with a single short confirmation dialog');
