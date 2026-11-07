require('./helpers/utils-compartidas.cjs');
// Admin · Usuarios: aprobar, rechazar, suspender y reactivar con efecto real sobre las cuentas.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {a2,fixture,sessionKey}=require('./helpers/administrador-fixture.cjs');
const key='nexora.demo.estados.v1',memory=fixture();memory[sessionKey]=JSON.stringify({role:'administrador',id:'ADMIN-DEMO-NEXORA'});memory['nexora.proveedor.demo.v1']='PRIVATE-PROVIDER';memory['nexora.demoSession']='comprador';const original={...memory};
const datos=(n,extra={})=>({razonSocial:'Empresa '+n+' S.A.C.',ruc:'2010000000'+n,contacto:'Contacto '+n,phone:'9876543'+n+'0',email:'ventas'+n+'@empresa.com',password:'clave1234',zonas:['sa-centro'],terminos:true,...extra});
(async()=>{
let p=a2(memory),store=p.c.window.NexoraAdminStore,A=p.c.window.NexoraAccounts,view=store.view();
assert.equal(view.requests.length,0,'Sin registros reales no hay solicitudes de ejemplo');assert.equal(view.users.length,3);assert.equal(p.writes.length,0);assert.equal(memory[key],undefined);
assert.deepEqual(Array.from(view.users,u=>u.status),['Activa','Aprobada','Aprobada']);assert.equal(view.users[0].name,'PRIVATE-BUSINESS');assert.ok(!JSON.stringify(view).includes('PRIVATE-CONVERSATION'));assert.equal(store.pendientes(),0);
// Registro: queda «En revisión»; los pendientes van primero.
const a=await A.registrarProveedor(datos(1)),b=await A.registrarProveedor(datos(2));assert.ok(a.id&&b.id);assert.match(a.id,/^PROV-[A-F0-9]{8}$/);
assert.ok(!memory[key].includes('clave1234'),'La contraseña no se guarda en texto plano');assert.match(JSON.parse(memory[key]).proveedores[0].hash,/^[0-9a-f]{64}$/);
assert.ok((await A.registrarProveedor(datos(1,{ruc:'20999999999'}))).error,'Correo repetido');assert.ok((await A.registrarProveedor(datos(3,{ruc:'20100000001'}))).error,'RUC repetido');
assert.ok((await A.registrarProveedor(datos(4,{ruc:'123'}))).error,'RUC de 11 dígitos');assert.ok((await A.registrarProveedor(datos(5,{terminos:false}))).error);assert.ok((await A.registrarProveedor(datos(6,{zonas:[]}))).error);assert.ok((await A.registrarProveedor(datos(7,{password:'corta'}))).error);
view=store.view();assert.equal(view.pendientes,2);assert.equal(store.pendientes(),2);assert.ok(view.requests.every(r=>r.status==='En revisión'));assert.equal(A.estadoDe(a.id).estado,'en_revision');
// Revisar es de solo lectura; confirmar aplica.
let prepared=store.prepare('request',a.id,'Aprobada');assert.ok(prepared.proposal);const antes=memory[key];assert.equal(memory[key],antes);
assert.ok(store.confirm(prepared.proposal).message);assert.equal(A.estadoDe(a.id).estado,'aprobada');assert.equal(store.view().requests.find(r=>r.id===a.id).status,'Aprobada');
const snap=memory[key];assert.ok(store.confirm(prepared.proposal).error,'Duplicado');assert.equal(memory[key],snap);assert.ok(store.prepare('request',a.id,'Rechazada').error,'Una cuenta aprobada no se rechaza');
// Rechazar y suspender piden motivo.
let rej=store.prepare('request',b.id,'Rechazada').proposal;assert.ok(rej.needsReason);assert.ok(store.confirm(rej).error,'Sin motivo');rej.motivo='RUC no verificado';assert.ok(store.confirm(rej).message);
assert.deepEqual([A.estadoDe(b.id).estado,A.estadoDe(b.id).motivo],['rechazada','RUC no verificado']);assert.equal(store.prepare('request',b.id,'Aprobada').proposal.nextCode,'aprobada','Se puede reconsiderar');
// Suspender y reactivar un proveedor y un comprador.
let sus=store.prepare('request',a.id,'Suspendida').proposal;sus.motivo='Incumplimiento';assert.ok(store.confirm(sus).message);assert.equal(A.estadoDe(a.id).estado,'suspendida');assert.ok(A.proveedorSuspendido(a.id));
let rea=store.prepare('request',a.id,'Aprobada').proposal;assert.ok(store.confirm(rea).message.includes('reactivado'));assert.equal(A.estadoDe(a.id).estado,'aprobada');
const nego=store.view().users[0].key;sus=store.prepare('moderation',nego,'Suspendida').proposal;sus.motivo='Datos falsos';assert.ok(store.confirm(sus).message);assert.equal(A.estadoDe('NEG-DEMO-ROSITA').estado,'suspendida');assert.ok(store.prepare('moderation',nego,'Rechazada').error);
assert.equal(store.prepare('moderation',nego,'Activa').proposal.type,'negocio');assert.ok(store.confirm(store.prepare('moderation',nego,'Activa').proposal).message);assert.equal(A.estadoDe('NEG-DEMO-ROSITA').estado,'activa');
// D4 derivado: sin confirmar → «No se concretó»; confirmada se mantiene; al reactivar vuelve.
const andina=store.view().users.find(u=>u.id==='PROV-DEMO-ANDINA').key,lectura=()=>a2(memory).c.window.NexoraScenarioRead.read('PROV-DEMO-ANDINA').opportunities;
assert.equal(lectura().find(o=>o.id==='op1').estado.clave,'esperando_precio');
sus=store.prepare('moderation',andina,'Suspendida').proposal;sus.motivo='Revisión';assert.ok(store.confirm(sus).message);
assert.equal(lectura().find(o=>o.id==='op1').estado.clave,'no_se_concreto');assert.equal(lectura().find(o=>o.id==='op3').estado.clave,'confirmada','Lo confirmado se mantiene');
assert.ok(store.confirm(store.prepare('moderation',andina,'Aprobada').proposal).message);assert.equal(lectura().find(o=>o.id==='op1').estado.clave,'esperando_precio');
// Filtros.
let v=store.view();assert.equal(store.filter(v.requests,'proveedor','Rechazada').length,1);assert.equal(store.filter(v.requests,'negocio','').length,0);assert.equal(store.filter(v.users,'proveedor','Aprobada').length,2);
assert.ok(store.prepare('moderation','UNKNOWN','Suspendida').error);assert.ok(store.prepare('request','UNKNOWN','Aprobada').error);assert.ok(store.confirm(null).error);
// Un fallo de escritura es atómico y se puede repetir.
const fail=a2(memory,{failWrite:true}),fs2=fail.c.window.NexoraAdminStore,prop=fs2.prepare('request',b.id,'Aprobada').proposal,before=memory[key];assert.ok(fs2.confirm(prop).error);assert.equal(memory[key],before);assert.equal(A.estadoDe(b.id).estado,'rechazada');assert.ok(store.confirm(store.prepare('request',b.id,'Aprobada').proposal).message);
// Lo privado de otros roles no se toca.
for(const [k,value]of Object.entries(original))assert.equal(memory[k],value,k);assert.ok(p.writes.every(k=>k===key));
// Almacenamiento incompatible y sin sesión.
const broken={...memory,[key]:'{'};const bs=a2(broken).c.window.NexoraAdminStore;assert.ok(bs.view().error);assert.ok(bs.confirm(prop).error);assert.equal(broken[key],'{');
const noSession={...memory};delete noSession[sessionKey];assert.ok(a2(noSession).c.window.NexoraAdminStore.view().error);assert.ok(a2(noSession).c.window.NexoraAdminStore.confirm(prop).error);
const protectedPage=a2(noSession);vm.runInContext(fs.readFileSync('assets/js/administrador/usuarios.js','utf8'),protectedPage.c);assert.ok(protectedPage.redirects[0].includes('acceso.html'));assert.ok(!protectedPage.nodes['admin-content'].innerHTML.includes('Proveedores registrados'));
// Pantalla: pendientes primero y filtros.
const c=await A.registrarProveedor(datos(8));const ui=a2(memory);ui.c.location.href='http://localhost:8000/pages/administrador/usuarios.html';ui.c.document.getElementById('admin-content').querySelectorAll=()=>[];vm.runInContext(fs.readFileSync('assets/js/administrador/usuarios.js','utf8'),ui.c);
assert.ok(ui.nodes['admin-content'].innerHTML.includes('1 proveedor por aprobar'));const html=ui.nodes['admin-requests'].innerHTML;assert.ok(html.indexOf('Empresa 8')<html.indexOf('Empresa 1'),'El pendiente va primero');assert.ok(ui.nodes['admin-existing-users'].innerHTML.includes('PRIVATE-BUSINESS'));
ui.nodes['admin-user-type'].value='proveedor';ui.nodes['admin-user-status'].value='En revisión';ui.handlers['admin-user-status:change']();assert.ok(!ui.nodes['admin-requests'].innerHTML.includes('Empresa 1 S'));ui.nodes['admin-user-status'].value='Activa';ui.handlers['admin-user-status:change']();assert.ok(ui.nodes['admin-requests'].innerHTML.includes('No hay'));ui.handlers['admin-user-clear:click']();assert.ok(ui.nodes['admin-requests'].innerHTML.includes('Empresa 8'));assert.equal(ui.writes.length,0);
console.log('OK A2: registro en revisión, aprobar/rechazar/suspender/reactivar con motivo, efecto en las compras, filtros, atomicidad, almacenamiento incompatible, página protegida y pantalla');
})().catch(e=>{console.error(e);process.exit(1);});
