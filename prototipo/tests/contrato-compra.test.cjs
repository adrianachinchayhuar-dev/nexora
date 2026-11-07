require('./helpers/utils-compartidas.cjs');
// Etapa 3: comprador, proveedor y admin muestran las mismas cantidades, precios, negocios, estados y fechas.
const assert=require('node:assert/strict'),{navegador,comprador,proveedor,administrador}=require('./helpers/pestanas.cjs');
const prov=(p,id='PROV-DEMO-ANDINA')=>p.window.NexoraScenarioRead.read(id).opportunities;
function iguales(a,b,c,id){
 const s=a.store;s.get();const o=s.get().opps.find(x=>x.id===id),r=s.resumenCompra(o),e=s.estadoVisible(o);
 const pid=id==='op1'||id==='op3'?'PROV-DEMO-ANDINA':'PROV-DEMO-LIMA-SUR',v=prov(b,pid).find(x=>x.id===id),g=c.window.NexoraAdminRead.groups().items.find(x=>x.id===id);
 for(const x of [v,g]){assert.equal(x.total,r.total,'cantidad '+id);assert.equal(x.minimo,o.minimo);assert.equal(x.precioActual,r.precio,'precio '+id);assert.equal(x.tramo,r.tramo);assert.equal(x.negocios,s.negociosUnidos(o),'negocios '+id);assert.equal(x.estado.texto,e.texto,'estado '+id);assert.equal(x.entrega,s.entregaTexto(o),'entrega '+id);assert.equal(x.closeDate,o.closeDate);}
 return {o,r,e,v,g};
}
const n=navegador(),a=comprador(n),b=proveedor(n),c=administrador(n),s=a.store;
// Punto de partida (martes 13 oct.): una sola fuente.
let x=iguales(a,b,c,'op1');assert.deepEqual([x.r.total,x.r.precio,x.v.negocios,x.e.texto],[38,7.8,3,'Reuniendo negocios']);assert.equal(x.v.entrega,'entre el 17 y el 18 oct');assert.equal(x.o.closeDate,'2026-10-16');
for(const id of ['op2','op3','op4'])iguales(a,b,c,id);
assert.equal(iguales(a,b,c,'op2').e.texto,'Esperando precio del proveedor');assert.equal(iguales(a,b,c,'op3').e.texto,'Confirmada');assert.equal(iguales(a,b,c,'op4').e.texto,'No se concretó');
// Unirse suma en los 3 y no confirma: alcanza el mínimo y pasa a esperar precio.
const p=s.confirmParticipation(s.prepareParticipation('op1','NEC-DEMO-1').proposal).participation;
x=iguales(a,b,c,'op1');assert.deepEqual([x.r.total,x.r.precio,x.v.negocios,x.e.texto],[50,7,4,'Esperando precio del proveedor']);assert.notEqual(x.e.clave,'confirmada');
// Sin nombres para el proveedor hasta confirmar; el admin ve todos.
assert.ok(x.v.cantidades.every(q=>q.name===null));assert.deepEqual(Array.from(x.v.cantidades,q=>q.qty),[14,12,12,12]);assert.ok(!JSON.stringify(x.v).includes('Bodega Rosita'));
assert.ok(x.g.businesses.some(q=>q.name==='Bodega Rosita'&&q.qty===12));assert.ok(x.g.businesses.some(q=>q.name==='Bodega Don Lucho'));assert.equal(x.g.businesses.length,4);
assert.ok(prov(b).find(o=>o.id==='op3').cantidades.every(q=>q.name),'Con la compra confirmada sí ve nombres');
// Avisos del proveedor sin nombres.
let m=b.window.NexoraScenarioRead.movimientos('PROV-DEMO-ANDINA');assert.equal(m[0].tipo,'union');assert.equal(m[0].qty,12);assert.ok(!JSON.stringify(m).includes('Rosita'));
s.confirmWithdrawal(s.prepareWithdrawal(p.id).proposal);
x=iguales(a,b,c,'op1');assert.deepEqual([x.r.total,x.e.texto],[38,'Reuniendo negocios'],'El retiro devuelve el estado');
m=b.window.NexoraScenarioRead.movimientos('PROV-DEMO-ANDINA');assert.ok(m.some(k=>k.tipo==='retiro'));
// Fechas: coincide solo si llega a tiempo, y lo dice con fechas.
assert.equal(s.finDeSemana(),'2026-10-18');assert.equal(s.finProximaSemana(),'2026-10-25');
const reg=(k,pres,fecha,extra={})=>s.register('x',[{k,qty:4,price:null,presentation:pres,brand:'',...extra}],fecha,'sa-centro').needs[0];
const tarde=reg('detergente','Bolsa 800 g','2026-10-18');assert.equal(tarde.status,'Registrada');
const r=s.noMatchReason(tarde);assert.equal(r.kind,'date');assert.equal(r.text,'Esta compra entrega entre el 21 y el 23 oct y tú lo necesitas para el 18 oct.');
assert.equal(s.pedidoTardio(s.get().opps.find(o=>o.id==='op2')).id,tarde.id);
assert.equal(reg('detergente','Bolsa 800 g','2026-10-25').status,'Con coincidencia','Próxima semana');
assert.equal(reg('aceite','Botella 1 L','2026-10-18').status,'Con coincidencia','Esta semana');
assert.equal(reg('aceite','Botella 1 L','2026-10-17').status,'Registrada','Un día antes de la entrega máxima no llega');
const pronto=reg('detergente','Bolsa 800 g',s.after(s.today(),14),{loAntesPosible:true});assert.equal(pronto.status,'Con coincidencia');assert.equal(s.fechaPedido(pronto),'Lo antes posible');
const ed=s.updateNeed(pronto.id,{qty:4,price:null,date:'2026-10-18',zone:'sa-centro',loAntesPosible:false}).need;assert.equal(ed.status,'Registrada','Quitar la urgencia aplica la fecha');
// Puntualidad simulada.
assert.equal(s.puntualidad('Distribuidora Andina (demo)').texto,'Entregó a tiempo 18 de 19 compras · 95%');
// «Esta semana» encuentra compras cualquier día de la semana.
for(const hoy of ['2026-11-01','2026-11-02','2026-11-03','2026-11-04','2026-11-05','2026-11-06','2026-11-07']){const k=navegador(),t=k.pestana('pages/comprador/dashboard.html').cargar('shared/acceso-roles.js','shared/datos-compartidos.js');t.window.NEXORA_DEMO_TODAY=hoy;t.cargar('comprador/datos-demo.js');t.window.NexoraRoleAccess.enter('comprador','comprador');t.cargar('comprador/estado-demo.js');const q=t.window.NexoraStore;assert.equal(q.today(),hoy);assert.equal(new Date(q.finDeSemana()+'T12:00:00Z').getUTCDay(),0,'Domingo');assert.equal(q.matches('aceite','sa-centro',q.finDeSemana(),'Botella 1 L','botellas').length,1,hoy);assert.equal(q.compatibleNeeds(q.get().opps[0]).length,1,hoy);assert.ok(q.get().opps.every(o=>o.closeDate<o.entregaDesde));}
console.log('OK: mismos números, estados y fechas en los 3 perfiles; entrega a tiempo y avisos sin nombres');
