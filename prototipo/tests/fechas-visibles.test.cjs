require('./helpers/utils-compartidas.cjs');
// Mini etapa «Fechas visibles»: cierre, entrega y llegada a tiempo destacados en los 3 perfiles. Solo presentación.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{navegador,comprador,proveedor,administrador}=require('./helpers/pestanas.cjs');
const n=navegador(),a=comprador(n),F=a.window.NexoraFechas,s=a.store,o=id=>s.get().opps.find(x=>x.id===id),hoy=s.today();
assert.equal(hoy,'2026-10-13');
// Cierre con su urgencia: rojo hoy, naranja ≤ 2 días, normal después.
const con=(dias,extra={})=>({...o('op1'),closeDate:s.after(hoy,dias),...extra});
assert.deepEqual([F.cierre(con(0),hoy).texto,F.cierre(con(0),hoy).nivel],['Cierra hoy','hoy']);
assert.deepEqual([F.cierre(con(1),hoy).texto,F.cierre(con(1),hoy).nivel],['Cierra mañana','pronto']);
assert.deepEqual([F.cierre(con(2),hoy).texto,F.cierre(con(2),hoy).nivel],['Cierra en 2 días','pronto']);
assert.deepEqual([F.cierre(con(3),hoy).texto,F.cierre(con(3),hoy).nivel],['Cierra en 3 días','normal']);
assert.equal(F.cierre(con(-2),hoy).nivel,'pasado');assert.match(F.cierre(con(-2),hoy).texto,/^Cerró el /);
// Rango de entrega y línea de tarjeta.
assert.equal(F.rango({entregaDesde:'2026-11-07',entregaHasta:'2026-11-08'}),'7–8 nov.');assert.equal(F.rango({entregaDesde:'2026-10-30',entregaHasta:'2026-11-02'}),'30 oct.–2 nov.');assert.equal(F.rango({entregaDesde:'2026-11-08',entregaHasta:'2026-11-08'}),'8 nov.');assert.equal(F.rango({}),'por definir');
const manana=con(1,{entregaDesde:'2026-11-07',entregaHasta:'2026-11-08'});
assert.equal(F.linea(manana,hoy,'Llega').texto,'Cierra mañana · Llega 7–8 nov.');assert.equal(F.linea(manana,hoy,'Entregas').texto,'Cierra mañana · Entregas 7–8 nov.');assert.equal(F.linea(manana,hoy,'Entrega').texto,'Cierra mañana · Entrega 7–8 nov.');
assert.match(F.lineaHtml(manana,hoy,'Llega'),/nxf-linea--pronto/);assert.match(F.lineaHtml(con(0),hoy),/nxf-linea--hoy/);assert.match(F.lineaHtml(con(5),hoy),/nxf-linea--normal/);
// Chip de llegada: verde o naranja; nada sin pedido o con «lo antes posible».
const llega={...o('op1'),entregaDesde:'2026-10-17',entregaHasta:'2026-10-18'};
assert.match(F.chipLlegada(llega,{requiredDate:'2026-10-18'}),/nxf-chip--ok[^>]*>✓ Llega a tiempo para tu fecha/);assert.match(F.chipLlegada(llega,{requiredDate:'2026-10-17'}),/nxf-chip--tarde[^>]*>⚠ Llega tarde para tu fecha/);
assert.equal(F.chipLlegada(llega,null),'');assert.equal(F.chipLlegada(llega,{requiredDate:'2026-10-17',loAntesPosible:true}),'');
// Franja Hoy → Cierra → Entrega; el comprador suma su fecha sobre la línea.
const f=F.franja(manana,hoy,{verbo:'Entrega'});for(const t of ['Hoy','Cierra','mañana','Entrega','7–8 nov.'])assert.ok(f.includes(t),t);assert.ok(!f.includes('Lo necesitas para'));assert.equal((f.match(/<li /g)||[]).length,3);
const fc=F.franja(llega,hoy,{need:{requiredDate:'2026-10-18'}});assert.ok(fc.includes('Lo necesitas para')&&fc.includes('llega a tiempo'));assert.equal((fc.match(/<li /g)||[]).length,4);
const ft=F.franja(llega,hoy,{need:{requiredDate:'2026-10-17'}});assert.ok(ft.includes('llega tarde')&&ft.includes('is-tarde'));assert.ok(F.franja(llega,hoy,{need:{loAntesPosible:true}}).includes('Lo antes posible'));
assert.ok(F.franja({...manana,entregaHasta:null},hoy).includes('Cierra'),'Sin entrega sigue mostrando el cierre');
const orden=[...fc.matchAll(/<span class="nxf-t">([^<]+)/g)].map(m=>m[1]);assert.deepEqual(orden,['Hoy','Cierra','Entrega','Lo necesitas para'],'Ordenada por fecha');
// Hora relativa.
const base=Date.parse('2026-10-13T15:00:00Z');assert.deepEqual([F.relativo('2026-10-13T14:59:40Z',base),F.relativo('2026-10-13T14:55:00Z',base),F.relativo('2026-10-13T12:00:00Z',base),F.relativo('2026-10-12T14:00:00Z',base),F.relativo('2026-10-10T15:00:00Z',base),F.relativo('x',base)],['ahora','hace 5 min','hace 3 h','ayer','hace 3 días','']);
// En el comprador el store entrega lo que la franja necesita; la llegada coincide con la regla (no la cambia).
assert.equal(F.llega(o('op1'),{requiredDate:o('op1').entregaHasta}),true);assert.equal(F.llega(o('op2'),{requiredDate:s.finDeSemana()}),false);assert.equal(s.compatible({productId:'detergente',presentation:'Bolsa 800 g',unit:'bolsas',zoneId:'sa-centro',requiredDate:s.finDeSemana(),qty:1,status:'Registrada'},o('op2')),false);
// Proveedor: notificaciones de vendedor, ícono por tipo, hora relativa y grupos.
const prov=proveedor(n),adm=administrador(n);prov.window.NexoraProviderUI={href:p=>'detalle/'+p,icon:x=>x};prov.cargar('proveedor/shell.js');const alertas=()=>prov.window.NexoraProviderShell.alerts('PROV-DEMO-ANDINA');
assert.equal(alertas().filter(x=>x.tipo==='union').length,0);
const p=s.confirmParticipation(s.prepareParticipation('op1','NEC-DEMO-1').proposal).participation;
let l=alertas().find(x=>x.tipo==='union');assert.equal(l.text,'Un negocio se unió a tu venta de aceite vegetal: +12 botellas');assert.equal(l.grupo,'Hoy');assert.equal(l.cuando,'ahora');assert.ok(l.href.includes('id=op1'),'Abre su compra');assert.ok(!JSON.stringify(l).includes('Rosita'),'Sin nombres');
s.confirmWithdrawal(s.prepareWithdrawal(p.id).proposal);l=alertas().find(x=>x.tipo==='retiro');assert.equal(l.text,'Un negocio se retiró de tu venta de aceite vegetal: −12 botellas');assert.notEqual(alertas().find(x=>x.tipo==='union').id,l.id);
prov.window.NexoraShared.transaccion(c=>{c.participations[0].confirmedAt=new Date(Date.now()-2*864e5).toISOString();});l=alertas().find(x=>x.id.startsWith('union:'));assert.equal(l.grupo,'Antes');assert.equal(l.cuando,'hace 2 días');
prov.window.NexoraShared.transaccion(c=>{c.opps.find(x=>x.id==='op1').closeDate=s.after(hoy,1);});l=alertas().find(x=>x.tipo==='cierre');assert.equal(l.text,'Tu venta en grupo de aceite vegetal cierra mañana');assert.equal(l.grupo,'Hoy');assert.ok(l.href.includes('id=op1'));
assert.deepEqual([...new Set(alertas().map(x=>x.tipo))].sort(),['cierre','retiro','union']);
// Admin: «4 negocios: Bodega Rosita y 3 más», con el real primero y sin IDs técnicos.
adm.cargar('administrador/componentes.js');const ui=adm.window.NexoraAdminUI,g=adm.window.NexoraAdminRead.groups().items.find(x=>x.id==='op1');
assert.deepEqual([ui.negocios({negocios:4,nombres:['Bodega Rosita','B','C','D']}).cifra,ui.negocios({negocios:4,nombres:['Bodega Rosita','B','C','D']}).resto],['4 negocios:','Bodega Rosita y 3 más']);assert.equal(ui.negocios({negocios:2,nombres:['A','B']}).resto,'A y B');assert.equal(ui.negocios({negocios:1,nombres:['A']}).resto,'A');assert.equal(ui.negocios({negocios:3,nombres:[]}).resto,'');
s.confirmParticipation(s.prepareParticipation('op1','NEC-DEMO-1').proposal);const g2=adm.window.NexoraAdminRead.groups().items.find(x=>x.id==='op1');assert.equal(g2.nombres[0],'Bodega Rosita');assert.equal(g2.negocios,4);assert.equal(ui.negocios(g2).resto,'Bodega Rosita y 3 más');assert.equal(g2.businesses.filter(b=>b.name).length,4,'El detalle lista nombre y cantidad');assert.ok(g2.businesses.every(b=>b.qty>0));
assert.ok(adm.window.NexoraAdminRead.read().opportunities.every(x=>Array.isArray(x.nombres)&&x.hoy));
for(const f of ['dashboard','agrupaciones','detalle-oportunidad']){const t=fs.readFileSync('assets/js/administrador/'+f+'.js','utf8');for(const prohibido of ['ui.esc(o.id)','ID del proveedor','ID oportunidad','Referencias del registro','(oportunidades)','Referencia\''])assert.ok(!t.includes(prohibido),f+' no muestra '+prohibido);}
for(const f of ['dashboard','detalle-oportunidad'])assert.ok(!fs.readFileSync('assets/js/administrador/'+f+'.js','utf8').includes('o.providerId'),f+' no muestra el proveedor por su ID');
// Cada perfil usa los mismos ayudantes (presentación, sin reglas nuevas).
const lee=r=>fs.readFileSync('assets/js/'+r,'utf8');
for(const r of ['comprador/oportunidades.js','comprador/dashboard-inicio.js','comprador/necesidad.js','comprador/flujo-necesidad.js','comprador/seguimiento-presentacion.js'])assert.ok(lee(r).includes('tx.linea')&&lee(r).includes('tx.chipLlega'),r);
for(const r of ['comprador/detalle-oportunidad.js','comprador/participacion-detalle.js'])assert.ok(lee(r).includes('tx.fechas')&&lee(r).includes('tx.chipLlega'),r);
for(const r of ['proveedor/oportunidades.js','proveedor/dashboard.js','proveedor/detalle-oportunidad.js'])assert.ok(lee(r).includes('NexoraFechas')&&lee(r).includes('Entregas')&&!lee(r).includes('Entrega estimada'),r);
for(const r of ['administrador/agrupaciones.js','administrador/dashboard.js','administrador/detalle-oportunidad.js'])assert.ok(lee(r).includes('NexoraFechas'),r);
console.log('OK: urgencia del cierre, rango de entrega, chip de llegada, franja con fecha del pedido, avisos del proveedor, negocios del admin sin IDs');
