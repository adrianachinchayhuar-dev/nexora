require('./helpers/utils-compartidas.cjs');
const assert=require('node:assert/strict');
const {fixture,supplier,buyerKey}=require('./helpers/proveedor-fixture.cjs');
const memory=fixture(),p=supplier(memory),id='PROV-DEMO-ANDINA',key='nexora.proveedor.demo.v1';
p.c.window.NexoraProviderSession.enter(id);const api=p.c.window.NexoraProviderState.catalog;
const oil={name:'Aceite 1 L',categoryId:'abarrotes',presentation:{label:'Botella 1 L',contentQuantity:1,contentUnit:'L'},saleUnit:'botellas',unitsPerSale:1,normalUnitPrice:7.8,priceTiers:[{minQuantity:50,unitPrice:7},{minQuantity:100,unitPrice:6.4}],minimumQuantity:50,available:true,zoneIds:['sa-centro'],status:'activo'};
const product=api.register(oil).product;
for(const badId of ['',undefined,0,{}]){const before=memory[key];assert.ok(api.edit(badId,oil).error);assert.ok(api.deactivate(badId).error);assert.ok(api.reactivate(badId).error);assert.equal(memory[key],before);}
assert.ok(api.saveDraft(oil,'').error);
for(const [qty,price,reached,tier] of [[1,7.8,false,null],[49,7.8,false,null],[50,7,true,50],[99,7,true,50],[100,6.4,true,100],[101,6.4,true,100],[Number.MAX_SAFE_INTEGER,6.4,true,100]]){
 const before=JSON.stringify(memory);assert.equal(api.priceFor(product.id,qty).unitPrice,price);assert.equal(api.priceFor(product.id,qty).tierMinQuantity,tier);assert.equal(api.meetsMinimum(product.id,qty).reached,reached);assert.equal(JSON.stringify(memory),before);
}
for(const qty of [0,-1,NaN,Infinity,49.5,'50',null,undefined,Number.MAX_SAFE_INTEGER+1]){assert.ok(api.priceFor(product.id,qty).error);assert.ok(api.meetsMinimum(product.id,qty).error);}
for(const priceTiers of [[{minQuantity:100,unitPrice:6.4},{minQuantity:50,unitPrice:7}],[{minQuantity:50,unitPrice:7},{minQuantity:50,unitPrice:6.4}],[{minQuantity:0,unitPrice:7}],[{minQuantity:1.5,unitPrice:7}],[{minQuantity:50,unitPrice:0}],[{minQuantity:50,unitPrice:7.123}],[{minQuantity:50,maxQuantity:99,unitPrice:7}],null,[null]]){
 const before=memory[key];assert.ok(api.edit(product.id,{priceTiers}).error,JSON.stringify(priceTiers));assert.equal(memory[key],before);
}
assert.equal(api.servesZone(product.id,'sa-centro').serves,true);assert.equal(api.servesZone(product.id,'ves-sector1').serves,false);assert.ok(api.servesZone(product.id,'inventada').error);
assert.ok(api.edit(product.id,{zoneIds:['ves-sector1']}).product);assert.equal(api.servesZone(product.id,'sa-centro').serves,false);assert.equal(api.servesZone(product.id,'ves-sector1').serves,true);
// Minimum eligibility and volume price are deliberately independent, not new discount policies.
assert.ok(api.edit(product.id,{minimumQuantity:20,priceTiers:[{minQuantity:50,unitPrice:8}]}).product);assert.equal(api.meetsMinimum(product.id,49).reached,true);assert.equal(api.priceFor(product.id,49).unitPrice,7.8);assert.equal(api.priceFor(product.id,50).unitPrice,8);
assert.ok(api.edit(product.id,{priceTiers:[]}).product);assert.equal(api.priceFor(product.id,100).unitPrice,7.8);
// Kg uses the existing divisible-unit rule; upper bounds are implicitly exclusive.
const rice=api.register({...oil,name:'Arroz',presentation:{label:'Por kilo',contentQuantity:1,contentUnit:'kg'},saleUnit:'kg',minimumQuantity:0.5,priceTiers:[{minQuantity:0.5,unitPrice:7},{minQuantity:1.25,unitPrice:6.4}]}).product;
for(const [qty,price] of [[0.49,7.8],[0.5,7],[1.249,7],[1.25,6.4]])assert.equal(api.priceFor(rice.id,qty).unitPrice,price);assert.equal(api.meetsMinimum(rice.id,0.49).reached,false);assert.equal(api.meetsMinimum(rice.id,0.5).reached,true);
const box=api.register({...oil,saleUnit:'cajas',unitsPerSale:12}).product;assert.equal(api.priceFor(box.id,50).unitPrice,7);assert.equal(api.priceFor(box.id,50).saleUnit,'cajas');assert.equal(api.meetsMinimum(box.id,49).reached,false);assert.ok(api.priceFor(box.id,4.2).error);
const draft=api.saveDraft({}).product;assert.ok(api.priceFor(draft.id,50).error);assert.ok(api.meetsMinimum(draft.id,50).error);
const partial=api.saveDraft({saleUnit:'botellas'}).product;assert.ok(api.priceFor(partial.id,50).error);assert.ok(api.meetsMinimum(partial.id,50).error);
// Arithmetic helpers don't silently activate, publish, promise availability or convert packaging.
api.deactivate(product.id);api.edit(product.id,{available:false});const inactiveBefore=memory[key];assert.equal(api.priceFor(product.id,50).unitPrice,7.8);assert.equal(memory[key],inactiveBefore);
const buyerBefore=memory[buyerKey];const reload=supplier(memory);assert.equal(reload.c.window.NexoraProviderState.catalog.priceFor(box.id,100).unitPrice,6.4);
p.c.window.NexoraProviderSession.enter('PROV-DEMO-LIMA-SUR');for(const fn of [()=>api.priceFor(box.id,100),()=>api.meetsMinimum(box.id,100),()=>api.servesZone(box.id,'sa-centro')])assert.ok(fn().error);assert.equal(memory[buyerKey],buyerBefore);
console.log('OK catálogo cantidades: aceite 49/50/99/100, mínimos independientes, umbrales ordenados/exclusivos, rechazo de ambigüedad, precios sin redondeo implícito, kg fraccionario/cajas enteras sin conversión, zonas, privacidad, persistencia y cálculos sin escrituras');
