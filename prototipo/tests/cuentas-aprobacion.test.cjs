require('./helpers/utils-compartidas.cjs');
// Etapa 2: un proveedor se registra «En revisión», el admin decide y el efecto llega a las otras pestañas.
const assert=require('node:assert/strict'),{navegador,comprador,proveedor,administrador}=require('./helpers/pestanas.cjs');
const BASE=['shared/acceso-roles.js','shared/datos-compartidos.js','shared/cuentas.js'];
const datos={razonSocial:'Abastos del Sur S.A.C.',ruc:'20555666777',contacto:'Rosa Quispe',phone:'987654321',email:'Ventas@Abastos.com',password:'clave1234',zonas:['sa-centro'],terminos:true};
const aprobar=(adm,id,motivo)=>{};
(async()=>{
const n=navegador(),adm=administrador(n),store=adm.window.NexoraAdminStore;
const acceso=n.pestana('pages/proveedor/acceso.html').cargar(...BASE,'shared/proveedores-demo.js','comprador/datos-demo.js','proveedor/sesion-demo.js'),A=acceso.window.NexoraAccounts;
// Registro: queda en revisión y el admin lo ve en la campana y en Usuarios, sin recargar.
let avisos=0;adm.window.addEventListener('nexora-demo-change',()=>avisos++);
const reg=await A.registrarProveedor(datos);assert.ok(reg.id);const id=reg.id;
assert.equal(A.estadoDe(id).estado,'en_revision');adm.vaciar();assert.equal(avisos,1,'El admin se entera sin recargar');assert.equal(store.pendientes(),1);assert.equal(store.view().requests[0].status,'En revisión');
assert.equal(store.view().requests[0].datos.email,'ventas@abastos.com');assert.ok(!JSON.stringify(store.view()).includes('hash'),'El admin nunca ve el hash');
// Entrar: con contraseña correcta y solo así; va a la pantalla de estado.
assert.ok((await A.entrarProveedor('ventas@abastos.com','otra')).error);assert.ok((await A.entrarProveedor('nadie@abastos.com','clave1234')).error);
assert.equal((await A.entrarProveedor('VENTAS@abastos.com','clave1234')).id,id);assert.equal((await A.entrarProveedor('proveedor@nexora.example','NexoraProveedor')).id,'PROV-DEMO-ANDINA');assert.ok((await A.entrarProveedor('proveedor@nexora.example','x')).error);
assert.equal(acceso.window.NexoraProviderSession.enter(id),'');assert.ok(acceso.recargas.includes('cuenta.html'),'Entra a la pantalla de estado, no al dashboard');
// En revisión no usa dashboard, catálogo, precios ni mensajes, tampoco por URL directa.
const sesion=acceso.sesion;
for(const pagina of ['dashboard.html','productos-ofertas.html','mensajes.html','oportunidades.html','detalle-oportunidad.html','perfil.html']){const t=n.pestana('pages/proveedor/'+pagina,sesion).cargar(...BASE,'shared/proveedores-demo.js','comprador/datos-demo.js','shared/escenario-lectura.js','proveedor/sesion-demo.js','proveedor/estado-demo.js');assert.equal(t.window.NexoraProviderSession.requireSession(),null,pagina);assert.ok(t.recargas.some(u=>String(u).startsWith('cuenta.html')),pagina+' lleva a la pantalla de estado');}
// La pantalla de estado sí abre y espera.
const cuenta=n.pestana('pages/proveedor/cuenta.html',sesion).cargar(...BASE,'shared/proveedores-demo.js','comprador/datos-demo.js','proveedor/sesion-demo.js');assert.equal(cuenta.window.NexoraProviderSession.requireAccount(),id);assert.equal(cuenta.recargas.length,0);
// El admin aprueba: la pestaña de estado entra al dashboard sin recargar, con el aviso.
let p=store.prepare('request',id,'Aprobada').proposal;assert.ok(store.confirm(p).message);
cuenta.vaciar();assert.ok(cuenta.recargas.some(u=>String(u).startsWith('dashboard.html')),'Pasa al dashboard');assert.equal(sesion['nexora.proveedor.aviso.v1'],'aprobada','Con el aviso «¡Tu cuenta fue aprobada!»');
const dash=proveedor(n,id,sesion);assert.equal(dash.window.NexoraProviderSession.requireSession(),id);assert.equal(dash.window.NexoraProviders.byId(id).name,'Abastos del Sur S.A.C.');assert.equal(dash.window.NexoraProviders.byId(id).initials,'AS');
assert.deepEqual(Array.from(dash.window.NexoraScenarioRead.read(id).opportunities),[],'Aún no tiene compras');
// Suspensión (D4): pierde el acceso en vivo; sus compras sin confirmar no se concretan, las confirmadas se mantienen.
const buyer=comprador(n),s=buyer.store,op=x=>s.get().opps.find(o=>o.id===x);
assert.equal(s.estadoVisible(op('op1')).clave,'reuniendo');
const andina=store.view().users.find(u=>u.id==='PROV-DEMO-ANDINA').key;p=store.prepare('moderation',andina,'Suspendida').proposal;assert.ok(store.confirm(p).error,'Pide motivo');p.motivo='Revisión de calidad';assert.ok(store.confirm(p).message);
buyer.vaciar();assert.equal(s.estadoVisible(op('op1')).clave,'no_se_concreto');assert.equal(s.estadoVisible(op('op3')).clave,'confirmada');assert.ok(s.proveedorSuspendido(op('op1')));assert.ok(s.prepareParticipation('op1','NEC-DEMO-1').error,'No admite uniones');
assert.equal(s.estadoVisible(op('op2')).clave,'esperando_precio','Otro proveedor no se afecta');
const lima=store.view().users.find(u=>u.id==='PROV-DEMO-LIMA-SUR');assert.equal(lima.status,'Aprobada');
assert.ok(store.confirm(store.prepare('moderation',andina,'Aprobada').proposal).message);assert.equal(s.estadoVisible(op('op1')).clave,'reuniendo');
const nuevo=store.prepare('request',id,'Suspendida').proposal;nuevo.motivo='Documentos vencidos';assert.ok(store.confirm(nuevo).message);
dash.vaciar();assert.ok(dash.recargas.some(u=>String(u).startsWith('cuenta.html')),'El dashboard abierto sale sin recargar');assert.equal(dash.window.NexoraProviderSession.requireSession(),null);assert.equal(A.estadoDe(id).motivo,'Documentos vencidos');
assert.ok(store.confirm(store.prepare('request',id,'Aprobada').proposal).message);assert.equal(dash.window.NexoraProviderSession.requireSession(),id);
// Rechazo: con motivo visible para el proveedor.
const reg2=await A.registrarProveedor({...datos,ruc:'20555666778',email:'otro@abastos.com'});const rej=store.prepare('request',reg2.id,'Rechazada').proposal;rej.motivo='RUC no coincide';assert.ok(store.confirm(rej).message);
assert.deepEqual([A.estadoDe(reg2.id).estado,A.estadoDe(reg2.id).motivo],['rechazada','RUC no coincide']);const rt=proveedor(n,reg2.id);assert.equal(rt.window.NexoraProviderSession.requireSession(),null);
// D6: el comprador no se aprueba; el admin puede suspenderlo y al entrar ve el aviso.
const login=n.pestana('pages/login.html').cargar(...BASE,'comprador/datos-demo.js','demo-session.js');assert.equal(login.window.NexoraDemo.enter('demo@nexora.example','NexoraDemo'),'');
const nego=store.view().users.find(u=>u.id==='NEG-DEMO-ROSITA').key;assert.equal(store.view().users.find(u=>u.id==='NEG-DEMO-ROSITA').status,'Activa');
const bl=store.prepare('moderation',nego,'Suspendida').proposal;bl.motivo='Uso indebido';assert.ok(store.confirm(bl).message);
const fresh=n.pestana('pages/login.html').cargar(...BASE,'comprador/datos-demo.js','demo-session.js');const aviso=fresh.window.NexoraDemo.enter('demo@nexora.example','NexoraDemo');assert.match(aviso,/^Tu cuenta está suspendida\./);assert.match(aviso,/Uso indebido/);
const dentro=comprador(n);dentro.cargar('demo-session.js');assert.equal(dentro.window.NexoraDemo.requireSession(),false,'Una sesión abierta también sale');
assert.ok(store.confirm(store.prepare('moderation',nego,'Activa').proposal).message);assert.equal(n.pestana('pages/login.html').cargar(...BASE,'comprador/datos-demo.js','demo-session.js').window.NexoraDemo.enter('demo@nexora.example','NexoraDemo'),'');
// Pendientes de la E3: una compra confirmada no admite uniones y los filtros usan los 4 estados.
assert.ok(/ya está confirmada/.test(s.prepareParticipation('op3','NEC-DEMO-3').error));
const prov=proveedor(n,'PROV-DEMO-ANDINA'),st=prov.window.NexoraProviderState;assert.equal(st.saveFilters('PROV-DEMO-ANDINA',{search:'',status:'confirmada',zone:''}),'');assert.equal(st.filters('PROV-DEMO-ANDINA').status,'confirmada');st.saveFilters('PROV-DEMO-ANDINA',{search:'',status:'abierta',zone:''});assert.equal(st.filters('PROV-DEMO-ANDINA').status,'','Los filtros antiguos se descartan');
const lec=adm.window.NexoraAdminRead;const grupos=lec.groups().items;assert.deepEqual(Array.from(lec.filterOpportunities(grupos,'','confirmada','').map(o=>o.id)),['op3']);assert.deepEqual(Array.from(lec.filterOpportunities(grupos,'','no_se_concreto','').map(o=>o.id)),['op4']);assert.equal(lec.filterOpportunities(grupos,'','esperando_precio','').length,1);
// Sin sesión, la pantalla de estado no abre; un id inventado nunca cuenta como aprobado.
assert.equal(A.estadoDe('PROV-ZZZZZZZZ').estado,'inexistente');assert.equal(n.pestana('pages/proveedor/cuenta.html').cargar(...BASE,'shared/proveedores-demo.js','comprador/datos-demo.js','proveedor/sesion-demo.js').window.NexoraProviderSession.requireAccount(),null);
// Restablecer toda la demo: se van las cuentas registradas.
adm.window.NexoraShared.restablecerTodo();assert.equal(n.comun['nexora.demo.estados.v1'],undefined);assert.equal(A.lista().items.length,0);
console.log('OK: registro en revisión, bloqueo por URL, aprobar/rechazar/suspender en vivo, D4, comprador suspendido, compra confirmada y filtros de 4 estados');
})().catch(e=>{console.error(e);process.exit(1);});
