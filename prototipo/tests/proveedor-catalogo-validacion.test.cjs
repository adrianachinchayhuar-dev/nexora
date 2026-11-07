require('./helpers/utils-compartidas.cjs');
const assert=require('node:assert/strict');
const {fixture,supplier,buyerKey}=require('./helpers/proveedor-fixture.cjs');
const memory=fixture(),p=supplier(memory),api=p.c.window.NexoraProviderState.catalog;
p.c.window.NexoraProviderSession.enter('PROV-DEMO-ANDINA');
const buyer=memory[buyerKey],key='nexora.proveedor.demo.v1';
const valid={name:'Aceite vegetal',categoryId:'abarrotes',brand:'',presentation:{label:'Botella 1 L',contentQuantity:1,contentUnit:'L'},saleUnit:'botellas',unitsPerSale:1,image:'assets/images/producto-aceite.png',normalUnitPrice:7.8,priceTiers:[{minQuantity:50,unitPrice:7},{minQuantity:100,unitPrice:6.4}],minimumQuantity:50,available:true,zoneIds:['sa-centro'],status:'activo'};
assert.ok(api.validate(valid).ok);
for(const quantity of [-1,0,'abc',NaN])assert.ok(api.validate({...valid,presentation:{...valid.presentation,contentQuantity:quantity}}).error);
assert.ok(api.validate({...valid,presentation:{label:'Paquete 1.5 unidades',contentQuantity:1.5,contentUnit:'unidades'},saleUnit:'paquetes'}).error);
assert.ok(api.saveDraft({presentation:api.buildPresentation('',1,'L')}).product);
assert.ok(api.validate({...valid,name:'Producto nuevo de prueba',image:null}).ok);
const invalid=[
 [{name:'123'},'name',1],[{name:'<aceite>'},'name',1],[{name:'x'.repeat(121)},'name',1],
 [{presentation:{label:'Botella 1 L',contentQuantity:0,contentUnit:'L'}},'contentQuantity',1],
 [{presentation:{label:'Botella 1 L',contentQuantity:1,contentUnit:'litros'}},'contentUnit',1],
 [{presentation:{label:'Botella 2 L',contentQuantity:1,contentUnit:'L'}},'package',1],
 [{presentation:{label:'1 L',contentQuantity:1,contentUnit:'L'}},'package',1],
 [{saleUnit:'latas'},'saleUnit',1],[{unitsPerSale:12},'unitsPerSale',1],[{unitsPerSale:1.5},'unitsPerSale',1],
 [{image:'assets/images/producto-vasos.png'},'image',1],
 [{normalUnitPrice:0},'price',2],[{normalUnitPrice:NaN},'price',2],
 [{priceTiers:[{minQuantity:50,unitPrice:7},{minQuantity:50,unitPrice:6.4}]},'tier-1-qty',2],
 [{priceTiers:[{minQuantity:100,unitPrice:7},{minQuantity:50,unitPrice:6.4}]},'tier-1-qty',2],
 [{priceTiers:[{minQuantity:50,unitPrice:-1}]},'tier-0-price',2],
 [{minimumQuantity:1.5},'minimum',3],[{zoneIds:['ausente']},'zones',3],[{available:'true'},'available',3]
];
for(const [patch,field,step] of invalid){const input={...valid,...patch},before=memory[key];const result=api.validate(input);assert.ok(result.errors.some(e=>e.field===field&&e.step===step),JSON.stringify(result));assert.ok(api.register(input).error);assert.equal(memory[key],before);}
assert.ok(api.validate({name:'Aceite'},{step:1}).error);assert.ok(api.validate({...valid,normalUnitPrice:null},{step:1}).ok);assert.ok(api.validate({...valid,normalUnitPrice:null},{step:4}).error);
assert.ok(api.validate({name:'Aceite'},{draft:true}).ok);assert.ok(api.saveDraft({name:'Aceite',presentation:{label:'Botella',contentQuantity:null,contentUnit:null}}).product);
assert.ok(api.saveDraft({name:'Aceite',normalUnitPrice:-1}).error);assert.ok(api.saveDraft({priceTiers:[{}]}).error);
const product=api.register(valid).product;for(const [quantity,price]of [[49,7.8],[50,7],[99,7],[100,6.4]]){assert.equal(api.priceFor(product.id,quantity).unitPrice,price);assert.equal(api.meetsMinimum(product.id,quantity).reached,quantity>=50);}
assert.ok(api.edit(product.id,{normalUnitPrice:-1}).error);const draft=api.saveDraft({name:'Pendiente'}).product;assert.ok(api.reactivate(draft.id).error);
const box=api.register({...valid,saleUnit:'cajas',unitsPerSale:12}).product;assert.equal(box.presentation.contentQuantity,1);assert.equal(box.normalUnitPrice,7.8);
assert.equal(api.buildPresentation('botella',1,'L').label,'Botella 1 L');assert.equal(api.presentationFields(box.presentation).kind,'botella');
assert.equal(supplier(memory).c.window.NexoraProviderState.catalog.detail(product.id).product.name,valid.name);
const raw=memory[key],legacy=JSON.parse(raw);legacy.catalog.items.find(x=>x.id===product.id).presentation.contentUnit='litros';memory[key]=JSON.stringify(legacy);assert.ok(api.detail(product.id).product);assert.ok(api.edit(product.id,{brand:'Otra'}).error);assert.equal(JSON.parse(memory[key]).catalog.items.find(x=>x.id===product.id).presentation.contentUnit,'litros');memory[key]=raw;
assert.equal(memory[buyerKey],buyer);assert.ok(!p.writes.includes(buyerKey));
console.log('OK validación por campo/paso, nombres abiertos, unidades, envases, imagen verificable, precios y límites, mínimos, zonas, borradores y cero escrituras comprador');
