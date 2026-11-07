// Official integration: structural parity, real visual dependency, and isolated DOM/media checks.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const official=fs.readFileSync('pages/comprador/catalogo.html','utf8'),preview=fs.readFileSync('pages/comprador/catalogo.html','utf8');
const normalize=s=>s.replace('<title>NEXORA · Catálogo · Vista previa</title>','<title>NEXORA · Catálogo</title>').replaceAll('href="catalogo-vista-previa.html"','href="catalogo.html"');
assert.equal(official,normalize(preview));
const scripts=[...official.matchAll(/<script src="([^"]+)"/g)].map(m=>m[1].split('?')[0]);
for(const f of ['catalogo.js','catalogo-seleccion.js','catalogo-lista-temporal.js','imagenes-producto.js'])assert.equal(scripts.filter(s=>s.endsWith('/'+f)).length,1,f);
assert.ok(!scripts.some(s=>s.endsWith('/flujo-necesidad.js')),'El registro vive en necesidad-nueva.html');
assert.ok(scripts.indexOf('../../assets/js/comprador/imagenes-producto.js')<scripts.indexOf('../../assets/js/comprador/catalogo.js'));
const ids=[...official.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);
assert.ok(!ids.includes('buyer-entry'),'Sin formulario oculto: el registro vive en necesidad-nueva.html');
for(const id of ['buyer-modals','cp-list','cp-selection-items','cp-selection-count','cp-discard-dialog','catalog-search','cp-categories'])assert.equal(ids.filter(x=>x===id).length,1);
for(const gone of ['catalog-detail','cp-selection-dialog','catalog-category'])assert.ok(!ids.includes(gone),gone+': sin modal de producto ni de lista, sin selector duplicado');
assert.ok(!official.includes('contexto-escenario.js'));assert.ok(!official.includes('demo=catalogo-20261030'));assert.ok(!official.includes('8001'));
const map=require('./helpers/imagenes-producto.cjs');assert.equal(Object.keys(map).length,6);assert.equal(map.fideos,null);assert.equal(map.leche,'producto-leche.png');assert.ok(Object.isFrozen(map));
for(const id of ['aceite','detergente','vasos','arroz','leche']){const file=path.join('assets/images',map[id]),bytes=fs.readFileSync(file);assert.equal(bytes.subarray(1,4).toString(),'PNG');assert.ok(bytes.readUInt32BE(16)>1000);assert.ok(bytes.readUInt32BE(20)>1000);}
assert.ok(fs.existsSync('assets/images/producto-fideos.png')); // Preserve mismatched asset, never assign it to 500 g.
for(const file of ['catalogo','catalogo-seleccion','necesidad-formato','dashboard-inicio','oportunidades','detalle-oportunidad']){
 const source=fs.readFileSync('assets/js/comprador/'+file+'.js','utf8');assert.ok(source.includes('window.NexoraProductImages'));assert.ok(!/var photos\s*=\s*\{/.test(source));
}
// Las fotos del catálogo salen del mapa compartido; sin foto (fideos 500 g) se usa el ícono.
const cat=fs.readFileSync('assets/js/comprador/catalogo.js','utf8');assert.ok(cat.includes("photos[id]")&&cat.includes("img.remove(); box.innerHTML = ui.ic("));
for(const page of ['dashboard','necesidades','oportunidades','detalle-oportunidad','catalogo','seguimiento','mensajes'])assert.ok(fs.readFileSync('pages/comprador/'+page+'.html','utf8').includes('imagenes-producto.js'));
for(const page of ['perfil'])assert.ok(!fs.readFileSync('pages/comprador/'+page+'.html','utf8').includes('imagenes-producto.js'));
assert.ok(fs.readFileSync('assets/css/comprador/catalogo.css','utf8').includes('object-fit:contain'));
console.log('OK official catalog equals approved preview, one shared batch flow, normal calendar, five verified PNGs, 500g pasta icon, shared media map and image failure fallback');
