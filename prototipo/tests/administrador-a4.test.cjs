require('./helpers/utils-compartidas.cjs');
// Admin · Actividad: cada decisión sobre una cuenta queda registrada, sin reconstruir eventos al leer.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {a2,fixture,sessionKey}=require('./helpers/administrador-fixture.cjs');
const key='nexora.demo.estados.v1',memory=fixture();memory[sessionKey]=JSON.stringify({role:'administrador',id:'ADMIN-DEMO-NEXORA'});memory['nexora.proveedor.demo.v1']='PRIVATE-PROVIDER';memory['nexora.demoSession']='comprador';
const datos=n=>({razonSocial:'Empresa '+n+' S.A.C.',ruc:'2010000000'+n,contacto:'Contacto '+n,phone:'9876543'+n+'0',email:'ventas'+n+'@empresa.com',password:'clave1234',zonas:['sa-centro'],terminos:true});
(async()=>{
let p=a2(memory),store=p.c.window.NexoraAdminStore,A=p.c.window.NexoraAccounts;assert.equal(store.activity().total,0);assert.equal(memory[key],undefined);
const a=await A.registrarProveedor(datos(1)),b=await A.registrarProveedor(datos(2)),user=store.view().users[0].key;
let proposal=store.prepare('request',a.id,'Aprobada').proposal;assert.equal(store.activity().total,0,'Revisar no registra nada');
assert.ok(store.confirm(proposal).message);assert.equal(store.activity().total,1);assert.ok(store.confirm(proposal).error);assert.equal(store.activity().total,1,'Un duplicado no suma');
const rej=store.prepare('request',b.id,'Rechazada').proposal;rej.motivo='RUC no verificado';assert.ok(store.confirm(rej).message);
const sus=store.prepare('moderation',user,'Suspendida').proposal;sus.motivo='Datos falsos';assert.ok(store.confirm(sus).message);
assert.ok(store.confirm(store.prepare('moderation',user,'Activa').proposal).message);
assert.equal(store.activity().total,4);assert.deepEqual(Array.from(store.activity().items,e=>e.action).sort(),['aprobacion','reactivacion','rechazo','suspension']);
assert.equal(store.activity('aprobacion','Aprobada').items.length,1);assert.equal(store.activity('aprobacion','Rechazada').items.length,0);assert.equal(store.activity('rechazo','Rechazada').items[0].motivo,'RUC no verificado');assert.equal(store.activity('suspension','').items[0].name,'PRIVATE-BUSINESS');
// Reactivar un proveedor suspendido se cuenta como reactivación.
const s2=store.prepare('request',a.id,'Suspendida').proposal;s2.motivo='Pausa';assert.ok(store.confirm(s2).message);assert.ok(store.confirm(store.prepare('request',a.id,'Aprobada').proposal).message);assert.equal(store.activity('reactivacion','Aprobada').items.length,1);assert.equal(store.activity().total,6);
// Un fallo de escritura no deja evento a medias.
const antes=memory[key],failed=a2(memory,{failWrite:true}).c.window.NexoraAdminStore;assert.ok(failed.confirm(failed.prepare('moderation',user,'Suspendida').proposal).error);assert.equal(memory[key],antes);assert.equal(a2(memory).c.window.NexoraAdminStore.activity().total,6);
// Leer y pintar no agrega ni reescribe eventos; el orden es el más reciente primero.
const t=JSON.parse(memory[key]);t.historial.forEach((e,i)=>{e.at='2026-10-21T'+String(10+i).padStart(2,'0')+':00:00Z';});memory[key]=JSON.stringify(t);const raw=memory[key];
const ordered=store.activity().items;assert.deepEqual(Array.from(ordered,e=>e.position),[5,4,3,2,1,0]);assert.equal(memory[key],raw);
const ui=a2(memory);ui.c.location.href='http://localhost:8000/pages/administrador/actividad.html';vm.runInContext(fs.readFileSync('assets/js/administrador/actividad.js','utf8'),ui.c);const html=ui.nodes['admin-activity-list'].innerHTML;assert.ok(html.includes('Reactivación')&&html.includes('Empresa 1 S.A.C.')&&html.includes('Motivo')||html.includes('Rechazo'));assert.ok(!html.includes('simulad'));assert.equal(ui.writes.length,0);assert.equal(memory[key],raw);
// Sin eventos: se dice sin inventarlos.
const vacio={...memory};delete vacio[key];const empty=a2(vacio);empty.c.location.href=ui.c.location.href;vm.runInContext(fs.readFileSync('assets/js/administrador/actividad.js','utf8'),empty.c);assert.ok(empty.nodes['admin-activity-list'].innerHTML.includes('Todavía no hay actividad'));assert.equal(vacio[key],undefined);
// Historial dañado: error visible y sin cambios.
for(const corrupted of ['{',JSON.stringify({...t,historial:[{...t.historial[0],at:'invalid'}]})]){const mem={...memory,[key]:corrupted},q=a2(mem);assert.ok(q.c.window.NexoraAdminStore.activity().error);assert.equal(mem[key],corrupted);}
const noSession={...memory};delete noSession[sessionKey];assert.ok(a2(noSession).c.window.NexoraAdminStore.activity().error);const guard=a2(noSession);guard.c.location.href=ui.c.location.href;vm.runInContext(fs.readFileSync('assets/js/administrador/actividad.js','utf8'),guard.c);assert.ok(guard.redirects[0].includes('acceso.html'));
console.log('OK A4: eventos de cuentas con motivo, filtros, reactivación, orden, escritura atómica, lectura sin efectos, vacío, historial dañado y página protegida');
})().catch(e=>{console.error(e);process.exit(1);});
