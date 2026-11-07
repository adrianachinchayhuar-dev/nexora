require('./helpers/utils-compartidas.cjs'); // fija «hoy» en el 13 de octubre de 2026 para estas pruebas
// Compras en grupo · lista (Fase B · claridad): buscador, chips con conteo y tarjetas con una frase de
// ahorro y una sola acción. Solo lectura del estado.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
function fixture(search=''){
 const memory={},nodes={},listeners={};
 function node(id){return nodes[id]||={id,value:'',innerHTML:'',textContent:'',hidden:true,handlers:{},addEventListener(k,f){this.handlers[k]=f},focus(){},scrollIntoView(){},querySelectorAll(){return []}};}
 const c={window:{dispatchEvent(e){(listeners[e.type]||[]).forEach(f=>f(e))},addEventListener(k,f){(listeners[k]||=[]).push(f)},NexoraDemo:{requireSession:()=>true}},Event:function(type){this.type=type},URLSearchParams,Intl,Date,
  location:{pathname:'/pages/comprador/oportunidades.html',search},sessionStorage:{getItem:k=>memory[k]||null,setItem(k,v){memory[k]=v},removeItem(k){delete memory[k]}},document:{getElementById:node}};
 vm.createContext(c);for(const f of ['datos-demo','estado-demo','imagenes-producto'])vm.runInContext(fs.readFileSync('assets/js/comprador/'+f+'.js','utf8'),c);
 c.window.NexoraUI={esc:s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),money:n=>'S/ '+n.toFixed(2),ic:()=>'',buyerHref:s=>s,renderIdentity(){},plain:t=>String(t||'').replace(/\s*\(demo\)/gi,'').trim()};
 const s=c.window.NexoraStore,before=JSON.stringify(s.get());vm.runInContext(fs.readFileSync('assets/js/comprador/tesis-ui.js','utf8'),c);vm.runInContext(fs.readFileSync('assets/js/comprador/oportunidades.js','utf8'),c);
 return {c,s,node,memory,before,chip:k=>node('op-chips').handlers.click({target:{closest:()=>({dataset:{chip:k}})}})};
}
const visible=html=>html.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ');
let t=fixture();let list=t.node('op-list').innerHTML,text=visible(list);
assert.equal(JSON.stringify(t.s.get()),t.before,'Mostrar no escribe en el estado');
assert.ok(t.node('op-chips').innerHTML.includes('Para ti <span class="nx-chip__count">3<')&&t.node('op-chips').innerHTML.includes('Cerradas <span class="nx-chip__count">1<'));
assert.equal(t.node('op-count').textContent,'4 compras en grupo');
assert.ok(text.includes('Precio en grupo hoy: S/ 7.80 · Si te unes: S/ 7.00 · Ahorro estimado S/ 9.60')&&text.includes('Tu pedido: 12 botellas')&&text.includes('Cierra el 16 oct'));
assert.ok(text.includes('Arroz extra')&&text.includes('Cerró el 11 oct')&&text.includes('Precio en grupo hoy: S/ 4.20 por kilo'));
assert.ok(list.includes('href="detalle-oportunidad.html?id=op1&amp;necesidad=NEC-DEMO-1"'),'La tarjeta lleva el pedido de referencia');
for(const hidden of [/NEC-/,/\bop\d\b/,/escenario/i,/demostrativ/i,/\(demo\)/,/Lote/,/compatible/i])assert.ok(!hidden.test(text),'No se muestra: '+hidden);
t.chip('cerradas');assert.equal(t.node('op-count').textContent,'1 compra en grupo');
t.node('op-search').value='detergente';t.node('op-search').handlers.input();t.chip('todas');assert.equal(t.node('op-count').textContent,'1 compra en grupo');
assert.deepEqual(JSON.parse(t.memory['nexora.comprador.opportunityFilters']),{search:'detergente',chip:'todas'});
t.node('op-search').value='zzz';t.node('op-search').handlers.input();assert.ok(t.node('op-list').innerHTML.includes('No encontramos compras en grupo'));
console.log('OK: chips with counts, one saving sentence per card, reference need in the link, search, empty state and no internal data');
t=fixture('?oportunidad=NO-EXISTE');assert.equal(t.node('op-notice').hidden,false);assert.equal(t.node('op-notice').textContent,'Esa compra en grupo ya no existe.');
const html=fs.readFileSync('pages/comprador/oportunidades.html','utf8');
assert.ok(!html.includes('<details')&&!html.includes('<dialog')&&!html.includes('<select'),'Sin desplegables ni modales');
assert.ok(!/sessionStorage\.removeItem|store\.(register|reset|confirmParticipation|selectNeed)\(/.test(fs.readFileSync('assets/js/comprador/oportunidades.js','utf8')));
console.log('OK: missing purchase notice; page without disclosures, selects or dialogs');
