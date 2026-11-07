// Catálogo (Fase B · claridad): chips con conteo, tarjetas sin modal y con la compra en grupo del producto
// en una frase, «Mi lista» visible. Solo lectura del estado. Reemplaza catalogo-vista-previa.test.cjs.
require('./helpers/utils-compartidas.cjs');
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
function fixture(search=''){
 const memory={},nodes={},listeners={};
 function node(id){return nodes[id]||={id,value:'',innerHTML:'',textContent:'',hidden:true,handlers:{},addEventListener(k,f){this.handlers[k]=f},focus(){},scrollIntoView(){this.scrolled=true},querySelectorAll(){return []}};}
 const c={window:{dispatchEvent(e){(listeners[e.type]||[]).forEach(f=>f(e))},addEventListener(k,f){(listeners[k]||=[]).push(f)},NexoraDemo:{requireSession:()=>true}},Event:function(type){this.type=type},URLSearchParams,Intl,Date,console,
  location:{pathname:'/pages/comprador/catalogo.html',search},sessionStorage:{getItem:k=>memory[k]||null,setItem(k,v){memory[k]=v},removeItem(k){delete memory[k]}},document:{getElementById:node}};
 vm.createContext(c);for(const f of ['datos-demo','estado-demo','imagenes-producto'])vm.runInContext(fs.readFileSync('assets/js/comprador/'+f+'.js','utf8'),c);
 c.window.NexoraUI={esc:s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),money:n=>'S/ '+n.toFixed(2),ic:()=>'',buyerHref:s=>s,renderIdentity(){},plain:t=>String(t||'').replace(/\s*\(demo\)/gi,'').trim()};
 const s=c.window.NexoraStore,before=JSON.stringify(s.get());vm.runInContext(fs.readFileSync('assets/js/comprador/tesis-ui.js','utf8'),c);vm.runInContext(fs.readFileSync('assets/js/comprador/catalogo.js','utf8'),c);
 return {c,s,node,memory,before,chip:k=>node('cp-categories').handlers.click({target:{closest:()=>({dataset:{category:k}})}})};
}
const visible=html=>html.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ');
let t=fixture(),list=t.node('catalog-list').innerHTML,text=visible(list);
assert.equal(JSON.stringify(t.s.get()),t.before,'Mostrar no escribe en el estado');
assert.equal(t.node('catalog-count').textContent,'6 productos');
assert.ok(t.node('cp-categories').innerHTML.includes('Todos <span class="nx-chip__count">6<')&&t.node('cp-categories').innerHTML.includes('Abarrotes <span class="nx-chip__count">4<'));
assert.equal((list.match(/data-list-product="/g)||[]).length,6,'Una sola acción por tarjeta: Añadir a mi lista');
assert.ok(text.includes('Aceite vegetal')&&text.includes('Compra en grupo · Precio en grupo hoy: S/ 7.80 · Si te unes: S/ 7.00 · Ahorro estimado S/ 9.60')&&text.includes('Tienes un pedido para esto.'));
assert.ok(list.includes('href="detalle-oportunidad.html?id=op1&amp;necesidad=NEC-DEMO-1"')&&text.includes('Ver compra en grupo'));
assert.ok(/Arroz extra .*Aún no hay compra en grupo\./.test(text),'La compra de arroz está cerrada: no se ofrece');
for(const gone of [/Unidad:/,/Ver producto/,/demo/i,/demostrativ/i,/\bop\d\b/,/NEC-/,/compatible/i,/Registrar necesidad/])assert.ok(!gone.test(text),'No se muestra: '+gone);
t.chip('limpieza');assert.equal(t.node('catalog-count').textContent,'1 producto');assert.deepEqual(JSON.parse(t.memory['nexora.comprador.catalogFilters']),{search:'',category:'limpieza'});
t.chip('');t.node('catalog-search').value='zzz';t.node('catalog-search').handlers.input();assert.ok(t.node('catalog-list').innerHTML.includes('No encontramos productos'));
console.log('OK: chips with counts, one action per card, the group purchase in one sentence with its link, persisted filters and empty state');
t=fixture('?producto=inexistente');assert.equal(t.node('catalog-notice').hidden,false);assert.equal(t.node('catalog-notice').textContent,'Ese producto ya no está en el catálogo.');
t=fixture('?producto=vasos');assert.equal(t.node('cp-vasos').scrolled,true);assert.ok(t.node('catalog-list').innerHTML.includes('cp-card--target" data-catalog-card="vasos"'));
const html=fs.readFileSync('pages/comprador/catalogo.html','utf8');
assert.ok(!html.includes('<details')&&!html.includes('<select')&&!html.includes('demo-explanation')&&!html.includes('Consultar Mis necesidades'));
assert.deepEqual([...html.matchAll(/<dialog id="([^"]+)"/g)].map(m=>m[1]),['cp-discard-dialog'],'Solo queda la confirmación corta de «Vaciar lista»');
assert.ok(!/store\.(register|reset|confirmParticipation|selectNeed)\(/.test(fs.readFileSync('assets/js/comprador/catalogo.js','utf8')));
console.log('OK: product link scrolls to its card; missing product notice; page without disclosures, selects or information dialogs');
