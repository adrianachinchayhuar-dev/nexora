require('./helpers/utils-compartidas.cjs');
const assert=require('node:assert/strict');
const {fixture,supplier,buyerKey}=require('./helpers/proveedor-fixture.cjs');
const key='nexora.proveedor.demo.v1',session='nexora.proveedor.demoSession.v1',andina='PROV-DEMO-ANDINA',lima='PROV-DEMO-LIMA-SUR';
const memory=fixture(),buyerBefore=memory[buyerKey],p=supplier(memory),store=p.c.window.NexoraProviderState,api=store.catalog;
assert.ok(api.list().error);assert.ok(api.register({name:'Sin sesión'}).error);
p.c.window.NexoraProviderSession.enter(andina);
assert.equal(store.saveDraft('op1',6.2,'Conservar borrador').draft.price,6.2);
assert.ok(store.saveProfile({name:'Andina',businessType:'Distribución',contact:'',phone:'',email:'',description:''}).value);
assert.equal(store.saveFilters(andina,{search:'aceite',zone:'sa-centro',status:'abierta'}),'');
const before=JSON.parse(memory[key]);before.messages=[{id:'M1',providerId:andina,conversationId:'CONV-DEMO-ACEITE',text:'Conservar',createdAt:new Date().toISOString()}];memory[key]=JSON.stringify(before);
const valid={name:'Aceite vegetal',categoryId:'abarrotes',brand:'',presentation:{label:'Botella 1 L',contentQuantity:1,contentUnit:'L'},saleUnit:'botellas',unitsPerSale:1,image:'assets/images/producto-aceite.png',normalUnitPrice:7.8,priceTiers:[{minQuantity:50,unitPrice:7},{minQuantity:100,unitPrice:6.4}],minimumQuantity:50,available:true,zoneIds:['sa-centro'],status:'activo'};
assert.equal(api.list().items.length,0);assert.equal(JSON.parse(memory[key]).catalog,undefined);
let created=api.register(valid);assert.ok(created.product,created.error);const id=created.product.id,at=created.product.createdAt;assert.equal(created.product.providerId,andina);
let second=api.register(valid);assert.notEqual(id,second.product.id);assert.equal(api.list().items.length,2);
created.product.name='No persistir';assert.equal(api.detail(id).product.name,'Aceite vegetal');
for(const patch of [{name:''},{categoryId:'otra'},{saleUnit:'litros'},{normalUnitPrice:0},{normalUnitPrice:-1},{normalUnitPrice:7.123},{normalUnitPrice:'7.80'},{minimumQuantity:0},{minimumQuantity:1.5},{zoneIds:['inventada']},{zoneIds:['sa-centro','sa-centro']},{available:'sí'},{unitsPerSale:0},{presentation:{label:'Caja',contentQuantity:0,contentUnit:'L'}},{image:'javascript:alert(1)'},{image:'assets/images/../foo.png'},{providerId:lima},{id:'reemplazar'},{createdAt:at},{published:true}]){
 const raw=memory[key];assert.ok(api.edit(id,patch).error,JSON.stringify(patch));assert.equal(memory[key],raw);
}
const edited=api.edit(id,{name:'Aceite Andina',brand:'Marca de prueba'}).product;assert.equal(edited.id,id);assert.equal(edited.createdAt,at);assert.ok(Number.isFinite(Date.parse(edited.updatedAt)));
assert.equal(api.list({search:'ándina',categoryId:'abarrotes',zoneId:'sa-centro',status:'activo',available:true}).items.length,1);
for(const filter of [{categoryId:'limpieza'},{zoneId:'ves-sector1'},{status:'inactivo'},{available:false},{search:'ausente'}])assert.equal(api.list(filter).items.length,0);
assert.equal(api.deactivate(id).product.status,'inactivo');assert.equal(api.detail(id).product.id,id);assert.equal(api.reactivate(id).product.status,'activo');
const draft=api.saveDraft({name:'Incompleto'}).product;assert.ok(draft);assert.equal(draft.status,'borrador');assert.ok(api.reactivate(draft.id).error);assert.equal(api.deactivate(draft.id).product.status,'inactivo');assert.ok(api.reactivate(draft.id).error);
assert.equal(api.saveDraft({name:'En revisión'},id).product.status,'borrador');assert.equal(api.reactivate(id).product.status,'activo');
assert.ok(api.register({}).product);assert.ok(api.register({status:'activo'}).error);assert.ok(api.saveDraft({normalUnitPrice:-1}).error);
const caja=api.register({...valid,saleUnit:'cajas',unitsPerSale:12});assert.equal(caja.product.unitsPerSale,12);assert.equal(caja.product.presentation.contentQuantity,1);assert.equal(caja.product.saleUnit,'cajas');assert.equal(caja.product.normalUnitPrice,7.8); // No conversión implícita a botellas.
const reload=supplier(memory);assert.equal(reload.c.window.NexoraProviderState.catalog.detail(id).product.name,'En revisión');
p.c.window.NexoraProviderSession.enter(lima);assert.equal(api.list().items.length,0);for(const op of [()=>api.edit(id,{name:'Ajeno'}),()=>api.detail(id),()=>api.deactivate(id),()=>api.reactivate(id),()=>api.saveDraft({name:'Ajeno'},id)])assert.ok(op().error);
const own=api.register(valid).product;assert.notEqual(own.id,id);assert.equal(own.providerId,lima);assert.equal(api.list().items.length,1);
p.c.window.NexoraProviderSession.enter(andina);
const raw=memory[key],failed=supplier(memory,{failWrite:true});assert.ok(failed.c.window.NexoraProviderState.catalog.edit(id,{name:'No guardar'}).error);assert.ok(failed.c.window.NexoraProviderState.catalog.register(valid).error);assert.equal(memory[key],raw);
for(const corrupted of ['{',JSON.stringify({...JSON.parse(raw),catalog:{version:9,sequence:1,items:[]}}),JSON.stringify({...JSON.parse(raw),catalog:{version:1,sequence:0,items:[{}]}})]){memory[key]=corrupted;assert.ok(api.list().error);assert.ok(api.register(valid).error);assert.equal(memory[key],corrupted);}memory[key]=raw;
assert.ok(supplier(memory,{failRead:true}).c.window.NexoraProviderState.catalog.list().error);
const after=JSON.parse(memory[key]);for(const field of ['drafts','profiles','providers','messages'])assert.deepEqual(after[field],before[field]);assert.equal(memory[buyerKey],buyerBefore);assert.ok(p.writes.every(k=>k!==buyerKey));assert.equal(typeof api.remove,'undefined');
console.log('OK catálogo privado: registro/edición, borradores incompletos, estado, propiedad, IDs estables, filtros, persistencia, unidad/presentación separadas, conservación de precios/perfil/mensajes, errores atómicos y cero escrituras comprador');
