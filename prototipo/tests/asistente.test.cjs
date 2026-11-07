require('./helpers/utils-compartidas.cjs');
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const memory={}, c={window:{dispatchEvent(){},addEventListener(){}},document:{body:null},sessionStorage:{getItem:k=>memory[k]||null,setItem(k,v){memory[k]=v}},Event:function(){}};
vm.createContext(c);
for(const f of ['datos-demo','estado-demo'])vm.runInContext(fs.readFileSync('assets/js/comprador/'+f+'.js','utf8'),c);
c.window.NexoraUI={};vm.runInContext(fs.readFileSync('assets/js/comprador/flujo-necesidad.js','utf8'),c);
vm.runInContext(fs.readFileSync('assets/js/comprador/asistente.js','utf8'),c);
const api=c.window.NexoraAsistente,store=c.window.NexoraStore,ctx=api.contexto(store,c.window.NexoraFlow);
const before=JSON.stringify(store.get());
assert.ok(api.responder('Registrar un pedido',ctx).texto.includes('productos'));
assert.ok(api.responder('¿CÓMO VAN MIS COMPRAS?',ctx).texto.includes('Todavía'));
assert.ok(api.responder('¿Por qué no tengo compra en grupo?',ctx).texto);
assert.ok(api.responder('¿Cuánto puedo ahorrar?',ctx).texto.includes('estimado'));
for(const concept of ['tramo','mínimo','ahorro referencial','ahorro preliminar','ahorro estimado','No me interesa','los cuatro estados'])assert.ok(api.responder(concept,ctx).texto.length>25);
assert.equal(api.responder('cuentame un chiste',ctx).acciones.length,5);
const result=api.responder('12 botellas de aceite y 8 bolsas de detergente',ctx);
assert.equal(result.tarjetas.length,2);assert.equal(result.pedido.error,'');
assert.equal(JSON.stringify(store.get()),before,'ninguna consulta ni interpretación guarda');
assert.equal(result.pedido.items[0].qty,12);assert.equal(result.pedido.items[0].marca,'');
assert.ok(result.acciones[0].href.startsWith('necesidad-nueva.html#pedido='));
let saved=api.confirmar(result.pedido,ctx);assert.equal(saved.needs.length,2);
assert.ok(api.confirmar(result.pedido,ctx).error,'doble confirmación bloqueada');
for(const text of ['aceite','2 cajas de aceite','12 botellas de aceite y 2 paquetes de azúcar']){
 const r=api.responder(text,ctx),before=JSON.stringify(store.get());assert.ok(r.pedido.error);assert.ok(api.confirmar(r.pedido,ctx).error);assert.equal(JSON.stringify(store.get()),before);
}
assert.equal(api.responder('1,5 kilos de arroz',ctx).pedido.items[0].qty,1.5);
const r=api.responder('3 botellas de aceite',ctx);store.get().scenarioDate='2027-01-01';assert.ok(api.confirmar(r.pedido,ctx).error);store.get().scenarioDate=store.get().baseDate;
// El motivo no se reimplementa: delega exactamente al store.
let calls=0,original=store.noMatchReason;store.noMatchReason=n=>{calls++;return {text:'Motivo compartido'};};
assert.ok(api.responder('por que no tengo compra en grupo',ctx).tarjetas.every(x=>x.texto.includes('Motivo compartido')));assert.equal(calls,store.get().needs.length);store.noMatchReason=original;
// Datos de participación: estado y ahorro vienen de los cálculos compartidos.
const need=store.get().needs.find(n=>n.productId==='aceite'),opp=store.get().opps.find(o=>store.compatible(need,o));
store.selectNeed(opp.id,need.id);let proposal=store.prepareParticipation(opp.id,need.id);assert.ok(!proposal.error);store.confirmParticipation(proposal.proposal);
assert.ok(api.responder('como van mis compras',ctx).tarjetas.length>0);
assert.ok(api.responder('como van mis compras',ctx).tarjetas[0].acciones[0].href.includes('participacion.html?id='));
const pending=api.responder('2 botellas de aceite',ctx).pedido;let register=store.register;store.register=()=>({error:'Almacenamiento bloqueado'});assert.equal(api.confirmar(pending,ctx).error,'Almacenamiento bloqueado');assert.ok(api.confirmar(pending,ctx).error);store.register=register;
// Contrato de integración: dos líneas adicionales, sin reemplazar elementos del comprador.
const source=fs.readFileSync('assets/js/comprador/asistente.js','utf8');
assert.ok(source.includes("setTimeout(resolve, 600)"));assert.ok(source.includes('aria-live="polite"'));assert.ok(source.includes("e.key === 'Escape'"));
assert.ok(!/store\.(persist|reset|confirmParticipation|confirmWithdrawal|selectNeed|updateNeed)\(/.test(source));
console.log('OK Nexi: seis intenciones, intérprete común, ambigüedades, decimales, confirmación única, errores de almacenamiento, motivos, estados y lecturas sin escritura');
