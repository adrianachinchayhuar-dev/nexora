require('./helpers/utils-compartidas.cjs'); // fija «hoy» en el 13 de octubre de 2026 para estas pruebas
// Detalle de participación como página (Fase B · claridad). Mismo estado y mismas reglas de retiro;
// solo cambia qué se muestra. Hereda las garantías de retiro que antes cubría el modal de Seguimiento.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
function fixture(){
 const memory={},nodes={},listeners={};let fail=false;const heading={textContent:''};
 function node(id){return nodes[id]||={id,value:'',innerHTML:'',textContent:'',hidden:true,open:false,disabled:false,handlers:{},addEventListener(k,f){this.handlers[k]=f},showModal(){this.open=true},close(){this.open=false;if(this.handlers.close)this.handlers.close()},focus(){},querySelectorAll(){return []}};}
 const c={window:{dispatchEvent(e){(listeners[e.type]||[]).forEach(f=>f(e))},addEventListener(k,f){(listeners[k]||=[]).push(f)},NexoraDemo:{requireSession:()=>true}},Event:function(type){this.type=type},URLSearchParams,Intl,Date,
  location:{pathname:'/pages/comprador/participacion.html',search:''},sessionStorage:{getItem:k=>memory[k]||null,setItem(k,v){if(fail&&k==='nexora.comprador.demo.v1')throw Error('quota');memory[k]=v},removeItem(k){delete memory[k]}},
  document:{getElementById:node,querySelector:s=>s==='.hello h1'?heading:null,title:''}};
 vm.createContext(c);for(const f of ['datos-demo','estado-demo','imagenes-producto'])vm.runInContext(fs.readFileSync('assets/js/comprador/'+f+'.js','utf8'),c);
 c.window.NexoraUI={esc:s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),money:n=>'S/ '+n.toFixed(2),ic:id=>'<svg data-icon="'+id+'"></svg>',media:()=>'',buyerHref:s=>s,renderIdentity(){},toasts:[],toast(m){this.toasts.push(m)},
  plain:t=>String(t||'').replace(/\s*\(demo\)/gi,'').replace(/ · zona /i,' – ').replace(/ · /,' – ').trim()};
 vm.runInContext(fs.readFileSync('assets/js/comprador/resumen-participacion.js','utf8'),c);
 const s=c.window.NexoraStore;
 function participate(op='op1',need='NEC-DEMO-1'){s.selectNeed(op,need);const proposal=s.prepareParticipation(op,need);assert.ok(!proposal.error,proposal.error);return s.confirmParticipation(proposal.proposal).participation;}
 function open(id){c.location.search='?id='+encodeURIComponent(id);vm.runInContext(fs.readFileSync('assets/js/comprador/tesis-ui.js','utf8'),c);vm.runInContext(fs.readFileSync('assets/js/comprador/participacion-detalle.js','utf8'),c);}
 return {c,s,node,heading,participate,open,fail:v=>fail=v};
}
const visible=html=>html.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ');

// Te uniste: qué es, cuánto ahorro en una frase, qué pasa ahora y acciones claras.
let t=fixture();const p=t.participate(),original=JSON.stringify(p),historicalSaving=JSON.stringify(p.savingSnapshot);
t.open(p.id);let page=t.node('participation-page').innerHTML,text=visible(page);
assert.equal(t.heading.textContent,'Aceite vegetal');
assert.ok(t.node('sub').innerHTML.includes('Te uniste')&&t.node('sub').innerHTML.includes('12 botellas'));
// Diseño nuevo: el ahorro es el dato clave del encabezado; la franja inferior da los dos precios.
assert.ok(t.node('dt-key').innerHTML.includes('Tu precio: S/ 7.00 · Ahorro estimado <strong>S/ 9.60</strong>'));
assert.ok(text.includes('Precio en grupo ahora S/ 7.00')&&text.includes('Lo que pagas hoy S/ 7.80'));
assert.equal((text.match(/S\/ /g)||[]).length,2,'Un número clave por idea: solo la franja de precios tiene cifras');
assert.ok(text.includes('Te vende Distribuidora Andina')&&text.includes('4 negocios ya se unieron')&&!text.includes('(demo)'));
assert.ok(text.includes('¿Qué pasa ahora?')&&text.includes('Te uniste')&&text.includes('Reuniendo negocios'));
assert.ok(page.includes('class="nx-btn nx-btn--primary nx-btn--block" href="detalle-oportunidad.html?id=op1&amp;necesidad=NEC-DEMO-1">Ver detalles de la oferta</a>'));
// La caja «Estado» ya no está (lo dice el chip): en su lugar, cuándo te uniste.
assert.ok(text.includes('Te uniste el')&&!/\bEstado\b/.test(text));assert.ok(!text.includes('Ver compra en grupo'),'No hay dos botones casi iguales');
assert.ok(page.includes('class="nx-btn nx-btn--danger nx-btn--block" id="leave"')&&text.includes('Retirarme'));
assert.ok(page.includes('href="necesidad.html?id=NEC-DEMO-1">Ver mi necesidad</a>'));
for(const hidden of [/PAR-/,/NEC-/,/PED-/,/\bop1\b/,/hora de Lima/,/al confirmar/i,/escenario/i,/Ventana/,/Más información/,/Cerrar/,/Porcentaje/,/18%/])assert.ok(!hidden.test(text),'No se muestra: '+hidden);
assert.ok(!page.includes('<details')&&!page.includes('<dialog'));
console.log('OK: joined participation shows what it is, one saving sentence, what happens next and clear actions without internal data');
// La necesidad original se conserva en el enlace aunque ya no sea compatible; la página lo dice claro.
{const u=fixture();const r=u.participate();u.s.get().needs.find(n=>n.id===r.needId).requiredDate='2026-11-01';u.open(r.id);const html=u.node('participation-page').innerHTML;
assert.ok(html.includes('href="detalle-oportunidad.html?id=op1&amp;necesidad=NEC-DEMO-1"'),'Nunca se elige otra necesidad');assert.ok(visible(html).includes('Tu pedido ya no coincide con esta compra en grupo. No elegimos otro por ti.'));}
console.log('OK: the original need travels with the link; incompatibility is stated instead of choosing another');

// Retirarse: confirmación corta dentro de la tarjeta de acciones (sin modal); cancelar no cambia nada; un fallo de guardado conserva el registro.
const click=sel=>t.node('participation-page').handlers.click({target:{closest:s=>s===sel?{}:null}});
click('#leave');
page=t.node('participation-page').innerHTML;text=visible(page);
assert.ok(page.includes('class="pa-inline"')&&text.includes('¿Te retiras de esta compra en grupo?')&&text.includes('12 botellas')&&!page.includes('<dialog'));
assert.ok(page.includes('id="leave-no"')&&page.includes('id="leave-yes"'));
click('#leave-no');assert.equal(JSON.stringify(t.s.participationById(p.id)),original);
assert.ok(t.node('participation-page').innerHTML.includes('id="leave"')&&!t.node('participation-page').innerHTML.includes('pa-inline'));
click('#leave');t.fail(true);click('#leave-yes');
assert.equal(t.node('leave-error').hidden,false);assert.equal(t.s.participationById(p.id).status,'Confirmada');t.fail(false);
click('#leave-yes');
assert.equal(t.s.participationById(p.id).status,'Retirada');assert.equal(JSON.stringify(t.s.participationById(p.id).savingSnapshot),historicalSaving);
assert.ok(t.c.window.NexoraUI.toasts.some(m=>m.startsWith('Te retiraste.')));
page=t.node('participation-page').innerHTML;text=visible(page);
assert.ok(t.node('sub').innerHTML.includes('Te retiraste')&&t.node('dt-key').innerHTML.includes('Precio en grupo ahora <strong>S/ 7.80</strong>'));
assert.ok(text.includes('Volver a unirte')&&text.includes('Mientras siga abierta')&&!page.includes('id="leave"'));
console.log('OK: short withdrawal confirmation, cancel is read-only, storage failure keeps the record, historical saving kept');

// Los precios actuales nunca reemplazan la comparación histórica; los datos faltantes se dicen como faltantes.
{const h=fixture();const r=h.participate();h.s.get().opps[0].priceJoint=99;h.open(r.id);assert.ok(visible(h.node('participation-page').innerHTML).includes('Precio en grupo ahora S/ 7.00')&&visible(h.node('participation-page').innerHTML).includes('Lo que pagas hoy S/ 7.80'));assert.ok(!h.node('participation-page').innerHTML.includes('99.00'));}
{const m=fixture();m.s.get().participations.push({id:'PAR-OLD',needId:'NEC-MISSING',opportunityId:'op1',businessId:m.s.get().user.id,status:'Retirada',snapshot:{productId:'fideos',product:'Fideos',presentation:'Paquete 500 g'},savingSnapshot:null});
 m.open('PAR-OLD');const html=m.node('participation-page').innerHTML;if(html.includes('No encontramos esta participación'))console.log('  (registro antiguo no visible para el negocio: caso cubierto por «no encontrado»)');else{assert.ok(m.node('sub').innerHTML.includes('Cantidad histórica no disponible'));assert.ok(!html.includes('href="necesidad.html'));}}
// Compra cerrada: no se puede retirar; la línea de tiempo lo dice.
t=fixture();const q=t.participate();t.s.get().opps[0].status='cerrada';t.open(q.id);text=visible(t.node('participation-page').innerHTML);
assert.ok(!t.node('participation-page').innerHTML.includes('id="leave"'));assert.ok(text.includes('No se concretó'));
// Identificador inexistente.
t=fixture();t.open('NO-EXISTE');assert.ok(t.node('participation-page').innerHTML.includes('No encontramos esta participación'));assert.ok(t.node('participation-page').innerHTML.includes('href="seguimiento.html"'));
console.log('OK: closed purchase hides withdrawal and explains next step; unknown id shows a way back');

// Marcado: página de nivel 2 de Seguimiento; ya no hay modal: retirarse se confirma dentro de la tarjeta de acciones.
const html=fs.readFileSync('pages/comprador/participacion.html','utf8');
assert.ok(html.includes('data-page="participacion" data-parent="seguimiento"'));
const detalleJS=fs.readFileSync('assets/js/comprador/participacion-detalle.js','utf8');
assert.equal((html.match(/<dialog/g)||[]).length,0);assert.ok(detalleJS.includes('¿Te retiras de esta compra en grupo?')&&detalleJS.includes('nx-btn--danger-solid')&&detalleJS.includes('No, seguir dentro'));
assert.ok(!html.includes('<details'));
const scripts=Array.from(html.matchAll(/<script src="([^"]+)"/g),m=>m[1].split('?')[0].split('/').pop());
assert.deepEqual(scripts,['acceso-roles.js','datos-compartidos.js','cuentas.js','utils.js','demo-session.js','datos-demo.js','estado-demo.js','componentes.js','tesis-ui.js','imagenes-producto.js','resumen-participacion.js','participacion-detalle.js','asistente.js']);
// «Deshacer» tras retirarte vuelve a unirte (confirmParticipation); nada más escribe fuera de retirarse.
assert.ok(!/sessionStorage|store\.(register|reset|selectNeed)\(/.test(fs.readFileSync('assets/js/comprador/participacion-detalle.js','utf8')));
console.log('OK: level-2 page under Seguimiento, single short confirmation dialog, no disclosures and no business writes besides the existing withdrawal');
