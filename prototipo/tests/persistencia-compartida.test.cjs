require('./helpers/utils-compartidas.cjs');
// Etapa 1: datos compartidos entre pestañas, transacción con rev, cambio de rol y migración. Todo en memoria.
const assert=require('node:assert/strict'),{navegador,comprador,proveedor,administrador}=require('./helpers/pestanas.cjs');
const COMUN='nexora.demo.compartido.v1',ROSITA='nexora.demo.negocio.NEG-DEMO-ROSITA.v1',VIEJA='nexora.comprador.demo.v1';
const comun=n=>JSON.parse(n.comun[COMUN]);
const unirse=(s,op,nec)=>s.confirmParticipation(s.prepareParticipation(op,nec).proposal);

// Lo compartido llega a los 3 perfiles; lo privado queda aparte.
{const n=navegador(),a=comprador(n),b=proveedor(n),c=administrador(n);
 assert.ok(n.comun[COMUN]&&n.comun[ROSITA],'Separa compartido y privado');assert.equal(comun(n).needs,undefined,'Los pedidos no van en lo compartido');
 assert.equal(a.sesion[VIEJA],undefined,'El escenario ya no vive en la pestaña');
 const antes=b.window.NexoraScenarioRead.read('PROV-DEMO-ANDINA').opportunities.find(o=>o.id==='op1').confirmedParticipations;
 assert.ok(unirse(a.store,'op1','NEC-DEMO-1').participation);
 assert.equal(b.window.NexoraScenarioRead.read('PROV-DEMO-ANDINA').opportunities.find(o=>o.id==='op1').confirmedParticipations,antes+1,'El proveedor lee lo que hizo el comprador');
 assert.equal(c.window.NexoraAdminRead.groups().items.find(o=>o.id==='op1').confirmedParticipations,antes+1,'El admin también');
 assert.equal(a.sesion['nexora.demo.activeRole.v1'].includes('comprador'),true);assert.ok(b.sesion['nexora.demo.activeRole.v1'].includes('proveedor'));assert.ok(c.sesion['nexora.demo.activeRole.v1'].includes('administrador'));assert.equal(n.comun['nexora.demo.activeRole.v1'],undefined,'El rol sigue por pestaña');
 assert.ok(b.window.NexoraProviderState.saveDraft('op1','6.30','Nota').draft);assert.ok(JSON.parse(n.comun['nexora.proveedor.demo.v1']).drafts,'Lo privado del proveedor sobrevive a la pestaña');
}
// Transacción: una pestaña desactualizada no pisa a la otra, ni al escribir a la vez.
{const n=navegador(),a=comprador(n),b=comprador(n);
 const rev=comun(n).rev;assert.ok(unirse(a.store,'op1','NEC-DEMO-1').participation);assert.equal(comun(n).rev,rev+1,'rev sube en cada escritura común');
 // b sigue con su copia vieja en memoria: no vio la participación de a.
 assert.ok(!b.store.get().participations.length,'b está desactualizada');
 assert.ok(unirse(b.store,'op2','NEC-DEMO-2').participation);
 assert.deepEqual(comun(n).participations.map(p=>p.opportunityId).sort(),['op1','op2'],'Sobreviven las dos escrituras');
 // a escribe justo entre la lectura y el guardado de b.
 const guardar=b.window.NexoraShared.guardar;let colado=0;
 a.window.NexoraShared.transaccion(c=>{c.opps.find(o=>o.id==='op3').estado='en_cotizacion';});b.window.NexoraShared.guardar=function(estado){if(!colado++)assert.ok(unirse(a.store,'op3','NEC-DEMO-3').participation);return guardar(estado);};
 assert.ok(b.store.askQuestion('op2','¿Entregan temprano?').question,'El choque se repite sobre lo último');assert.equal(colado,2);
 const fin=comun(n);assert.equal(fin.participations.length,3,'Nada se perdió');assert.equal(fin.opps.find(o=>o.id==='op2').questions.length,1);
 // Un estado viejo guardado directamente se rechaza.
 const viejo=JSON.parse(JSON.stringify(a.store.get()));assert.ok(b.store.askQuestion('op2','¿Otra pregunta?').question);
 assert.equal(a.window.NexoraShared.guardar(viejo),'conflicto');assert.equal(comun(n).participations.length,3);assert.equal(comun(n).opps.find(o=>o.id==='op2').questions.length,2);
 // transaccion() también reintenta y no pierde el cambio ajeno.
 let vez=0;const antes=comun(n).rev;assert.equal(a.window.NexoraShared.transaccion(c=>{if(!vez++)b.window.NexoraShared.transaccion(x=>{x.opps[0].marca='B';});c.opps[1].marca='A';}),true);
 assert.equal(comun(n).opps[0].marca,'B');assert.equal(comun(n).opps[1].marca,'A');assert.equal(comun(n).rev,antes+2);
 const escrito=n.comun[COMUN];assert.ok(a.store.saveMessageDraft('CONV-DEMO-ACEITE','Hola').error===undefined);assert.equal(n.comun[COMUN],escrito,'Un cambio privado no toca lo común');
 assert.equal(JSON.parse(n.comun[ROSITA]).drafts['CONV-DEMO-ACEITE'],'Hola');
}
// Cambiar de rol y de cuenta en la misma pestaña no pierde datos.
{const n=navegador(),a=comprador(n);unirse(a.store,'op1','NEC-DEMO-1');a.store.register('Pedido',[{k:'aceite',qty:2,price:null,presentation:'Botella 1 L'}],'2026-10-18','sa-centro');
 const sesion=a.sesion,cuantos=JSON.parse(n.comun[ROSITA]).needs.length;
 assert.equal(a.window.NexoraRoleAccess.logout('comprador'),'');
 const p=proveedor(n,'PROV-DEMO-ANDINA',sesion);assert.equal(p.window.NexoraRoleAccess.current().role,'proveedor');assert.equal(p.window.NexoraRoleAccess.logout('proveedor'),'');
 const f=administrador(n,sesion);assert.equal(f.window.NexoraRoleAccess.current().role,'administrador');assert.equal(f.window.NexoraRoleAccess.logout('administrador'),'');
 const b=comprador(n,sesion);assert.equal(b.store.get().needs.length,cuantos,'Vuelve con sus pedidos');assert.equal(b.store.get().participations.length,1);
 // Otra cuenta: datos comunes intactos, pedidos propios, sin borrar los de Rosita.
 const luz={};luz['nexora.demo.cuentaActiva.v1']=JSON.stringify({id:'NEG-CUENTA-LUZ',business:'Bodega Luz',name:'Luz'});
 const o=comprador(n,luz);assert.equal(o.store.get().user.business,'Bodega Luz');assert.equal(o.store.get().participations.length,1,'Ve la compra común');assert.equal(o.store.participationCounts('op1').businesses,1);
 assert.equal(o.store.ownConversations().length,0,'No ve conversaciones de otro negocio');
 assert.ok(unirse(o.store,'op1','NEC-DEMO-1').participation);assert.equal(o.store.cantidadTotal(o.store.get().opps[0]),38+12+12,'Las cantidades de ambos negocios se suman');
 assert.equal(JSON.parse(n.comun[ROSITA]).needs.length,cuantos,'Los pedidos de Rosita siguen');assert.equal(b.store.ownConversations().length,1);
}
// Entrar con otra cuenta en la misma pestaña no borra el escenario.
{const n=navegador(),a=comprador(n);unirse(a.store,'op1','NEC-DEMO-1');const antes=n.comun[COMUN],privado=n.comun[ROSITA];
 a.cargar('demo-session.js');const web={subtle:{digest:async()=>new Uint8Array(32).buffer},getRandomValues:x=>x};a.window.crypto=web;
 a.sesion[VIEJA]=JSON.stringify({user:{id:'OTRO'}});// sesión sin migrar de otro negocio: tampoco se borra
 assert.equal(a.window.NexoraDemo.enter('demo@nexora.example','NexoraDemo'),'');assert.ok(a.sesion[VIEJA],'activate() no borra nada en modo compartido');delete a.sesion[VIEJA];
 assert.equal(n.comun[COMUN],antes);assert.equal(n.comun[ROSITA],privado);
 const f=navegador({sinLocal:true}),b=f.pestana('pages/login.html').cargar('shared/acceso-roles.js','shared/datos-compartidos.js','comprador/datos-demo.js','demo-session.js');b.sesion[VIEJA]=JSON.stringify({user:{id:'OTRO'}});
 assert.equal(b.window.NexoraDemo.enter('demo@nexora.example','NexoraDemo'),'');assert.ok(JSON.parse(b.sesion[VIEJA]).user.id==='NEG-DEMO-ROSITA','En modo pestaña se prepara de nuevo');
}
// Migración: una sesión abierta antes de esta etapa pasa a lo compartido sin romperse.
{const previa=navegador({sinLocal:true}),antigua=previa.pestana('pages/comprador/dashboard.html').cargar('comprador/datos-demo.js','comprador/estado-demo.js');
 const s=antigua.window.NexoraStore;unirse(s,'op1','NEC-DEMO-1');s.askQuestion('op1','¿Pregunta vieja?');antigua.window.NexoraStore.register('Pedido viejo',[{k:'aceite',qty:2,price:null,presentation:'Botella 1 L'}],'2026-10-18','sa-centro');
 assert.ok(antigua.sesion[VIEJA],'Sin localStorage sigue el modo pestaña');const raw=antigua.sesion[VIEJA];
 const n=navegador(),a=comprador(n),sesion={[VIEJA]:raw,'nexora.proveedor.demo.v1':'{"version":1,"providers":{},"drafts":{"x":1}}'};
 unirse(a.store,'op2','NEC-DEMO-2');
 const b=n.pestana('pages/comprador/dashboard.html',sesion).cargar('shared/acceso-roles.js','shared/datos-compartidos.js','comprador/datos-demo.js');b.window.NexoraRoleAccess.enter('comprador','comprador');b.cargar('comprador/estado-demo.js');
 assert.equal(sesion[VIEJA],undefined,'La sesión vieja se retira');assert.equal(sesion[VIEJA+'.migrado-etapa1'],raw,'Y queda su copia exacta');
 assert.deepEqual(comun(n).participations.map(p=>p.opportunityId).sort(),['op1','op2'],'Se suma a lo que ya había');assert.equal(comun(n).opps[0].questions.length,2);
 assert.equal(b.window.NexoraStore.get().needs.length,5,'Conserva su pedido');assert.ok(b.window.NexoraStore.get().needs.some(x=>x.product==='Aceite vegetal'&&x.qty===2));
 // Sesión de versión anterior: pasa por la migración del store y luego a lo compartido.
 const v2=JSON.parse(raw);v2.version=2;delete v2.user.id;const ses2={[VIEJA]:JSON.stringify(v2)},n2=navegador(),c=n2.pestana('pages/comprador/dashboard.html',ses2).cargar('shared/datos-compartidos.js','comprador/datos-demo.js','comprador/estado-demo.js');
 assert.equal(c.window.NexoraStore.error(),'');assert.equal(ses2[VIEJA],undefined);assert.equal(JSON.parse(n2.comun[COMUN]).participations.length,1);assert.ok(ses2[VIEJA+'.backup-etapa3']);
 // Sesión ilegible: se aparta intacta y la pestaña usa lo compartido.
 const ses3={[VIEJA]:'{roto'},n3=navegador(),d=n3.pestana('pages/comprador/dashboard.html',ses3).cargar('shared/datos-compartidos.js','comprador/datos-demo.js');d.window.NexoraShared.asegurar();d.cargar('comprador/estado-demo.js');
 assert.equal(ses3[VIEJA+'.no-migrado'],'{roto');assert.equal(ses3[VIEJA],undefined);assert.equal(d.window.NexoraStore.error(),'');assert.equal(d.window.NexoraStore.get().needs.length,4);
 // Datos privados del proveedor en la pestaña: pasan al almacén común al consultarlos.
 const ses4={'nexora.proveedor.demo.v1':'{"version":1,"providers":{},"drafts":{}}'},n4=navegador(),e=proveedor(n4,'PROV-DEMO-ANDINA',ses4);e.window.NexoraProviderState.drafts();assert.equal(ses4['nexora.proveedor.demo.v1'],undefined);assert.ok(n4.comun['nexora.proveedor.demo.v1']);
}
// Si localStorage falla, la pestaña sigue sola.
{for(const opciones of [{sinLocal:true},{localBloqueado:true}]){const n=navegador(opciones),a=comprador(n);assert.equal(a.window.NexoraShared.activo(),false);assert.ok(a.sesion[VIEJA],'El escenario queda en la pestaña');assert.ok(unirse(a.store,'op1','NEC-DEMO-1').participation);assert.equal(JSON.parse(a.sesion[VIEJA]).participations.length,1);
  const b=proveedor(n,'PROV-DEMO-ANDINA',a.sesion);assert.equal(b.window.NexoraScenarioRead.read('PROV-DEMO-ANDINA').opportunities.find(o=>o.id==='op1').confirmedParticipations,1,'Los roles siguen funcionando en esa pestaña');}
 // Falla a mitad de la demo: no se pierde la operación.
 let llena=false;const n=navegador({fallar:()=>llena}),a=comprador(n);llena=true;assert.ok(unirse(a.store,'op1','NEC-DEMO-1').participation,'La operación sigue en la pestaña');assert.equal(a.window.NexoraShared.activo(),false);assert.equal(JSON.parse(a.sesion[VIEJA]).participations.length,1);
}
// Sincronización: la otra pestaña se actualiza sola y no pisa lo que se escribe.
{const n=navegador(),a=comprador(n),b=comprador(n);let repintes=0;b.window.addEventListener('nexora-demo-change',e=>{if(e.detail.reason==='sync')repintes++;});
 unirse(a.store,'op1','NEC-DEMO-1');b.vaciar();assert.equal(repintes,1,'Repinta una vez por cambio');assert.equal(b.store.get().participations.length,1,'Con datos nuevos, sin recargar');assert.equal(a.eventos.filter(x=>x==='sync').length,0,'La pestaña que escribió no se repinta dos veces');
 // Escribiendo en un campo: los datos se actualizan pero la pantalla espera.
 const campo={tagName:'TEXTAREA',type:'textarea',id:'preg',value:'',isConnected:true};b.c.document.activeElement=campo;assert.equal(b.window.NexoraShared.ocupado(),false,'Con el cursor y sin texto no retiene');campo.value='H';assert.equal(b.window.NexoraShared.ocupado(),true);
 unirse(a.store,'op2','NEC-DEMO-2');b.temporizadores.shift()();assert.equal(repintes,1,'No repinta mientras escribes');assert.equal(b.store.get().participations.length,2,'Pero ya conoce lo último');assert.equal(b.temporizadores.length,1,'Reintenta luego');
 // Campo con texto sin foco: sigue esperando; al vaciarlo, repinta.
 b.c.document.activeElement=null;campo.value='';for(const f of b.oyentes['doc:focusin'])f({target:campo});campo.value='Mi pregunta';assert.equal(b.window.NexoraShared.ocupado(),true,'Texto sin enviar');b.temporizadores.shift()();assert.equal(repintes,1);
 campo.value='';assert.equal(b.window.NexoraShared.ocupado(),false);b.vaciar();assert.equal(repintes,2,'Repinta al terminar');
 // Un filtro con texto no detiene el repintado.
 const filtro={tagName:'INPUT',type:'text',id:'op-search',value:'',isConnected:true};for(const f of b.oyentes['doc:focusin'])f({target:filtro});filtro.value='ace';assert.equal(b.window.NexoraShared.ocupado(),false);
 const fuera={tagName:'INPUT',type:'text',id:'x',value:'',isConnected:false};for(const f of b.oyentes['doc:focusin'])f({target:fuera});fuera.value='y';assert.equal(b.window.NexoraShared.ocupado(),false,'Un campo ya retirado de la página no cuenta');
 const p=proveedor(n);let vistos=0;p.window.addEventListener('nexora-demo-change',()=>vistos++);a.store.askQuestion('op1','¿Sigue en pie?');p.vaciar();assert.equal(vistos,1,'El proveedor también se entera');
}
// Restablecer de una cuenta: solo lo suyo.
{const n=navegador(),a=comprador(n),luz={'nexora.demo.cuentaActiva.v1':JSON.stringify({id:'NEG-CUENTA-LUZ',business:'Bodega Luz',name:'Luz'})},b=comprador(n,luz);
 unirse(a.store,'op1','NEC-DEMO-1');unirse(b.store,'op2','NEC-DEMO-2');a.store.sendDemoMessage('CONV-DEMO-ACEITE','Hola');a.store.register('Otro',[{k:'aceite',qty:2,price:null,presentation:'Botella 1 L'}],'2026-10-18','sa-centro');
 assert.equal(a.store.reset(false),true);assert.equal(a.eventos.at(-1),'reset');assert.equal(a.store.get().needs.length,4);assert.deepEqual(comun(n).participations.map(p=>p.businessId),['NEG-CUENTA-LUZ'],'Lo de Luz sigue');assert.equal(a.store.conversationMessages('CONV-DEMO-ACEITE').length,1);
 assert.equal(a.store.reset(true),true);assert.equal(a.store.get().needs.length,0);assert.equal(comun(n).opps.length,4);
}
// La primera época que se crea (otra pestaña prepara la demo) no recarga las pestañas ya abiertas ni borra lo que escriben.
{const n=navegador(),espera=n.pestana('pages/proveedor/registro.html').cargar('shared/acceso-roles.js','shared/datos-compartidos.js');espera.sesion['nexora.proveedor.borrador']='texto';const b=comprador(n);
 assert.ok(n.comun['nexora.demo.epoca.v1']);espera.vaciar();assert.equal(espera.recargas.length,0,'No recarga');assert.equal(espera.sesion['nexora.proveedor.borrador'],'texto','Y conserva lo suyo');assert.equal(espera.sesion['nexora.demo.epocaPestana.v1'],n.comun['nexora.demo.epoca.v1']);
 b.window.NexoraShared.restablecerTodo();assert.equal(espera.recargas.length,1,'Un restablecimiento real sí la recarga');}
// Restablecer demo global: borra todo y todas las pestañas vuelven al acceso.
{const n=navegador(),a=comprador(n),b=proveedor(n),c=administrador(n);unirse(a.store,'op1','NEC-DEMO-1');b.window.NexoraProviderState.saveDraft('op1','6.30','Nota');n.comun['nexora.demo.cuentas.v1']='[]';n.comun['nexora.comprador.menu']='compact';
 const epoca=n.comun['nexora.demo.epoca.v1'];assert.ok(epoca);
 assert.equal(a.window.NexoraShared.restablecerTodo(),'');
 assert.deepEqual(Object.keys(n.comun).sort(),['nexora.comprador.menu','nexora.demo.epoca.v1'],'Solo quedan la preferencia del menú y la época');assert.notEqual(n.comun['nexora.demo.epoca.v1'],epoca);
 assert.equal(Object.keys(a.sesion).filter(k=>k.startsWith('nexora.')).length,0,'Esta pestaña salió');
 for(const t of [b,c]){assert.equal(t.recargas.length,1,'Las demás recargan');assert.equal(t.sesion['nexora.demo.activeRole.v1'],undefined,'Y pierden el rol');}
 // De vuelta: escenario inicial.
 const d=comprador(n);assert.equal(d.store.get().participations.length,0);assert.equal(d.store.get().needs.length,4);assert.ok(n.comun[COMUN]);
 // Una pestaña dormida que despierta en otra demo tampoco conserva su sesión.
 const ses={'nexora.demo.epocaPestana.v1':'vieja','nexora.demo.activeRole.v1':'{}'},e=n.pestana('pages/comprador/dashboard.html',ses).cargar('shared/acceso-roles.js','shared/datos-compartidos.js');assert.equal(ses['nexora.demo.activeRole.v1'],undefined);assert.equal(ses['nexora.demo.epocaPestana.v1'],n.comun['nexora.demo.epoca.v1']);
}
console.log('OK: compartido y privado separados, rev sin pisadas, cambio de rol, migración y modo pestaña');
