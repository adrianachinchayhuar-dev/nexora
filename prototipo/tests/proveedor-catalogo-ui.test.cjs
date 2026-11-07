require('./helpers/utils-compartidas.cjs');
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {fixture,supplier,buyerKey}=require('./helpers/proveedor-fixture.cjs');
const mem=fixture(),p=supplier(mem),owner='PROV-DEMO-ANDINA',key='nexora.proveedor.demo.v1';p.c.window.NexoraProviderSession.enter(owner);
const buyer=mem[buyerKey],api=p.c.window.NexoraProviderState.catalog;
p.c.window.NexoraProviderUI.start=render=>render(p.read(owner),owner);p.c.window.NexoraProviderUI.toast=()=>{};
vm.runInContext(fs.readFileSync('assets/js/proveedor/catalogo-ui.js','utf8'),p.c);
const root=p.nodes['provider-content'];
let tiers=[],zones=[];
root.querySelectorAll=selector=>selector==='[data-cat-tier]'?tiers:selector==='[data-cat-zone]:checked'?zones:[];
function value(id,text){p.c.document.getElementById('cat-'+id).value=text;}
function action(a,id){root.onclick({target:{closest(selector){return selector==='[data-cat-action]'?{dataset:{catAction:a,catId:id}}:null;}}});}
const originalAction=action;action=function(a,id){originalAction(a,id);if(a==='edit'){const q=api.detail(id).product;for(const k of ['name','brand','categoryId','saleUnit','unitsPerSale','image'])value(k,q[k]===null?'':String(q[k]));value('package',api.presentationFields(q.presentation).kind);value('contentQuantity',q.presentation?q.presentation.contentQuantity:'');value('contentUnit',q.presentation?q.presentation.contentUnit:'');}};
function next(){root.onsubmit({target:{id:'cat-form'},preventDefault(){}});}
function change(){root.oninput({target:{id:'cat-name'}});}
const confirm=p.c.document.getElementById('cat-confirm');confirm.scrollIntoView=()=>{};confirm.remove=()=>{};
assert.ok(root.innerHTML.includes('Tu catálogo está por comenzar'));assert.ok(root.innerHTML.includes('vista=precios'));assert.equal(api.list().items.length,0);
action('new');assert.ok(root.innerHTML.includes('Paso 1'));assert.equal(p.nodes['cat-continue'].disabled,true);next();assert.ok(root.innerHTML.includes('Paso 1'));assert.equal(api.list().items.length,0);
value('name','Aceite prueba');value('brand','Andina');value('categoryId','abarrotes');value('saleUnit','botellas');value('unitsPerSale','1');value('image','assets/images/producto-aceite.png');value('package','botella');value('contentQuantity','1');value('contentUnit','L');change();assert.equal(p.nodes['cat-continue'].disabled,false);next();assert.ok(root.innerHTML.includes('Paso 2'));next();assert.ok(root.innerHTML.includes('Paso 2'));
action('previous');assert.ok(root.innerHTML.includes('Paso 1'));assert.equal(p.nodes['cat-name'].value,'Aceite prueba');next();value('price','7.80');tiers=[{querySelector:s=>({value:s==='[data-tier-qty]'?'50':'7.00'})},{querySelector:s=>({value:s==='[data-tier-qty]'?'100':'6.40'})}];next();assert.ok(root.innerHTML.includes('Paso 3'));
value('minimum','0');value('available','true');zones=[];next();assert.ok(root.innerHTML.includes('Paso 3'));assert.ok(p.nodes['cat-error-minimum'].textContent);assert.ok(p.nodes['cat-error-zones'].textContent);value('minimum','50');zones=[{value:'sa-centro'}];next();assert.ok(root.innerHTML.includes('Paso 4'));assert.ok(root.innerHTML.includes('No se publica'));next();
const product=api.list().items[0];assert.ok(product);assert.equal(product.status,'activo');assert.equal(product.priceTiers.length,2);assert.equal(product.normalUnitPrice,7.8);assert.ok(root.innerHTML.includes('Precios por volumen'));
action('edit',product.id);value('brand','Marca editada');change();action('draft');assert.equal(api.detail(product.id).product.status,'borrador');assert.equal(api.detail(product.id).product.brand,'Marca editada');
action('deactivate',product.id);const before=mem[key];action('keep');assert.equal(mem[key],before);action('deactivate',product.id);action('confirm');assert.equal(api.detail(product.id).product.status,'inactivo');action('edit',product.id);next();next();next();next();assert.equal(api.detail(product.id).product.status,'inactivo');action('reactivate',product.id);action('confirm');assert.equal(api.detail(product.id).product.status,'activo');
action('edit',product.id);value('name','Cambio descartable');change();action('cancel');assert.equal(api.detail(product.id).product.name,'Aceite prueba');action('keep');assert.ok(root.innerHTML.includes('Paso 1'));action('cancel');action('confirm');assert.ok(root.innerHTML.includes('Aceite prueba'));assert.equal(api.detail(product.id).product.name,'Aceite prueba');
// Drafts don't need complete commercial data; invalid present values are not silently discarded.
action('new');value('name','Pendiente');value('brand','');value('categoryId','');value('saleUnit','');value('unitsPerSale','');value('image','');value('package','');value('contentQuantity','');value('contentUnit','');action('draft');assert.equal(api.list().items.length,2);assert.ok(api.list().items.some(x=>x.name==='Pendiente'&&x.status==='borrador'));
action('edit',product.id);value('name','');action('draft'); // An incomplete draft is permitted.
assert.equal(api.detail(product.id).product.name,'');action('reactivate',product.id);action('confirm');assert.equal(api.detail(product.id).product.status,'borrador');
action('edit',product.id);value('name','Recuperado');next();value('price','abc');tiers=[];action('draft');assert.ok(p.nodes['cat-error-price'].textContent.includes('precio normal'));assert.equal(api.detail(product.id).product.normalUnitPrice,7.8);assert.equal(p.nodes['cat-price'].value,'abc'); // Error returns to step two without losing text.
assert.equal(mem[buyerKey],buyer);assert.ok(!p.writes.includes(buyerKey));
// A stale/foreign route produces an error rather than another provider's product.
const foreign=supplier(mem);foreign.c.location.search='?producto=CAT-AJENO';foreign.c.window.NexoraProviderUI.start=fn=>fn(foreign.read(owner),owner);vm.runInContext(fs.readFileSync('assets/js/proveedor/catalogo-ui.js','utf8'),foreign.c);assert.ok(foreign.nodes['provider-content'].innerHTML.includes('no está disponible'));
console.log('OK catálogo UI: empty state, four steps, register/detail/edit/draft, safe cancel, deactivate/reactivate, incomplete and invalid inputs, foreign URL, legacy link and no buyer writes');
